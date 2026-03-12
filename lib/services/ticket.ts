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
import { logAuditEvent, toLogAuditEventInput } from "./audit";
import { RequestAuditContext } from "../request-audit";

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

    // Future audit hook: record TICKET_CREATED after the write succeeds.
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

export async function getTicket(
  actor: Actor,
  ticketId: string,
  requestAuditContext?: RequestAuditContext,
) {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: ticketAccessFilter(actor, ticketId),
      // For testing the audit log behavior, we intentionally bypass the ownership filter here and handle it manually in the code to be able to log forbidden access attempts for existing tickets.
      // where: { id: ticketId },
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

    if (!ticket) {
      // Check if ticket exists at all without the ownership filter to determine if this is a "not found" vs "forbidden" case. We want to return 404 in both cases to avoid leaking information about the existence of the ticket.

      const ticketExists = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (ticketExists) {
        // record a FORBIDDEN_ACTION_ATTEMPT in the audit log for existing tickets to monitor potential unauthorized access attempts, but don't reveal the existence of the ticket in the response.

        await logAuditEvent(
          toLogAuditEventInput({
            action: "FORBIDDEN_ACTION_ATTEMPT",
            actorUserId: actor.id,
            target: { type: "Ticket", id: ticketId },
            meta: {
              endpoint: requestAuditContext?.endpoint ?? "ticket.getTicket",
              sourceIp: requestAuditContext?.sourceIp ?? "unknown",
              userAgent: requestAuditContext?.userAgent,
              reason: "ticket_read_denied_not_owner",
            },
          }),
        );
      }

      throw new ServiceError("NOT_FOUND", "Ticket not found.");
    }

    // console.log("Pitäis tulla", ticket);
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

export async function postReply(
  actor: Actor,
  ticketId: string,
  input: PostReplyInput,
  requestAuditContext?: RequestAuditContext,
) {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: ticketAccessFilter(actor, ticketId),
    });

    if (!ticket) {
      // Check if ticket exists at all without the ownership filter to determine if this is a "not found" vs "forbidden" case. We want to return 404 in both cases to avoid leaking information about the existence of the ticket.

      const ticketExists = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (ticketExists) {
        await logAuditEvent(
          toLogAuditEventInput({
            action: "FORBIDDEN_ACTION_ATTEMPT",
            actorUserId: actor.id,
            target: { type: "Ticket", id: ticketId },
            meta: {
              endpoint: requestAuditContext?.endpoint ?? "ticket.postReply",
              sourceIp: requestAuditContext?.sourceIp ?? "unknown",
              userAgent: requestAuditContext?.userAgent,
              reason: "ticket_reply_denied_not_owner",
            },
          }),
        );
      }

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

    // Future audit hook: record TICKET_REPLY_POSTED once the audit service is wired.
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
}

export async function changeTicketStatus(
  actor: Actor,
  ticketId: string,
  nextStatus: TicketStatus,
  requestAuditContext?: RequestAuditContext,
) {
  if (!canChangeTicketStatus(actor)) {
    await logAuditEvent(
      toLogAuditEventInput({
        action: "FORBIDDEN_ACTION_ATTEMPT",
        actorUserId: actor.id,
        target: { type: "Ticket", id: ticketId },
        meta: {
          endpoint:
            requestAuditContext?.endpoint ?? "ticket.changeTicketStatus",
          sourceIp: requestAuditContext?.sourceIp ?? "unknown",
          userAgent: requestAuditContext?.userAgent,
          reason: "staff_required_to_change_status",
        },
      }),
    );

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

    return stats;
  } catch (err) {
    console.error("[getTicketStats] unexpected error", err);
    throw new ServiceError(
      "STATS_FETCH_FAILED",
      "Failed to fetch ticket stats. Please try again.",
    );
  }
}
