# SecureDesk — Further Development Ideas

This file tracks feature ideas and improvements that are intentionally left out of the MVP.
Items here are candidates for future iterations, not current work.

---

## How to use this file

- Add an entry under the relevant category (or create a new one).
- Include a short description and, if helpful, example use cases or permissions.
- Do **not** remove entries unless the feature has been shipped or permanently rejected.

---

## Feature Ideas

### 1. ADMIN Role

A dedicated `ADMIN` role sitting above `STAFF`, responsible for platform administration.

**Proposed permissions:**

- Create and manage staff user accounts
- Change user roles (`CUSTOMER` → `STAFF`, `STAFF` → `ADMIN`, etc.)
- Full, unfiltered access to all audit log events (staff would be limited to a subset, e.g. ticket-related events only)
- Deactivate or delete user accounts
- View a user management dashboard (list users, filter by role, see activity)

**Notes:**

- Would require a new `ADMIN` value in the `Role` enum and corresponding permission checks in `lib/security/permissions.ts`.
- Audit log scoping: staff currently sees all events — this feature would restrict staff to ticket-scoped events and give admins the complete view.
- UI: a separate `/admin/users` page protected by the `ADMIN` role.

---

### 2. Email Notifications

Notify users of relevant events by email.

**Use cases:**

- Customer receives an email when staff replies to their ticket.
- Staff receives an email when a new ticket is submitted.
- Customer receives a confirmation email when their ticket is closed.

**Notes:**

- Explicitly excluded from MVP as unlikely within the time budget (noted in README).
- Would require an SMTP integration or a transactional email service (e.g. Resend, SendGrid).
- Must be async — email delivery should never block the HTTP response.
- Care needed to avoid leaking ticket content in email subjects; keep bodies minimal.

---

### 3. Ticket Priority Levels

Allow tickets to be classified by urgency.

**Proposed values:** `LOW`, `NORMAL`, `HIGH`, `CRITICAL`

**Use cases:**

- Customers set a priority when creating a ticket.
- Staff can override priority.
- Ticket list can be filtered and sorted by priority.
- High/critical tickets visually stand out in the list (badge colour).

**Notes:**

- Requires a `priority` field on the `Ticket` model (new migration).
- Status changes to priority could be added as audit events (`TICKET_PRIORITY_CHANGED`).
- Related to SLA tracking (see below).

---

### 4. SLA / Response Time Tracking

Track whether tickets are responded to within a defined time window.

**Use cases:**

- Each priority level maps to an SLA target (e.g. Critical = 1 h, High = 4 h).
- Staff dashboard shows tickets that are overdue or at risk.
- Audit log records SLA breaches as events.

**Notes:**

- Depends on priority levels (Feature 3) being implemented first.
- No external SLA tooling required; a computed field or scheduled check is sufficient for MVP+.

---

### 5. Real-time Updates (Polling / WebSocket)

Show new replies and status changes without requiring a page refresh.

**Options:**

- **Short polling** — simplest; client polls `/api/tickets/[id]` every N seconds.
- **Server-Sent Events (SSE)** — lightweight one-way stream from server to client.
- **WebSocket** — full-duplex; most powerful but adds infrastructure complexity.

**Notes:**

- Explicitly excluded from MVP (noted in both README and copilot instructions).
- Short polling is the lowest-effort starting point and doesn't require new infrastructure.
- WebSocket / SSE would require careful authentication of the persistent connection.

---

### 6. File Attachments

Allow customers and staff to attach files to ticket messages.

**Use cases:**

- Customer attaches a screenshot or log file when opening a ticket.
- Staff attaches a document or patch as part of a resolution.

**Notes:**

- Explicitly out of scope for MVP (noted in README and copilot instructions).
- Requires a file storage backend (e.g. S3-compatible bucket, local disk for dev).
- Security considerations are significant: file type validation, virus scanning, access-controlled download URLs, max file size enforcement.
- Download endpoint must verify ticket ownership before serving files (same RBAC rules as tickets).

---

### 7. Password Reset / Recovery

Allow users to recover access to their account without admin intervention.

**Flow:**

1. User requests a reset link via email.
2. A short-lived signed token is generated and emailed.
3. User clicks the link, sets a new password.

**Notes:**

- Excluded from MVP in favour of simple credential-based login.
- Depends on email notifications (Feature 2) being in place.
- Tokens must be single-use with a short expiry (15–60 minutes).
- Old token must be invalidated immediately after use.

---

### 8. Advanced Search and Filtering

Let users find tickets efficiently beyond simple list views.

**Proposed capabilities:**

- Full-text search across ticket titles and message content.
- Filter by status, priority, date range, assigned staff member.
- Staff-only: search across all tickets; customers search only their own.

**Notes:**

- Explicitly out of scope for MVP (copilot instructions and README).
- PostgreSQL full-text search (`tsvector`/`tsquery`) is a viable zero-dependency option.
- Alternatively, a dedicated search index (e.g. Meilisearch) for more advanced needs.
- Query parameters must be sanitised; rely on Prisma parameterised queries (never raw interpolation).

---

### 9. Ticket Assignment

Allow a ticket to be explicitly assigned to a specific staff member.

**Use cases:**

- Staff can claim a ticket or assign it to a colleague.
- Ticket list shows the assignee alongside status.
- Customers can see who is handling their ticket.

**Notes:**

- Requires an `assignedToUserId` field on `Ticket` (nullable, FK to `User`).
- `TICKET_ASSIGNED` audit event should be recorded with from/to user IDs.
- Pairs well with email notifications (Feature 2) to alert the assignee.

---

### 10. Ticket Tags / Labels

Classify tickets with free-form or predefined tags for easier triage.

**Use cases:**

- Staff tags a ticket as `billing`, `bug`, `feature-request`, etc.
- Ticket list can be filtered by tag.

**Notes:**

- Requires a many-to-many `Tag` model or a simple string array column.
- Tag creation and management would be an ADMIN-level operation (Feature 1).

---

### 11. Invitation-based Registration

Instead of open self-registration, staff (or admin) sends a signed invitation link to a new user. Only users with a valid invitation can create an account.

**Flow:**

1. Staff/Admin generates an invitation for a specific email address and role.
2. The system creates a short-lived signed token and sends it to the target email.
3. The recipient clicks the link, sets a password, and their account is created with the pre-assigned role.
4. The token is invalidated immediately after use.

**Use cases:**

- Prevents arbitrary users from self-registering as customers or staff.
- Ensures every account is explicitly approved before it can access the system.
- Pairs with the ADMIN role (Feature 1) — admins invite staff, staff invite customers.

**Notes:**

- For MVP, basic open self-registration is used to save time.
- Requires email notifications (Feature 2) to deliver the invitation link.
- Tokens must be single-use with a short expiry (e.g. 24–48 hours).
- Invitation records should be stored in the DB (`Invitation` model: `email`, `role`, `token`, `expiresAt`, `usedAt`).
- Sending an invitation should be recorded as an audit event (`INVITATION_SENT`).

---

## Technical Improvements

### Database Session Strategy (replacing JWT)

The MVP uses **JWT sessions** (`strategy: "jwt"` in `lib/auth.ts`). This means session data is stored entirely in a signed cookie — no database query is needed to check auth. `auth()` can be called freely in every Server Component.

If the project moves to **database sessions** (`strategy: "database"`), every `auth()` call would query the `sessions` table. To avoid redundant DB hits when multiple Server Components call `auth()` during a single request, wrap the function with React's `cache()`.

**Current implementation (JWT — no change needed):**

```ts
// lib/auth.ts
export function auth() {
  return getServerSession(authOptions);
}
```

**Future implementation (database sessions — deduplicated):**

```ts
// lib/auth.ts
import { cache } from "react";

// cache() deduplicates calls within a single React server render pass.
// No matter how many Server Components call auth(), the DB is queried only once.
export const auth = cache(() => getServerSession(authOptions));
```

**Why switch to database sessions?**

- **Instant session revocation.** With JWT, a token is valid until it expires — you can't log a user out immediately if their account is compromised. Database sessions can be deleted instantly.
- **Session listing.** You can show users all their active sessions and let them revoke specific ones (e.g. "logged in on Chrome, logged in on phone").
- **Server-side session data.** Database sessions can store arbitrary server-side data without inflating the cookie size.

**What changes are required:**

1. Add `Session` and `Account` models to the Prisma schema (NextAuth provides a standard schema).
2. Install `@next-auth/prisma-adapter` and configure it in `authOptions`.
3. Change `strategy: "jwt"` to `strategy: "database"` in `authOptions.session`.
4. Wrap `auth()` with `cache()` as shown above.
5. Remove the JWT `callbacks` (jwt/session) — no longer needed since session data comes from DB.

**When to switch:**

- When session revocation becomes a security requirement.
- When the app needs to support "log out all devices".
- Not needed for the MVP — JWT is simpler and suitable for the current scope.

---

<!-- Add new feature ideas below this line, following the same pattern -->
