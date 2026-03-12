**This file represents the current implementation state of the SecureDesk project.** (DO NOT DELETE THIS LINE)

# SecureDesk Development Progress

## Current Phase

Phase 3-4 – Ticket System Integration

## Completed

- Project setup is in place: Next.js + TypeScript + shadcn/ui, Docker Compose PostgreSQL, Prisma schema/migration, and generated Prisma client
- Authentication foundation is working: credentials login/register, JWT session with `user.id` + `user.role`, `(authenticated)` route protection, Prisma-backed shared auth types, and `AUTH_LOGIN_FAILED` audit logging from `lib/auth.ts`
- Security foundations are present: centralized Zod schemas, `ServiceError`, permission helpers in `lib/security/permissions.ts`, and `requireActor()`
- Core ticket flows are wired to real data: `createTicket`, `listTickets`, `getTicket`, `postReply`, and `changeTicketStatus` back the tickets UI with ownership-aware queries and server actions
- Audit foundations are in place: `lib/services/audit.ts`, `lib/request-audit.ts`, `lib/types/audit.ts`, audit contract/status docs, staff-only audit page access control, real `listAuditEvents()` data on the audit log page, and initial `FORBIDDEN_ACTION_ATTEMPT` logging for audit-log access, ticket ownership denials, and staff-only status changes

## In Progress

- Audit feature is still unfinished: the audit log now reads real events, but the event detail page is still a mock layout backed by list data rather than a dedicated single-event query
- Planned ticket business-event auditing is still unfinished: `TICKET_CREATED` and `TICKET_STATUS_CHANGED` are not emitted yet
- Reply posting is now treated as domain history rather than a planned audit event because `TicketMessage` already records author and timestamp
- Security hardening is still unfinished: rate limiting and real Vitest security coverage are not implemented yet

## Next Steps

- Replace the audit event detail mockup with a dedicated single-event read path
- Wire the remaining planned ticket audit events in the service layer after successful writes
- Add security-focused Vitest coverage for ownership rules, staff-only status changes, and validation failures
- Implement rate limiting for login and ticket mutations, then cover it in tests

**Note: Remember to remind user to update everything to git after each session!**
