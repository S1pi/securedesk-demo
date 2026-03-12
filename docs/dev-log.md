# SecureDesk Development Log

## 2026-03-04

- Bootstrapped Next.js + TypeScript + Tailwind + shadcn/ui project
- Configured Docker Compose PostgreSQL and Prisma schema (User, Ticket, TicketMessage, AuditEvent + enums)
- Applied initial migration; set up `lib/db.ts` Prisma singleton with `@prisma/adapter-pg`
- Built boilerplate UI pages for all core routes (`/login`, `/dashboard`, `/tickets`, `/tickets/new`, `/tickets/[id]`, `/admin/audit`) with mock data
- Added shared nav component, authenticated route group layout, and dark mode

## 2026-03-05

- Implemented `lib/auth.ts` — NextAuth credentials provider with bcrypt password verification, JWT session strategy, `userId` + `role` in session
- Mounted NextAuth HTTP handler at `app/api/auth/[...nextauth]/route.ts`
- Installed `bcryptjs` + type definitions
- Decided on registration strategy: own `POST /api/auth/register` endpoint (NextAuth intentionally does not handle sign-up)

## 2026-03-06

- Adopted Server Actions over Route Handlers for internal UI mutations (documented reasoning in `docs/security-architecture.md`)
- Implemented registration: Zod schema (`lib/validation/schemas.ts`), auth service (`lib/services/auth.ts`), Server Action (`lib/actions/auth.ts`), UI page (`app/register/page.tsx`)
- Split login page into Server Component (server-side session redirect) + Client Component (`LoginForm.tsx`) — wired to NextAuth `signIn()`
- Created `docs/security-architecture.md` covering all 11 security layers with OWASP references
- Added database session strategy documentation to `docs/further-developement.md`

## 2026-03-09

- Implemented permission helpers and added `requireActor()` to standardize authenticated actor loading in server-rendered pages
- Built ticket service foundation for create, list, and get flows with Prisma ownership filtering for customer ticket access
- Wired ticket creation from the UI through `createTicketAction` and replaced the tickets list page mock data with real server-loaded data
- Reworked `app/(authenticated)/tickets/[id]/page.tsx` into a server-rendered detail page that loads the real ticket thread and renders the initial message plus replies
- Added reply-form scaffolding and permission-based status-toggle visibility in preparation for reply posting and ticket close/reopen flows

## 2026-03-10

- Finished the ticket interaction flow end-to-end: reply posting, staff ticket close/reopen, and closed-ticket UI handling are now wired through Server Actions and the ticket service
- Replaced dashboard mock data with real authenticated actor data and live ticket statistics from `getTicketStats()`
- Split the authenticated nav into a server wrapper plus client component, passed real session data into it, and improved active-link matching for nested routes
- Replaced hardcoded role unions with Prisma `Role` in auth-facing types and introduced shared auth types in `lib/types/auth.ts`
- Added shared ticket contracts in `lib/types/tickets.ts` and documented the future cleanup path for using Prisma enum values as runtime status constants

## 2026-03-11

- Added audit service foundations, shared audit types, and request-audit context helpers, then documented the audit payload contract and current audit status
- Wired `AUTH_LOGIN_FAILED` plus initial `FORBIDDEN_ACTION_ATTEMPT` logging for audit-log access, ticket ownership denials, and staff-only status changes
- Replaced the audit log page mock rows with real `listAuditEvents()` data and tightened the table into a compact scan-friendly layout
- Added a mock audit event detail route under `app/(authenticated)/admin/audit/[id]/page.tsx` with staff-only protection and structured metadata sections
- Refined project docs to narrow the planned audit set, keeping `TICKET_CREATED` but treating reply posting as domain history rather than audit history
