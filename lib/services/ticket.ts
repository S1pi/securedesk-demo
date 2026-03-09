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
import { type TicketListItem, type TicketStats } from "@/lib/types/tickets";

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
 * Ticket listing with access control.
 *
 */
export async function listTickets(actor: Actor): Promise<TicketListItem[]> {
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
        createdBy: {
          select: {
            email: true,
          },
        },
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

    // console.log("Ticket: ", ticket);

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

  try {
    const ticket = await prisma.ticket.findFirst({
      where: ticketAccessFilter(actor, ticketId),
    });

    if (!ticket) {
      throw new ServiceError("NOT_FOUND", "Ticket not found.");
    }

    if (ticket.status === "CLOSED") {
      throw new ServiceError(
        "TICKET_CLOSED",
        "Cannot post a reply to a closed ticket.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorUserId: actor.id,
          content: input.content,
        },
      });

      // Update the parent ticket's updatedAt to reflect new activity
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });
    });

    // For debugging
    // console.log("Reply created: ", reply);
    // return reply;
  } catch (err) {
    if (err instanceof ServiceError) {
      throw err;
    }

    console.error("[postReply] unexpected error", err);
    throw new ServiceError(
      "REPLY_POST_FAILED",
      "Failed to post the reply. Please try again.",
    );
  }

  // throw new ServiceError(
  //   "NOT_IMPLEMENTED",
  //   "postReply() still needs to be implemented.",
  // );
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
  if (!canChangeTicketStatus(actor)) {
    throw new ServiceError(
      "FORBIDDEN",
      "You are not allowed to change ticket status.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });

      if (!ticket) {
        throw new ServiceError("NOT_FOUND", "Ticket not found.");
      }

      if (ticket.status === nextStatus) {
        // No change needed
        return;
      }

      if (nextStatus === "CLOSED") {
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: "CLOSED",
            closedAt: new Date(),
            closedByUserId: actor.id,
          },
        });
      } else {
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: "OPEN",
            closedAt: null,
            closedByUserId: null,
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      throw err;
    }

    console.error("[changeTicketStatus] unexpected error", err);
    throw new ServiceError(
      "STATUS_CHANGE_FAILED",
      "Failed to change ticket status. Please try again.",
    );
  }
}

export async function getTicketStats(actor: Actor): Promise<TicketStats> {
  try {
    const whereClause = isStaff(actor) ? {} : { createdByUserId: actor.id };
    const [totalTickets, openTickets, closedTickets] = await Promise.all([
      prisma.ticket.count({ where: whereClause }),
      prisma.ticket.count({ where: { ...whereClause, status: "OPEN" } }),
      prisma.ticket.count({ where: { ...whereClause, status: "CLOSED" } }),
    ]);
    const stats = { totalTickets, openTickets, closedTickets };

    // For testing error handling in the UI:
    // throw new ServiceError(
    //   "STATS_FETCH_FAILED",
    //   "Failed to fetch ticket stats. Please try again.",
    // );

    return stats;
  } catch (err) {
    console.error("[getTicketStats] unexpected error", err);
    throw new ServiceError(
      "STATS_FETCH_FAILED",
      "Failed to fetch ticket stats. Please try again.",
    );
  }
}
