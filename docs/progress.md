**This file represents the current implementation state of the SecureDesk project.** (DO NOT DELETE THIS LINE)

# SecureDesk Development Progress

## Current Phase

Phase 4 - Security Hardening

## Completed

- Project setup is in place: Next.js + TypeScript + shadcn/ui, Docker Compose PostgreSQL, Prisma schema/migration, and generated Prisma client.
- Authentication and authorization foundations are working: credentials login/register, JWT session with `user.id` + `user.role`, `(authenticated)` route protection, shared auth types, permission helpers, `requireActor()`, and `AUTH_LOGIN_FAILED` audit logging.
- Core ticket flows are wired to real data: `createTicket`, `listTickets`, `getTicket`, `postReply`, and `changeTicketStatus` back the UI with ownership-aware queries and server actions.
- Audit foundations are in place: real audit log list data, a dedicated single-event read path for audit detail, and `FORBIDDEN_ACTION_ATTEMPT` logging for audit-log access, ticket ownership denials, and staff-only status changes.
- In-memory rate limiting is implemented for login, registration, ticket creation, ticket replies, and ticket status changes, and blocked requests emit `RATE_LIMIT_TRIGGERED` audit events.

## In Progress

- Planned ticket business-event auditing is still unfinished: `TICKET_CREATED` and `TICKET_STATUS_CHANGED` are not emitted yet.
- Security-focused Vitest coverage is still unfinished: ownership, validation, status-change, and rate-limit tests are not implemented yet.

## Next Steps

- Wire the remaining planned ticket audit events in the service layer after successful writes.
- Add focused Vitest coverage for ownership rules, validation failures, staff-only status changes, and rate limits.
- Optional hardening: cap login limiter identifier length and prune stale in-memory limiter buckets.

**Note: Remember to remind user to update everything to git after each session!**
