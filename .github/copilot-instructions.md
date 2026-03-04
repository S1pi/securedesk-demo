# Copilot Project Instructions

These instructions guide AI coding assistants when generating code for this repository.

PROJECT: SecureDesk (Support Ticket System with Layered Security)

Goal:
Build a small but complete support ticket web app where the main focus is demonstrating layered web security:

- request-level protections (rate limiting, input validation)
- authentication (NextAuth)
- authorization (RBAC)
- data access enforcement (users can only access their own tickets)
- safe error handling
- security-critical logging/audit events
- tests that prove the protections work

Scope (MVP):
Roles:

- CUSTOMER
- STAFF

Core features:

- Customers can create tickets (title + initial message)
- Customers can list only their own tickets
- Customers can view a ticket thread and post replies to their own tickets
- Staff can list all tickets
- Staff can view any ticket thread and reply
- Staff can close/reopen tickets (status OPEN/CLOSED)
- Staff can view an Audit Log page (security-critical events only)

Non-goals (explicitly NOT in MVP):

- File uploads / attachments
- Realtime features (websockets)
- Email notifications
- Assignment, tags, priority, SLA, advanced search

Tech stack (preferred):

- Next.js (App Router) + TypeScript
- shadcn/ui for UI components
- NextAuth for authentication (sessions)
- Prisma ORM
- Database: PostgreSQL (local via Docker Compose)
- ORM: Prisma ORM (v6)
- Use Prisma Client for all DB access, no raw SQL unless absolutely necessary.
- Zod for request validation
- Vitest for tests

Architecture rules:

- Keep route handlers thin: parse+validate input, require auth, call service layer, return response.
- Put authorization and business rules in a service layer (e.g. lib/services/\*).
- Centralize permissions in a single module (e.g. lib/security/permissions.ts).
- Never rely on the frontend for access control. UI may hide buttons, but server enforces rules.
- Enforce ownership in backend queries or in service-level checks.
- Use consistent API error shapes and safe messages. Do not leak internals.

Security layers to implement:

1. Authentication:

- NextAuth session must include userId and role (CUSTOMER/STAFF).
- Always check session in protected endpoints.

2. Authorization (RBAC):

- CUSTOMER: can read/reply only to their own tickets.
- STAFF: can read/reply to any ticket.
- STAFF only: can change ticket status and read audit events.

3. Data access layer:

- For CUSTOMER, ticket access must be restricted to createdByUserId = session.user.id.
- For staff, allow access to any ticket.

4. Input validation:

- Use Zod schemas per endpoint.
- Example constraints:
  - title: 1..80 chars
  - message content: 1..2000 chars
  - status: enum OPEN|CLOSED

5. Rate limiting:

- Implement rate limiting for:
  - ticket creation
  - posting messages
  - (if feasible) authentication attempts
- It can be in-memory (document limitation) or Redis/Upstash.

6. Error handling:

- Use 401 for unauthenticated.
- Use 403 for authenticated but forbidden OR 404 when hiding resource existence for ownership violations (prefer 404 for CUSTOMER accessing others’ tickets).
- Return consistent JSON error: { error: { code: string, message: string } }.

7. Audit logging (security-critical only):
   Audit actions to store (no sensitive payloads):

- AUTH_LOGIN_FAILED
- TICKET_CREATED
- TICKET_REPLY_POSTED
- TICKET_STATUS_CHANGED (store who changed it; also store closedByUserId and closedAt on the ticket)
- FORBIDDEN_ACTION_ATTEMPT
- RATE_LIMIT_TRIGGERED
  Audit meta should store minimal info (ticketId, from/to status, endpoint name), never message contents.

Database models (high-level):

- User: id, email, role
- Ticket: id, title, status, createdByUserId, closedAt?, closedByUserId?, createdAt, updatedAt
- TicketMessage: id, ticketId, authorUserId, content, createdAt
- AuditEvent: id, actorUserId?, action, targetType, targetId?, meta(JSON), createdAt

Implementation order guidance:

1. Setup project + shadcn + Prisma + DB
2. Implement NextAuth with role in session
3. Create Prisma models + migrations
4. Build permission module (canReadTicket, canReplyTicket, canChangeStatus, canReadAudit)
5. Build ticket service functions + audit service
6. Build API routes with Zod validation and security checks
7. Build minimal UI pages
8. Add rate limiting
9. Write Vitest tests focusing on security guarantees

Testing expectations (must-have):

- CUSTOMER cannot access another customer’s ticket (404 or 403 as decided).
- STAFF can access any ticket.
- CUSTOMER cannot change ticket status.
- Rate-limited endpoint returns 429 after threshold.
- Validation errors return 400.

Coding style:

- Prefer explicit TypeScript types, avoid any.
- Keep functions small and named by intent.
- Prefer readable, consistent naming: ticketId, userId, createdByUserId.
- No “magic strings” scattered: use enums/constants for actions/status/roles.
<!-- - Centralize permissions logic in a single module. -->
- Use shadcn/ui components for consistent styling.
