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
