import {
  type Prisma,
  Role,
  type TicketStatus,
} from "@/app/generated/prisma/client";
import { ServiceError } from "@/lib/CustomErrors";
import prisma from "@/lib/db";
import {
  canChangeTicketStatus,
  isStaff,
  type Actor,
} from "@/lib/security/permissions";

export type CreateTicketInput = {
  title: string;
  message: string;
};

export type PostReplyInput = {
  content: string;
};

/**
 * Build a Prisma where clause that already enforces ownership for customers.
 *
 * Goal:
 * - keep data-access restrictions close to the database query
 * - return 404-style behavior for customer ownership violations by scoping the query itself
 *
 * Approach:
 * - staff: query by ticket id only
 * - customer: query by ticket id + createdByUserId
 */
export function ticketAccessFilter(
  actor: Actor,
  ticketId: string,
): Prisma.TicketWhereInput {
  if (actor.role === Role.STAFF) {
    return { id: ticketId };
  }

  return {
    id: ticketId,
    createdByUserId: actor.id,
  };
}

/**
 * Working version for comparison.
 *
 * Why there is no explicit transaction here:
 * - this uses one Prisma `create` call with a nested `messages.create`
 * - Prisma treats that nested write as one atomic operation
 * - if the message insert fails, the ticket insert is rolled back automatically
 *
 * When you would use `prisma.$transaction()` instead:
 * - when the work is split across multiple separate Prisma queries
 * - for example: create ticket first, then create message second, then create audit event third
 *
 * Catch handling approach used here:
 * - rethrow known `ServiceError`s unchanged
 * - wrap unexpected database/runtime failures in one safe error for the caller
 */
export async function createTicket(actor: Actor, input: CreateTicketInput) {
  try {
    const ticket = await prisma.ticket.create({
      data: {
        title: input.title,
        createdByUserId: actor.id,
        messages: {
          create: {
            content: input.message,
            authorUserId: actor.id,
          },
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ticket;
  } catch (err) {
    if (err instanceof ServiceError) {
      throw err;
    }

    console.error("[createTicket] unexpected error", err);

    throw new ServiceError(
      "TICKET_CREATE_FAILED",
      "Failed to create ticket. Please try again.",
    );
  }
}

/**
 * TODO: Implement ticket listing.
 *
 * Goal:
 * - customer sees only their own tickets
 * - staff sees all tickets
 *
 * Suggested approach:
 * - use a conditional where clause based on actor.role
 * - order by updatedAt desc so the newest activity appears first
 * - keep the selected fields intentionally small for list views
 */
export async function listTickets(actor: Actor) {
  try {
    const whereClause = isStaff(actor) ? {} : { createdByUserId: actor.id };

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
    return tickets;
  } catch (err) {
    console.error("[listTickets] unexpected error", err);
    throw new ServiceError(
      "TICKET_LIST_FAILED",
      "Failed to load tickets. Please try again.",
    );
  }
}

/**
 * TODO: Implement single-ticket lookup.
 *
 * Goal:
 * - load one ticket and its message thread
 * - return NOT_FOUND when a customer asks for another customer's ticket
 *
 * Suggested approach:
 * - call ticketAccessFilter(actor, ticketId)
 * - include messages ordered by createdAt asc
 * - throw ServiceError("NOT_FOUND", ...) when Prisma returns null
 */

export async function getTicket(actor: Actor, ticketId: string) {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: ticketAccessFilter(actor, ticketId),
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    console.log("Ticket: ", ticket);

    if (!ticket) {
      throw new ServiceError("NOT_FOUND", "Ticket not found.");
    }

    return ticket;
  } catch (err) {
    if (err instanceof ServiceError) {
      throw err;
    }

    console.error("[getTicket] unexpected error", err);

    throw new ServiceError(
      "TICKET_FETCH_FAILED",
      "Failed to load the ticket. Please try again.",
    );
  }
}

/**
 * TODO: Implement reply posting.
 *
 * Goal:
 * - verify the actor may access the ticket
 * - create a new TicketMessage linked to that ticket
 *
 * Suggested approach:
 * - first load the ticket with ticketAccessFilter(actor, ticketId)
 * - decide whether CLOSED tickets should block replies
 * - insert the reply and consider whether the parent ticket should be touched to update timestamps
 */
export async function postReply(
  actor: Actor,
  ticketId: string,
  input: PostReplyInput,
) {
  void actor;
  void ticketId;
  void input;

  throw new ServiceError(
    "NOT_IMPLEMENTED",
    "postReply() still needs to be implemented.",
  );
}

/**
 * TODO: Implement ticket status changes.
 *
 * Goal:
 * - only staff can close or reopen tickets
 * - keep closedAt and closedByUserId consistent with the chosen status
 *
 * Suggested approach:
 * - keep the staff guard at the top of the function
 * - fetch the current ticket state before updating so you can compare old/new status
 * - when closing: set closedAt + closedByUserId
 * - when reopening: clear closedAt + closedByUserId
 */
export async function changeTicketStatus(
  actor: Actor,
  ticketId: string,
  nextStatus: TicketStatus,
) {
  void ticketId;
  void nextStatus;

  if (!canChangeTicketStatus(actor)) {
    throw new ServiceError(
      "FORBIDDEN",
      "You are not allowed to change ticket status.",
    );
  }

  throw new ServiceError(
    "NOT_IMPLEMENTED",
    "changeTicketStatus() still needs to be implemented.",
  );
}
