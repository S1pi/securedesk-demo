# Copilot Project Instructions

These instructions guide AI coding assistants when generating code for this repository.

Remember If you are unsure about something, say so instead of guessing. Always ask for clarification if needed.

PROJECT: SecureDesk (Support Ticket System with Layered Security)

Goal:
Build a small but complete support ticket web app where the main focus is demonstrating layered web security:

- request-level protections (rate limiting, input validation)
- authentication (NextAuth/Auth.js)
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
- NextAuth (Auth.js) for authentication (sessions)
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

- NextAuth (Auth.js) session must include userId and role (CUSTOMER/STAFF).
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
2. Implement NextAuth (Auth.js) with role in session
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
- Prefer types over interfaces when ever possible.
- Use interfaces only in specific cases (e.g. for declaration merging or when extending a type).
- Use async/await with try-catch for all async operations.
- Keep functions small and named by intent.
- Prefer readable, consistent naming: ticketId, userId, createdByUserId.
- No “magic strings” scattered: use enums/constants for actions/status/roles.
<!-- - Centralize permissions logic in a single module. -->
- Use shadcn/ui components for consistent styling.

## API vs Server Actions

This project prefers **Server Actions** for internal application mutations.

Use Server Actions for operations triggered directly by the UI, such as:

- user registration
- ticket creation
- posting ticket messages
- changing ticket status

Server Actions should call the **service layer**, which contains the business logic, permission checks, audit logging and database access.

Do NOT place business logic directly in Server Actions.

---

### When to use Route Handlers

Route Handlers should only be used when a real HTTP API endpoint is required.

Examples include:

- authentication routes required by Auth.js / NextAuth
- endpoints intended for programmatic access
- integrations with external systems
- features that must expose a REST-style API

If a feature is only used internally by the Next.js application UI, prefer Server Actions instead of creating an API route.

---

### Decision rule

When implementing a new feature:

1. Check if the functionality is only used by the internal UI.
2. If yes → implement it using a **Server Action**.
3. If an external HTTP endpoint is required → use a **Route Handler**.

If uncertain, prefer Server Actions and explain the reasoning.

## Development Workflow

This project follows a structured development process defined in documentation files inside the `docs/` directory.

The AI should use these files to understand the development order, the current state, and the project history.

---

### docs/development-plan.md

Defines the **intended implementation order** of the project.

Typical phase order:

setup → core logic → security layers → UI → testing

When suggesting implementation steps:

- Prefer following the phase order defined in `docs/development-plan.md`
- Especially respect the order during early development (setup and core logic)
- Avoid jumping to later phases if earlier phases are incomplete

---

### docs/progress.md

Represents the **current development state** of the project.

Before suggesting implementation steps:

- Check `docs/progress.md`
- Determine the active phase
- Prefer continuing from **In Progress**
- If "In Progress" is empty, use **Next Steps**

Ensure suggestions remain aligned with the development order defined in `docs/development-plan.md`.

---

### docs/dev-log.md

Contains a **historical log of development milestones**.

Purpose:

- Record important completed features
- Provide historical reference for past work
- Help understand how the project evolved

Do not rely on this file to determine the current state.  
Use `docs/progress.md` for the current status.

---

## Progress Tracking Rules (AI Instructions)

Project status is tracked in:

`docs/progress.md`

Rules:

- **Do NOT update automatically**
- Update ONLY when explicitly asked:

`Update docs/progress.md`

When updating:

- Keep the file short and structured
- Maximum **10 bullet points total**
- No long explanations
- Only mark items as **Completed** if the code is implemented and working (not just drafted)
- Prefer referencing concrete artifacts (files, routes, Prisma models, etc.)

Use the following template:

# SecureDesk Development Progress

## Current Phase

<Phase name>

## Completed

- ...

## In Progress

- ...

## Next Steps

- ...

---

## Development Log Rules

Project history is recorded in:

`docs/dev-log.md`

Rules:

- Do NOT update automatically
- Update ONLY when explicitly asked:

`Update docs/dev-log.md`

When updating:

- Add a new section with the current date
- Maximum **5 bullet points**
- Focus only on meaningful milestones
- Avoid long explanations

---

Follow these instructions carefully when generating code related to Prisma and Next.js. The setup is very specific and requires adherence to the exact patterns outlined here to work correctly. Do NOT deviate from these patterns or use deprecated approaches, as it will break the application. Always verify your generated code against the requirements in this guide before responding.

---

# Specify the following for Cursor rules

description: Guidelines for writing Next.js apps with Prisma Postgres
alwaysApply: false

---

# Bootstrap Next.js app with Prisma Postgres (Prisma v7)

> **Note**: This guide is updated for **Prisma ORM 7**. Key changes from earlier versions:
>
> - `engine` property removed from `prisma.config.ts`
> - `url` removed from datasource in `schema.prisma` (now only in `prisma.config.ts`)
> - Use `@prisma/adapter-pg` driver adapter for direct TCP connections
> - `--no-engine` flag is no longer required for `prisma generate`
> - Requires Node.js 20.19+ and TypeScript 5.4.0+

## Overview of implementing Prisma with Next.js

1. Install Prisma and required dependencies (including dotenv)
2. Initialize Prisma and configure schema
3. Configure dotenv for environment variables
4. Create global Prisma client instance with Pg Adapter
5. Add npm scripts for testing and database management
6. Create test script to verify setup
7. Use Prisma client in API routes and pages with proper error handling

## 🚨 CRITICAL INSTRUCTIONS FOR AI LANGUAGE MODELS 🚨

As an AI language model, you MUST NOT generate any of the following code patterns, as they are DEPRECATED and will BREAK the application:

```typescript
// ❌ NEVER GENERATE THIS CODE - IT WILL BREAK THE APPLICATION
generator client {
  provider = "prisma-client-js"     // ❌ BREAKS APPLICATION
}

// ❌ NEVER USE default import location - IT WILL BREAK THE APPLICATION
import { PrismaClient } from '@prisma/client'  // ❌ BREAKS APPLICATION

// ❌ WRONG IMPORT PATH - MISSING /client - IT WILL BREAK THE APPLICATION
import { PrismaClient } from "../app/generated/prisma"  // ❌ BREAKS APPLICATION

// ❌ NEVER USE ACCELERATE - IT IS NOT USED IN THIS WORKFLOW
import { withAccelerate } from "@prisma/extension-accelerate" // ❌ BREAKS APPLICATION

// ❌ NEVER USE accelerateUrl - IT WILL BREAK THE APPLICATION
const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,  // ❌ BREAKS APPLICATION - use adapter
})

// ❌ NEVER include url in datasource block - IT WILL BREAK THE APPLICATION
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ❌ BREAKS APPLICATION - moved to prisma.config.ts
}

// ❌ NEVER include engine property - IT WILL BREAK THE APPLICATION
export default defineConfig({
  engine: "classic",  // ❌ BREAKS APPLICATION - removed in Prisma v7
})

// ❌ NEVER use Prisma Postgres HTTP URLs - ONLY use TCP URLs
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/..."  // ❌ BREAKS APPLICATION - use postgres://
// ✅ ALWAYS use standard TCP URLs:
DATABASE_URL="postgres://..."  // ✅ CORRECT
```

Instead, you MUST ALWAYS generate ONLY this pattern:

```typescript
// ✅ ALWAYS GENERATE THIS EXACT PATTERN
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

// ✅ CRITICAL: MUST include /client at the end of import path
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
```

## ABSOLUTE REQUIREMENTS FOR AI CODE GENERATION

1. You MUST use `provider = "prisma-client"` (not "prisma-client-js")
2. You MUST use custom output: `output = "../app/generated/prisma"`
3. You MUST use `@prisma/adapter-pg` driver adapter
4. You MUST create `lib/prisma.ts` as a global singleton instance
5. You MUST wrap all database calls in try-catch blocks
6. You MUST import from `'../app/generated/prisma/client'` (not `'@prisma/client'` or `'../app/generated/prisma'`)
7. You MUST use `adapter` property in PrismaClient constructor
8. You MUST install `dotenv` and add `import "dotenv/config"` to `prisma.config.ts`
9. You MUST add npm scripts for `db:test` and `db:studio` to package.json
10. You MUST create a test script at `scripts/test-database.ts` to verify setup
11. You MUST NOT include `url` in the datasource block of `schema.prisma`
12. You MUST NOT include `engine` property in `prisma.config.ts`
13. You MUST use `npx prisma init --db --output ../app/generated/prisma` to create a real cloud database
14. You MUST use standard TCP URLs (`postgres://...`) in .env
15. You MUST NOT use `accelerateUrl` or `withAccelerate`

## VERSION REQUIREMENTS

- **Node.js**: 20.19 or higher (Node.js 18 is NOT supported)
- **TypeScript**: 5.4.0 or higher (5.9.x recommended)
- **Prisma**: 7.0.0 or higher

## CORRECT INSTALLATION

```bash
# Dev dependencies
npm install prisma tsx --save-dev

# Production dependencies
npm install @prisma/adapter-pg @prisma/client dotenv
```

## CORRECT PRISMA INITIALIZATION

> **FOR AI ASSISTANTS**: This command is **interactive** and requires user input. You **MUST ask the user to run this command manually** in their own terminal, then **wait for them to confirm completion** before proceeding with the next steps. Do NOT attempt to run this command yourself.

```bash
# Initialize Prisma AND create a real Prisma Postgres cloud database
npx prisma init --db --output ../app/generated/prisma
```

This command:

- Authenticates you with Prisma Console (if needed)
- Prompts for **region** and **project name**
- **Creates a cloud Prisma Postgres database**
- Generates:
  - `prisma/schema.prisma` (with correct output path)
  - `prisma.config.ts` (with dotenv import)
  - **`.env` with a `DATABASE_URL`**

**IMPORTANT**: Ensure the generated `.env` uses a `postgres://` URL scheme. If it generates `prisma+postgres://`, replace it with the standard TCP connection string available in the Prisma Console.

```text
DATABASE_URL="postgres://..."
```

**IMPORTANT**: Do NOT use `npx prisma init` without `--db` as this only creates local files without a database.

## CORRECT PRISMA CONFIG (prisma.config.ts)

When using `npx prisma init --db`, the `prisma.config.ts` is **auto-generated** with the correct configuration:

```typescript
import "dotenv/config"; // ✅ Auto-included by prisma init --db
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // ✅ NO engine property - removed in Prisma v7
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

**Note**: If you need to manually create this file, ensure `import "dotenv/config"` is at the top.

## CORRECT SCHEMA CONFIGURATION (prisma/schema.prisma)

Update the generated `prisma/schema.prisma` file:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // ✅ NO url here - now configured in prisma.config.ts
}

// Example User model for testing
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## CORRECT GLOBAL PRISMA CLIENT

Create `lib/prisma.ts` file:

```typescript
import { PrismaClient } from "../app/generated/prisma/client"; // ✅ CRITICAL: Include /client
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

## ADD NPM SCRIPTS TO PACKAGE.JSON

Update your `package.json` to include these scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:test": "tsx scripts/test-database.ts",
    "db:studio": "prisma studio"
  }
}
```

## CREATE TEST SCRIPT

Create `scripts/test-database.ts` to verify your setup:

```typescript
import "dotenv/config"; // ✅ CRITICAL: Load environment variables
import prisma from "../lib/prisma";

async function testDatabase() {
  console.log("🔍 Testing Prisma Postgres connection...\n");

  try {
    // Test 1: Check connection
    console.log("✅ Connected to database!");

    // Test 2: Create a test user
    console.log("\n📝 Creating a test user...");
    const newUser = await prisma.user.create({
      data: {
        email: "demo@example.com",
        name: "Demo User",
      },
    });
    console.log("✅ Created user:", newUser);

    // Test 3: Fetch all users
    console.log("\n📋 Fetching all users...");
    const allUsers = await prisma.user.findMany();
    console.log(`✅ Found ${allUsers.length} user(s):`);
    allUsers.forEach((user) => {
      console.log(`   - ${user.name} (${user.email})`);
    });

    console.log("\n🎉 All tests passed! Your database is working perfectly.\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testDatabase();
```

## CORRECT API ROUTE IMPLEMENTATION (App Router)

Create `app/api/users/route.ts` with GET and POST handlers:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
```

## CORRECT USAGE IN SERVER COMPONENTS

Update `app/page.tsx` to display users from the database:

```typescript
import prisma from "../lib/prisma";

export default async function Home() {
    let users: Array<{
        id: number;
        email: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
    }> = [];
    let error = null;

    try {
        users = await prisma.user.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
    } catch (e) {
        console.error("Error fetching users:", e);
        error =
            "Failed to load users. Make sure your DATABASE_URL is configured.";
    }

    return (
        <main className="p-8">
            <h1 className="text-2xl font-bold mb-4">Users from Database</h1>
            {error ? (
                <p className="text-red-500">{error}</p>
            ) : users.length === 0 ? (
                <p>No users yet. Create one using the API at /api/users</p>
            ) : (
                <ul className="space-y-2">
                    {users.map((user) => (
                        <li key={user.id} className="border p-4 rounded">
                            <p className="font-semibold">
                                {user.name || "No name"}
                            </p>
                            <p className="text-sm text-gray-600">
                                {user.email}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
```

## COMPLETE SETUP WORKFLOW

User should follow these steps (AI should provide these instructions):

1. **Install dependencies**:

   ```npm
   npm install prisma tsx --save-dev
   ```

   ```npm
   npm install @prisma/adapter-pg @prisma/client dotenv
   ```

2. **Initialize Prisma AND create Prisma Postgres database** (⚠️ USER MUST RUN MANUALLY):

   > **AI ASSISTANT**: Ask the user to run this command in their own terminal. This is interactive and requires user input. Wait for the user to confirm completion before continuing.

   ```npm
   npx prisma init --db --output ../app/generated/prisma
   ```

   The user should follow the terminal prompts to:
   - Authenticate with Prisma Console (if needed)
   - Choose a region (e.g., us-east-1)
   - Name your project

   Once complete, this creates `prisma/schema.prisma`, `prisma.config.ts`, AND `.env` with the `DATABASE_URL`.

   **User should confirm when done** so the AI can proceed with the next steps.

3. **Verify `.env` was created** - Ensure `DATABASE_URL` uses `postgres://`. If it uses `prisma+postgres://`, change it to the TCP connection string.

   ```text
   DATABASE_URL="postgres://..."
   ```

   **Do NOT invent or manually change this URL. Use the one from Prisma Console.**

4. **Update `prisma/schema.prisma`** - Add the User model (generator and datasource are already configured):

   ```prisma
   model User {
     id        Int      @id @default(autoincrement())
     email     String   @unique
     name      String?
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

5. **Create `lib/prisma.ts`** with correct import path including `/client` and using `@prisma/adapter-pg`.

6. **Add npm scripts** to `package.json` for `db:test` and `db:studio`

7. **Create `scripts/test-database.ts`** test script

8. **Push schema to database**:

   ```npm
   npx prisma db push
   ```

9. **Generate Prisma Client**:

   ```npm
   npx prisma generate
   ```

10. **Test the setup**:

    ```bash
    npm run db:test
    ```

11. **Start development server**:
    ```bash
    npm run dev
    ```

## AI MODEL VERIFICATION STEPS

Before generating any code, you MUST verify:

1. Are you using `provider = "prisma-client"` (not "prisma-client-js")? If not, STOP and FIX.
2. Are you using `output = "../app/generated/prisma"`? If not, STOP and FIX.
3. Are you importing from `'../app/generated/prisma/client'` (with `/client`)? If not, STOP and FIX.
4. Did you add `import "dotenv/config"` to `prisma.config.ts`? If not, STOP and FIX.
5. Did you add `import "dotenv/config"` to `scripts/test-database.ts`? If not, STOP and FIX.
6. Are you using `@prisma/adapter-pg`? If not, STOP and FIX.
7. Are you using `adapter` property in PrismaClient constructor? If not, STOP and FIX.
8. Are you wrapping database operations in try-catch? If not, STOP and FIX.
9. Did you create the test script at `scripts/test-database.ts`? If not, STOP and FIX.
10. Did you add `db:test` and `db:studio` scripts to package.json? If not, STOP and FIX.
11. Did you remove `url` from the datasource block in `schema.prisma`? If not, STOP and FIX.
12. Did you remove `engine` property from `prisma.config.ts`? If not, STOP and FIX.
13. Are you using `npx prisma init --db` (not just `npx prisma init`)? If not, STOP and FIX.
14. Is the DATABASE_URL a TCP URL (`postgres://...`)? If it's a `prisma+postgres://` URL, STOP and FIX.
15. Did Prisma generate the `.env` file? If you invented the URL manually, STOP and FIX.

## CONSEQUENCES OF INCORRECT IMPLEMENTATION

If you generate code using:

- `prisma-client-js` provider → **CLIENT GENERATION FAILS**
- Wrong import path (missing `/client`) → **MODULE NOT FOUND ERROR**
- Missing `import "dotenv/config"` in prisma.config.ts → **DATABASE_URL NOT FOUND ERROR**
- Missing `import "dotenv/config"` in test scripts → **ENVIRONMENT VARIABLE ERROR**
- Default import from `@prisma/client` → **IMPORT ERROR**
- Using `accelerateUrl` or `withAccelerate` → **UNNECESSARY ACCELERATE DEPENDENCY / CONFIG ERROR**
- Missing custom output path → **WRONG CLIENT GENERATED**
- Including `url` in datasource block → **DEPRECATED CONFIGURATION ERROR**
- Including `engine` property → **DEPRECATED CONFIGURATION ERROR**
- Using local URL (`postgres://localhost:...`) → **VERSION INCOMPATIBILITY ERRORS WITH Prisma v7**
- Using `npx prisma init` without `--db` → **NO DATABASE CREATED, ONLY LOCAL FILES**
- Manually inventing DATABASE_URL → **INVALID CONNECTION STRING ERRORS**

The implementation will:

1. Break immediately with module errors
2. Fail to read environment variables
3. Cause connection pool exhaustion in production
4. Result in import errors that prevent compilation
5. Cause performance issues and connection failures
6. Fail with "HTTP connection string is not supported" errors when using local URLs

## USEFUL COMMANDS

```bash
# After changing schema
npx prisma generate              # Regenerate client (--no-engine flag no longer needed)

# Push schema to database (no migrations)
npx prisma db push

# Test database connection
npm run db:test

# Open visual database editor
npm run db:studio

# Create and apply migrations (for production)
npx prisma migrate dev --name your_migration_name
```

## TESTING WORKFLOW

After setup, test with these steps:

1. **Test database connection**:

   ```bash
   npm run db:test
   ```

   Should create a demo user and display it.

2. **Open Prisma Studio**:

   ```bash
   npm run db:studio
   ```

   Visual interface at `localhost:5555` to view/edit data.

3. **Test API routes**:

   ```bash
   # Create a user via API
   curl -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test User"}'

   # Get all users
   curl http://localhost:3000/api/users
   ```

4. **View in browser**:
   Open `localhost:3000` to see users displayed on the homepage.

## AI MODEL RESPONSE TEMPLATE

When asked about Prisma + Next.js implementation, you MUST:

1. ONLY use code patterns from this guide
2. NEVER suggest deprecated approaches
3. ALWAYS use the exact patterns shown above
4. ALWAYS include `/client` in import paths
5. ALWAYS add `import "dotenv/config"` to prisma.config.ts
6. ALWAYS add `import "dotenv/config"` to test scripts
7. ALWAYS create the test script at `scripts/test-database.ts`
8. ALWAYS add npm scripts for `db:test` and `db:studio`
9. ALWAYS include error handling in API routes and server components
10. ALWAYS use the global prisma instance from `lib/prisma.ts`
11. ALWAYS use `@prisma/adapter-pg` and `adapter` property
12. NEVER include `url` in the datasource block of schema.prisma
13. NEVER include `engine` property in prisma.config.ts
14. ALWAYS ask the user to run `npx prisma init --db --output ../app/generated/prisma` **manually in their own terminal** (this command is interactive and requires user input for region and project name)
15. ALWAYS wait for user confirmation after they run the interactive `prisma init --db` command before proceeding
16. NEVER attempt to run interactive commands yourself - ask the user to do it
17. NEVER use `prisma+postgres://` URLs - ONLY `postgres://` TCP URLs
18. NEVER manually invent or fabricate DATABASE_URL values
19. ALWAYS let Prisma generate the `.env` file with the real DATABASE_URL (and ensure it's correct type)
20. VERIFY your response against ALL the patterns shown here before responding

Remember: There are NO EXCEPTIONS to these rules. Every requirement is MANDATORY for the setup to work.
