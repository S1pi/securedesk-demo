# SecureDesk - Security Architecture and Justifications

This document describes the security layers currently implemented in SecureDesk and explains why each decision was made. It is intended as a concise reference for the project demo and evaluation.

---

## 1. Authentication (NextAuth / Auth.js)

**What:** All access to the application requires a valid session. Authentication is handled by NextAuth with a Credentials provider.

**Implementation:**

- `lib/auth.ts` configures NextAuth with JWT session strategy.
- The `authorize` function verifies the user's email and password against the database.
- Passwords are compared using `bcrypt`, never stored or logged in plaintext.
- The session token embeds `userId` and `role` so every server-side check has immediate access to identity and permission level.
- Session has a defined `maxAge` (1 week) to limit token lifetime.
- A custom `auth()` helper wraps `getServerSession` so every protected operation can check authentication in one call.

**Why:**

- Centralized auth keeps every protected operation on the same session contract.
- JWT sessions avoid extra database lookups on every request.
- `bcrypt` keeps password verification expensive for attackers even if the database is compromised.
- Putting `role` in the session makes server-side authorization checks cheap and consistent.

**OWASP relevance:** Identification and Authentication Failures (A07:2021).

---

## 2. Authorization - Role-Based Access Control (RBAC)

**What:** Two roles exist: `CUSTOMER` and `STAFF`. Every mutation and data access is restricted by role.

**Permissions matrix:**

| Action | CUSTOMER | STAFF |
| --- | --- | --- |
| Create ticket | Yes | Yes |
| List own tickets | Yes | Yes (all tickets) |
| View own ticket + thread | Yes | Yes (any ticket) |
| Reply to own ticket | Yes | Yes (any ticket) |
| Change ticket status | No | Yes |
| View audit log | No | Yes |

**Implementation:**

- `lib/security/permissions.ts` centralizes permission rules.
- All permission checks happen server-side in the service layer or Server Actions.
- The UI may hide controls, but the backend is the real security boundary.

**Why:**

- Centralized permissions are easier to audit and change safely.
- Server-side enforcement is mandatory; frontend checks alone are not security.
- This gives defense in depth on top of query-level ownership enforcement.

**OWASP relevance:** Broken Access Control (A01:2021).

---

## 3. Data Access Enforcement (Ownership Isolation)

**What:** CUSTOMER users can only access their own tickets. This is enforced at the query level, not only in UI logic.

**Implementation:**

- `lib/services/ticket.ts` applies `createdByUserId = actor.id` filtering for customer reads and replies.
- STAFF queries can read any ticket.
- Ownership violations still return outward `NOT_FOUND` so customers cannot enumerate other users' ticket IDs.

**Why:**

- Query-level enforcement means the database layer does not return other users' data by accident.
- Returning `404` instead of `403` for hidden ownership violations reduces resource enumeration risk.
- Permission checks and query scoping together create two independent layers.

**OWASP relevance:** Broken Access Control (A01:2021), Insecure Design (A04:2021).

---

## 4. Input Validation (Zod Schemas)

**What:** Mutation paths validate untrusted input with Zod before business logic runs. For abuse-prone paths where the limiter key is already available, rate limiting is checked first so malformed spam still consumes the bucket.

**Implementation:**

- `lib/validation/schemas.ts` defines the shared schemas for auth and ticket mutations.
- Login normalizes the raw identifier, checks rate limits, and then validates credentials before any database lookup.
- Registration and ticket Server Actions gather request and actor context, check the relevant rate-limit bucket, and then call `safeParse` on untrusted form data.
- No raw user input reaches the service layer or database without passing validation.

**Why:**

- Type and length constraints stop malformed or oversized payloads from reaching deeper layers.
- Applying rate limits before full validation on abuse-prone paths prevents invalid request spam from bypassing the limiter.
- The schemas also act as concise living documentation of accepted input.

**OWASP relevance:** Injection (A03:2021), Insecure Design (A04:2021).

---

## 5. Rate Limiting

**What:** Abuse-prone entry points are rate-limited to prevent flooding, password spraying, and targeted brute-force attempts.

**Implementation:**

- `lib/security/rate-limit.ts` implements an in-memory fixed-window limiter for the single-server demo.
- `lib/security/rate-limit-boundary.ts` consumes buckets, emits `RATE_LIMIT_TRIGGERED`, and throws a safe rate-limit error.
- Login uses two buckets: `login_ip` for broad spray protection and `login_ip_identifier` for repeated attempts against one identifier from one IP.
- Registration uses an IP-based bucket (`register_ip`).
- Ticket creation, replies, and status changes use authenticated actor-scoped buckets (`ticket_creation`, `ticket_reply`, `ticket_status_change`).
- The limiter runs before full validation and business logic on these abuse-prone paths so malformed requests still count.
- Blocked requests are surfaced to the UI as safe messages, and each blocked bucket window emits one audit event to avoid log spam.

**Why:**

- Without rate limiting, attackers can try passwords or spam write actions far too quickly.
- The separate login IP bucket helps prevent one source from cycling through many accounts.
- The login IP+identifier bucket slows repeated attacks against one account from one source.
- Audit visibility makes throttling events visible to staff.

**Known limitation:** The in-memory limiter resets on server restart and does not work across multiple instances. In production, a shared store such as Redis or Upstash would be used.

**OWASP relevance:** Identification and Authentication Failures (A07:2021), Security Misconfiguration (A05:2021).

---

## 6. Safe Error Handling

**What:** The application returns safe error messages that do not expose internal implementation details.

**Implementation:**

- The service layer uses coded `ServiceError` values for known failure cases.
- Server Actions return safe UI-facing error strings instead of stack traces or database errors.
- Ownership violations use `NOT_FOUND` to avoid leaking whether another user's ticket exists.
- Rate-limited paths return a safe message that explains the user should retry later.

**Why:**

- Internal errors, stack traces, and database details should never reach the client.
- Hiding resource existence reduces ticket ID enumeration risk.
- A consistent error style keeps the UI predictable and safer to reason about.

**OWASP relevance:** Security Misconfiguration (A05:2021).

---

## 7. Audit Logging (Security-Critical Events)

**What:** Security-critical events are persisted to an `AuditEvent` table in the database.

**Currently emitted events:**

| Action | When |
| --- | --- |
| `AUTH_LOGIN_FAILED` | Wrong email or wrong password |
| `FORBIDDEN_ACTION_ATTEMPT` | User tried an action they are not authorized for |
| `RATE_LIMIT_TRIGGERED` | Rate limit exceeded |

**Planned but not yet wired:**

| Action | When |
| --- | --- |
| `TICKET_CREATED` | New ticket created |
| `TICKET_STATUS_CHANGED` | Ticket opened or closed |

**Implementation:**

- `lib/services/audit.ts` provides a non-blocking `logAuditEvent()` helper.
- The same module exposes staff-guarded read helpers for both the audit list page and the single-event detail page.
- Audit records store `actorUserId`, `action`, `targetType`, `targetId`, `meta` (JSON), and `createdAt`.
- Message contents, passwords, and tokens are never stored in audit metadata.

**Why:**

- Failed logins, forbidden actions, and rate-limit triggers provide useful incident-detection data.
- Audit writes must not break the primary user action.
- Minimal structured metadata keeps the audit log useful without duplicating sensitive user content.
- Planned ticket lifecycle events will extend accountability further once they are wired.

**OWASP relevance:** Security Logging and Monitoring Failures (A09:2021).

---

## 8. Server Actions over Route Handlers (Reduced Attack Surface)

**What:** Internal UI mutations use Next.js Server Actions instead of a broad set of custom REST endpoints.

**Decision rule:**

- If the feature is only used by the application UI -> Server Action
- If an external HTTP endpoint is required -> Route Handler

**Why this is a security decision:**

1. A smaller public HTTP surface is easier to reason about and harder to scan blindly.
2. Server Actions remove a lot of manual request and response plumbing that is easy to misconfigure.
3. Server Actions reduce CSRF exposure through framework-managed action handling and origin checks, while this repo does not add a separate custom CSRF-token layer.
4. Auth checks remain mandatory; Server Actions are still server code.
5. Data reads stay in Server Components or the service layer instead of public JSON endpoints.
6. Business rules stay centralized in the service layer no matter which boundary calls them.

**What stays as a Route Handler:**

- `/api/auth/[...nextauth]` - required by NextAuth/Auth.js.

**OWASP relevance:** Broken Access Control (A01:2021), Security Misconfiguration (A05:2021).

---

## 9. Password Handling

**What:** Passwords are hashed with bcrypt before storage. Plaintext passwords never reach the database.

**Implementation:**

- Registration hashes passwords before `prisma.user.create`.
- Login verifies credentials with `bcrypt.compare`.
- Minimum password length is 12 characters.

**Why:**

- `bcrypt` is an adaptive password hashing algorithm designed for password storage.
- No plaintext password is stored or logged.
- A 12-character minimum provides a stronger baseline than the common minimum of 8.

**OWASP relevance:** Cryptographic Failures (A02:2021), Identification and Authentication Failures (A07:2021).

---

## 10. Database Design for Security

**What:** The schema supports security features at the data model level.

**Key decisions:**

- `passwordHash` exists and plaintext password storage does not.
- `Role` is an enum, so invalid roles cannot be inserted.
- `AuditEvent` is a first-class table, not only console logging.
- `closedByUserId` and `closedAt` on `Ticket` support accountability for status changes.
- `AuditAction` is an enum, so event names stay structured and queryable.
- CUIDs reduce simple ID guessing compared with sequential integers.

**OWASP relevance:** Insecure Design (A04:2021), Broken Access Control (A01:2021).

---

## 11. Security Testing (Vitest)

**What:** Focused security tests are planned to verify that the guarantees described in this document keep holding over time. They are not implemented yet.

**Planned test scenarios:**

| Test | Asserts |
| --- | --- |
| CUSTOMER cannot access another CUSTOMER's ticket | Returns `404`, not the ticket data |
| STAFF can access any ticket | Ticket is returned |
| CUSTOMER cannot change ticket status | Request is blocked |
| Invalid input is rejected | Zod validation fails safely |
| Rate-limited request is blocked | Threshold is enforced |
| Unauthenticated request is rejected | Session is required |

**Why:**

- Documentation can describe the design, but tests provide repeatable evidence.
- Security-focused tests help catch regressions before they become vulnerabilities.
- The planned scenarios map directly to the most important security guarantees in this app.

**OWASP relevance:** Cross-cutting verification for all implemented layers.

---

## Summary: Layered Security Model

```text
Layer 1: Rate Limiting
Block abusive request volume before deeper processing.

Layer 2: Input Validation (Zod)
Reject malformed or unsafe input before business logic.

Layer 3: Authentication (NextAuth)
Verify user identity.

Layer 4: Authorization (RBAC)
Check whether the authenticated user is allowed.

Layer 5: Data Access Enforcement
Constrain database reads by ownership and role.

Layer 6: Safe Error Handling
Return safe messages without leaking internals.

Layer 7: Audit Logging
Record security-relevant events for visibility and accountability.

Layer 8: Security Testing (planned)
Add regression proof for the critical security guarantees.
```

Each layer is intended to be independent. If one layer weakens, the others should still provide meaningful protection. That is the core defense-in-depth idea used throughout SecureDesk.
