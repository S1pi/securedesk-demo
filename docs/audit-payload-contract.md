# Audit Payload Contract

This document is the implementation guide for SecureDesk audit payloads.

Source of truth for audit action values currently available in the schema:

- `prisma/schema.prisma` `AuditAction` enum

Schema-defined audit actions:

- `AUTH_LOGIN_FAILED`
- `TICKET_CREATED`
- `TICKET_REPLY_POSTED`
- `TICKET_STATUS_CHANGED`
- `FORBIDDEN_ACTION_ATTEMPT`
- `RATE_LIMIT_TRIGGERED`

Planned active audit set:

- `AUTH_LOGIN_FAILED`
- `TICKET_CREATED`
- `TICKET_STATUS_CHANGED`
- `FORBIDDEN_ACTION_ATTEMPT`
- `RATE_LIMIT_TRIGGERED`

Not planned for audit emission:

- `TICKET_REPLY_POSTED`
  - reason: reply authorship and timestamp already exist in `TicketMessage`, so duplicating normal reply activity in the audit log is not currently worth the noise

## Decisions

- `actorUserId` is the primary identity field.
- Do not persist actor email in `AuditEvent`; derive it later from the related user when available.
- Do not add a top-level IP column to `AuditEvent` for now.
- Store `sourceIp` in `meta` only for abuse/security-oriented events.
- Do not store `sourceIp` by default for normal authenticated business events.
- If there is no authenticated user yet, `actorUserId` must be `null`.
- Meta fields should use a consistent shared vocabulary across events.
- Never store passwords, tokens, session secrets, or ticket message contents in audit metadata.
- Do not add middleware yet; current route-group protection plus service-layer authorization is sufficient for the current app.
- Gather request-derived audit data only at request boundaries where the request is available.
- Keep request-derived audit data separate from persisted event payload contracts.
- Prefer auditing suspicious activity, denied actions, and meaningful state transitions over routine activity already recorded in domain tables.
- Demo rate limiting uses in-memory fixed-window buckets; a distributed store is deferred until multi-instance deployment is needed.

## Request Audit Context

Shared request audit context is intentionally small and only exists for events that need request-derived metadata.

Current shape:

- `endpoint`
- `sourceIp`
- `userAgent`

Code location:

- `lib/request-audit.ts`

Rules:

- Do not pass raw framework request objects into deep services.
- Do not attach request audit context to normal business events unless the event truly needs it.
- Boundary code gathers and normalizes this context once.
- Auth or service logic decides whether to emit an audit event.
- `lib/services/audit.ts` persists only the final normalized event.

## Standardized Meta Keys

Use these keys consistently when relevant:

- `endpoint`: route handler or action entry point associated with the event
- `reason`: short machine-readable or human-readable explanation for why the event was logged
- `sourceIp`: raw client IP for abuse/security events only
- `userAgent`: optional request user-agent string when useful for investigations
- `attemptedIdentifier`: login identifier used before authentication, typically email
- `ticketId`: related ticket id when the audited target is not itself the ticket row
- `fromStatus`: previous ticket status for status changes
- `toStatus`: next ticket status for status changes
- `limiterScope`: logical rate-limit bucket
- Current implemented scopes: `login_ip`, `login_ip_identifier`, `register_ip`, `ticket_creation`, `ticket_reply`, `ticket_status_change`
- `limiterKey`: the concrete rate-limit key that tripped the limiter

## Status

### Decided

- The Prisma enum currently exposes six action values, but the planned emitted audit set is smaller.
- Authenticated actions should rely on `actorUserId` rather than duplicated actor email.
- Abuse/security events may store `sourceIp` in `meta`.
- Normal authenticated business events should avoid storing `sourceIp` by default.
- Event-specific payload shapes are documented here and mirrored in `lib/types/audit.ts` as a lightweight contract.
- Middleware is intentionally not part of the current audit design.
- Shared request audit context is limited to `endpoint`, `sourceIp`, and `userAgent`.
- Request audit context belongs at request boundaries, not inside the audit service.
- `TICKET_CREATED` stays as a lightweight history/accountability audit event.
- `TICKET_REPLY_POSTED` is intentionally not planned for emission because the reply table already records the needed history.

### Already Implemented

- `AuditEvent` table exists with `actorUserId`, `action`, `targetType`, `targetId`, `meta`, and `createdAt`.
- `lib/services/audit.ts` contains a non-blocking `logAuditEvent()` helper.
- `lib/services/audit.ts` contains staff-guarded `listAuditEvents()` and `getAuditEventById()` helpers.
- `lib/request-audit.ts` normalizes request-derived audit context for auth-boundary use.
- The audit log page route has a server-side staff check and reads real rows from `listAuditEvents()`.
- Shared generic audit types already exist in `lib/types/audit.ts`.
- `AUTH_LOGIN_FAILED` is wired in `lib/auth.ts` for both unknown-user and invalid-password cases.
- `FORBIDDEN_ACTION_ATTEMPT` is wired for audit-log access denials, ticket ownership denials on existing tickets, and staff-only status-change denials.
- The audit event detail route now loads a single event by id instead of scanning the list view model.
- Rate limiting is implemented in `lib/security/rate-limit.ts` and `lib/security/rate-limit-boundary.ts`, and `RATE_LIMIT_TRIGGERED` is emitted for login, registration, ticket creation, ticket replies, and ticket status changes.

### Still Missing

- `TICKET_CREATED` and `TICKET_STATUS_CHANGED` are not yet logging their events.
- Focused automated tests for audit and rate-limit behavior are not implemented yet.

### What Should Be Done Next

1. Wire the remaining planned ticket business events from the ticket service after successful writes.
2. Add focused tests for audit reads, forbidden attempts, and rate-limit emission.
3. Optionally harden the in-memory limiter by capping login identifier key length and pruning stale buckets.

## Event Emission Map

### AUTH_LOGIN_FAILED

- Emit from: auth boundary in `lib/auth.ts`
- Needs request audit context: yes
- Meta fields:
  - required: `endpoint`, `attemptedIdentifier`, `reason`, `sourceIp`
  - optional: `userAgent`
- `actorUserId`: expected to be `null`
- Implementation notes: wired in `lib/auth.ts`; emit immediately on unknown-user and invalid-password paths; do not log password material

### TICKET_CREATED

- Emit from: `lib/services/ticket.ts` after the ticket create succeeds
- Needs request audit context: no
- Top-level fields:
  - required: `actorUserId`, `action`, `targetType`, `targetId`
  - optional: `meta`
- Implementation notes: planned; use `targetType = "Ticket"` and `targetId = ticket.id`

### TICKET_STATUS_CHANGED

- Emit from: `lib/services/ticket.ts` after the status update succeeds
- Needs request audit context: no
- Top-level fields:
  - required: `actorUserId`, `action`, `targetType`, `targetId`
  - optional: `meta`
- Meta fields:
  - required: `fromStatus`, `toStatus`
  - optional: `endpoint`
- Implementation notes: planned; capture the previous status before updating so `fromStatus` is accurate

### FORBIDDEN_ACTION_ATTEMPT

- Emit from: the cleanest point that has both the authorization failure reason and normalized request audit context
- Needs request audit context: yes
- Meta fields:
  - required: `endpoint`, `reason`, `sourceIp`
  - optional: `userAgent`, `ticketId`
- `actorUserId`: optional
- Implementation notes: wired for audit-log access denials, ticket ownership denials, and staff-only status changes; hidden ownership violations still return outward `NOT_FOUND`

### RATE_LIMIT_TRIGGERED

- Emit from: `lib/security/rate-limit-boundary.ts`
- Needs request audit context: yes
- Meta fields:
  - required: `endpoint`, `limiterScope`, `limiterKey`, `reason`, `sourceIp`
  - optional: `userAgent`
- `actorUserId`: optional
- Implementation notes: wired for login, registration, ticket creation, ticket replies, and ticket status changes; emit when the limiter rejects the request; the current implementation emits once per blocked bucket window to avoid flooding the audit log

## Recommendations For Future Events

These are not current events and should not be added until there is a real product need:

- `AUTH_LOGIN_SUCCEEDED` if you later need successful auth telemetry
- `AUTH_LOGOUT` if session lifecycle auditing becomes important
- `AUTHZ_ROLE_CHANGE` if user administration is introduced
- `PASSWORD_RESET_REQUESTED` if password recovery is added
