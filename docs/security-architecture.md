# SecureDesk — Security Architecture & Justifications

This document describes every security layer implemented in SecureDesk and explains **why** each decision was made. It is intended as a reference for project evaluation.

---

## 1. Authentication (NextAuth / Auth.js)

**What:** All access to the application requires a valid session. Authentication is handled by NextAuth with a Credentials provider.

**Implementation:**

- `lib/auth.ts` configures NextAuth with JWT session strategy.
- The `authorize` function verifies the user's email and password against the database.
- Passwords are compared using `bcrypt`, never stored or logged in plaintext.
- The session token (JWT) embeds `userId` and `role` so every server-side check has immediate access to identity and permission level.
- Session has a defined `maxAge` (1 week) to limit token lifetime.
- A custom `auth()` helper wraps `getServerSession` so every protected operation can check authentication in one call.

**Why:**

- **Centralized auth:** One configuration, one session shape. Every server-side function checks the same session object — consistency prevents accidental gaps.
- **JWT strategy:** Avoids extra DB lookups per request. Suitable for a demo where session revocation is not critical.
- **bcrypt password hashing:** Industry-standard adaptive hashing. Cost factor makes brute-force attacks computationally expensive even if the database is compromised.
- **Role in session:** Embedding `role` in the JWT avoids a DB query on every request while still enabling authorization checks server-side.

**OWASP relevance:** Identification and Authentication Failures (A07:2021).

---

## 2. Authorization — Role-Based Access Control (RBAC)

**What:** Two roles exist: `CUSTOMER` and `STAFF`. Every mutation and data access is restricted by role.

**Permissions matrix:**

| Action                   | CUSTOMER | STAFF            |
| ------------------------ | -------- | ---------------- |
| Create ticket            | ✅       | ✅               |
| List own tickets         | ✅       | ✅ (all tickets) |
| View own ticket + thread | ✅       | ✅ (any ticket)  |
| Reply to own ticket      | ✅       | ✅ (any ticket)  |
| Change ticket status     | ❌       | ✅               |
| View audit log           | ❌       | ✅               |

**Implementation:**

- `lib/security/permissions.ts` — a single module that exports `canReadTicket`, `canReplyToTicket`, `canChangeStatus`, `canReadAudit`.
- All permission checks happen **server-side** (in service layer or Server Actions). The UI may hide buttons, but the server always enforces the rule.

**Why:**

- **Centralized permissions:** One file to audit. If the rule for "who can close a ticket" changes, it changes in exactly one place; every caller inherits the update.
- **Server-enforced:** A malicious client can craft any HTTP request. Frontend-only checks provide zero security. Server-side enforcement is mandatory.
- **Defence in depth:** Even though DB queries are already scoped (see section 3), the permission functions provide a second explicit check. If a query bug exposes data, the permission layer still blocks it.

**OWASP relevance:** Broken Access Control (A01:2021).

---

## 3. Data Access Enforcement (Ownership Isolation)

**What:** CUSTOMER users can only access their own tickets. This is enforced at the **database query level**, not just in application logic.

**Implementation:**

- The ticket service functions (e.g. `listTickets`, `getTicketWithMessages`) add a `WHERE createdByUserId = ?` filter when the caller is a CUSTOMER.
- STAFF queries have no ownership filter, granting access to all tickets.
- The query returns `null` for a ticket that doesn't exist **or** that the CUSTOMER doesn't own — making it impossible to distinguish "not found" from "forbidden".

**Why:**

- **Query-level enforcement prevents data leaks by design.** Even if a code path accidentally skips the permission function, the DB query itself never returns another user's data.
- **Returning 404 instead of 403** for ownership violations prevents enumeration attacks — a CUSTOMER cannot probe ticket IDs to discover which ones exist.
- **Two layers:** Both the query filter and the permission function must agree before data is returned. Failure of either blocks access.

**OWASP relevance:** Broken Access Control (A01:2021), Insecure Design (A04:2021).

---

## 4. Input Validation (Zod Schemas)

**What:** Every mutation endpoint validates input using Zod schemas before any business logic runs.

**Constraints enforced:**

| Field             | Rule                        |
| ----------------- | --------------------------- |
| `email`           | Valid email format          |
| `password`        | Minimum 12 characters       |
| `title`           | 1–80 characters             |
| `message content` | 1–2,000 characters          |
| `status`          | Enum: `OPEN` or `CLOSED`    |
| `role`            | Enum: `CUSTOMER` or `STAFF` |

**Implementation:**

- Each Server Action / Route Handler defines a Zod schema and calls `safeParse` on untrusted input.
- Validation failure returns a `400` response with a structured `{ error: { code, message } }` body.
- No raw user input reaches the database without passing validation.

**Why:**

- **Prevents injection:** Strict type and length constraints stop oversized payloads, unexpected field types, and malformed data from reaching the database layer.
- **Consistent error format:** Every validation failure returns the same JSON shape. Clients can rely on a predictable contract. Internals are never leaked.
- **Schema as documentation:** The Zod schemas serve as living documentation of what the API accepts, making them easy to review and audit.

**OWASP relevance:** Injection (A03:2021), Insecure Design (A04:2021).

---

## 5. Rate Limiting

**What:** Abuse-prone endpoints (ticket creation, posting messages, authentication attempts) are rate-limited to prevent flooding and brute-force attacks.

**Implementation:**

- In-memory rate limiter (documented as a known limitation for a single-server demo).
- Returns HTTP `429 Too Many Requests` with a consistent error body when the threshold is exceeded.
- Rate-limit events are recorded in the audit log (`RATE_LIMIT_TRIGGERED`).

**Why:**

- **Brute-force protection:** Without rate limiting, an attacker can try thousands of passwords per second against the login endpoint.
- **Abuse prevention:** Unrestricted ticket or message creation could flood the system with spam.
- **Audit visibility:** Logging rate-limit triggers allows staff to detect and investigate suspicious patterns.

**Known limitation:** In-memory rate limiting resets on server restart and does not work across multiple server instances. In production, a distributed store (Redis / Upstash) would be used.

**OWASP relevance:** Identification and Authentication Failures (A07:2021), Security Misconfiguration (A05:2021).

---

## 6. Safe Error Handling

**What:** The application returns consistent, safe error responses that never expose internal details.

**Error shape:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title must be between 1 and 80 characters."
  }
}
```

**HTTP status mapping:**

| Situation               | Status | Notes                                                      |
| ----------------------- | ------ | ---------------------------------------------------------- |
| Not logged in           | `401`  |                                                            |
| Logged in but forbidden | `403`  | For RBAC violations (e.g. CUSTOMER tries to change status) |
| Ownership violation     | `404`  | Hides resource existence from unauthorized users           |
| Invalid input           | `400`  | Zod validation messages only                               |
| Rate limited            | `429`  |                                                            |
| Server error            | `500`  | Generic message — no stack trace, no DB error              |

**Why:**

- **No information leakage:** Stack traces, DB error codes, and internal paths are never sent to the client. A `500` response says "Something went wrong" and nothing more.
- **404 over 403 for ownership:** If a CUSTOMER requests ticket ID `abc123` that belongs to another user, the response is `404 Not Found` — not `403 Forbidden`. This prevents an attacker from confirming that the ticket exists.
- **Consistent shape:** Every error follows the same `{ error: { code, message } }` structure, making the API predictable and easier to consume safely.

**OWASP relevance:** Security Misconfiguration (A05:2021), Cryptographic Failures (A02:2021 — avoiding leaked internal state).

---

## 7. Audit Logging (Security-Critical Events)

**What:** Security-critical events are persisted to an `AuditEvent` table in the database.

**Logged events:**

| Action                     | When                                              |
| -------------------------- | ------------------------------------------------- |
| `AUTH_LOGIN_FAILED`        | Wrong email or wrong password                     |
| `TICKET_CREATED`           | New ticket created                                |
| `TICKET_REPLY_POSTED`      | Message added to a ticket                         |
| `TICKET_STATUS_CHANGED`    | Ticket opened or closed (includes from/to status) |
| `FORBIDDEN_ACTION_ATTEMPT` | User tried an action they are not authorized for  |
| `RATE_LIMIT_TRIGGERED`     | Rate limit exceeded                               |

**Implementation:**

- `lib/services/audit.ts` — `logAuditEvent()` is a fire-and-forget function that **never throws**. If logging fails, the failure is written to `console.error` but the original request is not interrupted.
- Audit records store: `actorUserId`, `action`, `targetType`, `targetId`, `meta` (JSON), and `createdAt`.
- **No sensitive data in meta:** Message contents, passwords, and tokens are never stored. Only structural metadata (ticket ID, from/to status, endpoint name).
- STAFF can view the audit log through a dedicated page.

**Why:**

- **Incident detection:** Failed login attempts and forbidden action attempts create a trail that staff can use to identify brute-force attacks or privilege escalation attempts.
- **Accountability:** Every state change (ticket creation, status change) is attributed to a specific user and timestamp.
- **Non-blocking logging:** Audit logging must not break the user's request. If the audit write fails (e.g. DB connection issue), the primary operation still completes.
- **No sensitive payloads:** Storing message content in audit logs would create a second unprotected copy of user data. Storing only IDs and metadata minimizes the blast radius of a potential audit table leak.

**OWASP relevance:** Security Logging and Monitoring Failures (A09:2021).

---

## 8. Server Actions over Route Handlers (Reduced Attack Surface)

**What:** Internal UI mutations use Next.js Server Actions instead of public REST API Route Handlers.

**Decision rule:**

- If the feature is only used by the application UI → **Server Action**
- If an external HTTP endpoint is required (NextAuth, external integrations) → **Route Handler**

**Why this is a security decision:**

1. **Smaller public attack surface.** Every Route Handler creates a publicly addressable HTTP endpoint (`/api/tickets`, `/api/tickets/[id]/messages`, etc.) that can be discovered and targeted by scanners. Server Actions do not create scannable URL patterns — Next.js routes them through internal encrypted action IDs.

2. **No manual HTTP plumbing to get wrong.** Route Handlers require parsing JSON bodies, constructing response objects, and mapping status codes correctly — each of these is an opportunity for an error that could leak data or bypass a check. Server Actions eliminate this layer.

3. **Built-in CSRF protection.** Next.js Server Actions include automatic CSRF protection via origin checking. Route Handlers require manual CSRF token handling or reliance on `SameSite` cookies alone.

4. **Auth checks remain mandatory.** Server Actions are still server code — they must call `auth()` and check permissions exactly like Route Handlers would. The security enforcement does not change, but the entry point is simpler and harder to misconfigure.

5. **Data reads use Server Components.** Read operations (list tickets, view ticket detail, view audit log) are handled directly in Server Components that call the service layer during rendering. No API endpoint exists to expose read data to unauthorized callers.

6. **Centralized authorization checks.**
   All business logic and permission checks are implemented in the service layer.  
   Both Server Actions and possible Route Handlers call the same service functions, ensuring consistent enforcement of authorization rules.

**What stays as a Route Handler:**

- `/api/auth/[...nextauth]` — required by the NextAuth library.
- `/api/auth/register` — borderline case; could become a Server Action, currently kept as Route Handler.

**OWASP relevance:** Broken Access Control (A01:2021), Security Misconfiguration (A05:2021).

---

## 9. Password Handling

**What:** Passwords are hashed with bcrypt before storage. Plaintext passwords never reach the database.

**Implementation:**

- Registration: `bcrypt.hash(password, salt)` before `prisma.user.create`.
- Login: `bcrypt.compare(input, storedHash)` — the plaintext is never persisted or logged.
- Minimum password length: 12 characters (enforced by Zod).

**Why:**

- **bcrypt is adaptive:** The cost factor makes brute-force attacks expensive. As hardware improves, the cost factor can be increased without changing the codebase.
- **No plaintext storage:** Even if the database is compromised, passwords cannot be reversed.
- **Minimum length:** 12 characters provides a strong baseline against dictionary and brute-force attacks. NIST SP 800-63B recommends a minimum of 8; 12 provides additional margin.

**OWASP relevance:** Cryptographic Failures (A02:2021), Identification and Authentication Failures (A07:2021).

---

## 10. Database Design for Security

**What:** The schema is designed to support security features at the data model level.

**Key decisions:**

- **`passwordHash` field, no `password` field:** The schema physically cannot store a plaintext password.
- **`Role` enum:** Roles are enforced at the database level — invalid roles cannot be inserted.
- **`AuditEvent` model:** Audit log is a first-class database table, not an afterthought in application logs. It can be queried, indexed, and retained independently.
- **`closedByUserId` + `closedAt` on Ticket:** Status changes record who made them and when, enabling accountability even without checking the audit log.
- **`AuditAction` enum:** Limits audit events to a known set of actions. Prevents arbitrary strings from being logged, keeping the audit trail structured and queryable.
- **CUID for IDs:** Non-sequential, non-guessable identifiers. Unlike auto-increment integers, CUIDs prevent enumeration attacks (you cannot guess the next ticket ID by incrementing).

**OWASP relevance:** Insecure Design (A04:2021), Broken Access Control (A01:2021).

---

## 11. Security Testing (Vitest)

**What:** Automated tests verify that security guarantees hold.

**Key test scenarios:**

| Test                                             | Asserts                            |
| ------------------------------------------------ | ---------------------------------- |
| CUSTOMER cannot access another CUSTOMER's ticket | Returns `404`, not the ticket data |
| STAFF can access any ticket                      | Returns `200` with ticket data     |
| CUSTOMER cannot change ticket status             | Returns `403`                      |
| Invalid input returns `400`                      | Zod validation rejects bad data    |
| Rate-limited endpoint returns `429`              | Request blocked after threshold    |
| Unauthenticated request returns `401`            | Session required                   |

**Why:**

- **Prove, don't promise.** Documentation can claim access control works, but only tests prove it. A passing test suite demonstrates that a CUSTOMER literally cannot read another user's ticket.
- **Regression safety.** If a future code change accidentally removes a permission check, the test fails — catching the vulnerability before it reaches production.
- **Security-first test design.** Tests focus on what must be **prevented**, not just what should work. This mirrors how a security auditor would evaluate the system.

**OWASP relevance:** All categories — tests verify every layer.

---

## Summary: Layered Security Model

```
┌─────────────────────────────────────────────┐
│  Layer 1: Rate Limiting                     │
│  Block abusive request volume               │
├─────────────────────────────────────────────┤
│  Layer 2: Input Validation (Zod)            │
│  Reject malformed or dangerous input        │
├─────────────────────────────────────────────┤
│  Layer 3: Authentication (NextAuth)         │
│  Verify identity — who is this user?        │
├─────────────────────────────────────────────┤
│  Layer 4: Authorization (RBAC)              │
│  Check role — is this user allowed?         │
├─────────────────────────────────────────────┤
│  Layer 5: Data Access Enforcement           │
│  Query-level ownership — DB never returns   │
│  data the user shouldn't see                │
├─────────────────────────────────────────────┤
│  Layer 6: Safe Error Handling               │
│  No internal details leaked to client       │
├─────────────────────────────────────────────┤
│  Layer 7: Audit Logging                     │
│  Record security events for detection and   │
│  accountability                             │
├─────────────────────────────────────────────┤
│  Layer 8: Security Testing                  │
│  Automated proof that all layers work       │
└─────────────────────────────────────────────┘
```

Each layer is independent. If one fails, the others still protect the system. This is the principle of **defence in depth** — no single point of failure for security.
