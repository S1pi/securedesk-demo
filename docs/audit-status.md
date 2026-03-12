# Audit Status

This file tracks the audit feature specifically without changing the broader project progress file.

## Decided

- The Prisma enum currently contains six audit actions, but the planned active audit set is narrower.
- `actorUserId` is the primary actor identity field.
- Actor email is display data derived later from the related user, not stored in audit rows.
- `sourceIp` stays in `meta`, not in a dedicated schema column.
- `sourceIp` is recorded only for abuse/security-oriented events.
- Event metadata should use standardized keys documented in `docs/audit-payload-contract.md`.
- `TICKET_CREATED` stays in the planned audit set as a lightweight history/accountability event.
- `TICKET_REPLY_POSTED` is not part of the planned audit set because `TicketMessage` already stores who replied and when.
- Middleware is intentionally not used yet; route-group protection plus service-layer checks remain the active auth/authz structure.
- Shared request audit context is intentionally small: `endpoint`, `sourceIp`, and `userAgent`.
- Request context must be gathered and normalized at request boundaries, not inside `lib/services/audit.ts`.
- Request audit context stays separate from the persisted audit event contract.

## Implemented

- `AuditEvent` model exists in the Prisma schema.
- Generic audit types exist in `lib/types/audit.ts`.
- `RequestAuditContext` and request normalization helpers exist in `lib/request-audit.ts`.
- Event-by-event payload contract is documented in `docs/audit-payload-contract.md`.
- `logAuditEvent()` exists as a non-blocking write helper.
- `listAuditEvents()` exists as a staff-only read helper.
- The audit log page has a staff-only server-side guard and reads real data from `listAuditEvents()`.
- `AUTH_LOGIN_FAILED` is emitted from `lib/auth.ts` with request-derived audit context.
- `FORBIDDEN_ACTION_ATTEMPT` is emitted for audit-log access denials, staff-only ticket status-change denials, and existing-ticket ownership denials while still returning outward `NOT_FOUND` for hidden customer ownership failures.
- A dedicated audit event detail route exists as a mockup page and is linked from the audit log table.

## Missing

- `TICKET_CREATED` and `TICKET_STATUS_CHANGED` are not wired yet.
- Rate limiting and rate-limit audit emission are not implemented.
- The audit event detail route still reuses list data instead of a dedicated single-event query.

## Next

1. Replace the audit event detail mockup with a dedicated single-event read path.
2. Wire `TICKET_CREATED` and `TICKET_STATUS_CHANGED` in the service layer after successful writes.
3. Reuse the request-audit helper pattern for future rate-limit boundaries.
4. Implement rate limiting and emit `RATE_LIMIT_TRIGGERED` from that boundary.
