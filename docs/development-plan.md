# SecureDesk Development Plan

This file defines the implementation order for the SecureDesk project.

## Phase 1 – Project Setup

- Next.js project setup
- PostgreSQL (Docker) configuration
- Prisma schema
  - User
  - Ticket
  - Message
  - AuditEvent
- NextAuth (Auth.js) authentication
- Basic test UI

## Phase 2 – Core Logic

- Ticket CRUD service
- Permission checks (RBAC)
- Ticket message thread

## Phase 3 – Security Layers

- Zod validation
- Rate limiting
- Audit logging

## Phase 4 – UI

- Ticket list
- Ticket detail
- Create ticket form
- Audit dashboard

## Phase 5 – Testing

- Security scenario tests
- Access control tests
- Rate limit tests
