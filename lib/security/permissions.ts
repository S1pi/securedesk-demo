/**
 * RBAC rules for SecureDesk.
 *
 * CUSTOMER:
 * - read own tickets
 * - reply to own tickets
 *
 * STAFF:
 * - read any ticket
 * - reply to any ticket
 * - change ticket status
 * - read audit logs
 */

import {
  Role,
  type Role as RoleType,
  type TicketStatus,
} from "@/app/generated/prisma/client";

/**
 * Minimal actor context used by services and Server Actions.
 *
 * Goal:
 * - keep permission checks independent from NextAuth session objects
 * - avoid passing large objects when only id + role are needed
 */
export type Actor = {
  id: string;
  role: RoleType;
};

/**
 * Minimal ticket data needed for permission checks.
 *
 * Approach:
 * - pass only the fields the rule actually needs
 * - expand this shape later if you want reply rules to depend on status
 */
export type TicketPermissionContext = {
  createdByUserId: string;
  status: TicketStatus;
};

export function isStaff(actor: Actor): boolean {
  return actor.role === Role.STAFF;
}

export function isCustomer(actor: Actor): boolean {
  return actor.role === Role.CUSTOMER;
}

/**
 * Customers may only read their own tickets.
 * Staff may read any ticket.
 */
export function canReadTicket(
  actor: Actor,
  ticket: TicketPermissionContext,
): boolean {
  if (isStaff(actor)) {
    return true;
  }

  return actor.id === ticket.createdByUserId;
}

/**
 * For now, replying follows the same ownership rule as reading.
 *
 * TODO:
 * - decide whether CLOSED tickets should reject replies
 * - if yes, extend this function to combine ownership and status checks
 */
export function canReplyToTicket(
  actor: Actor,
  ticket: TicketPermissionContext,
): boolean {
  return canReadTicket(actor, ticket);
}

/**
 * Only staff can open/close tickets.
 */
export function canChangeTicketStatus(actor: Actor): boolean {
  return isStaff(actor);
}

/**
 * Only staff can read security audit events.
 */
export function canReadAuditLog(actor: Actor): boolean {
  return isStaff(actor);
}
