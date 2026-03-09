"use server";

import { type TicketStatus } from "@/app/generated/prisma/client";
import { ServiceError } from "@/lib/CustomErrors";
import { auth } from "@/lib/auth";
import {
  changeTicketStatus,
  createTicket,
  listTickets,
  postReply,
} from "@/lib/services/ticket";
import {
  ChangeStatusSchema,
  CreateTicketSchema,
  PostReplySchema,
} from "@/lib/validation/schemas";
import { isStaff, type Actor } from "../security/permissions";
import { revalidatePath } from "next/cache";

export type TicketActionResult = {
  success: boolean;
  error?: string;
  ticketId?: string;
  status?: TicketStatus;
};

export type ListTicketsResult = {
  success: boolean;
  error?: string;
  tickets?: Array<{
    id: string;
    title: string;
    status: TicketStatus;
    createdAt: Date;
  }>;
};

/**
 * Convert the authenticated session into the minimal actor shape used by the
 * service layer.
 *
 * Goal:
 * - keep NextAuth-specific types out of service functions
 * - make service calls easier to test later
 */
async function getActorAction(): Promise<Actor> {
  const session = await auth();

  if (!session?.user) {
    throw new ServiceError("UNAUTHENTICATED", "Please sign in first.");
  }

  return {
    id: session.user.id,
    role: session.user.role,
  };
}

/**
 * Boilerplate for ticket creation via Server Action.
 *
 * What you should implement next:
 * - decide whether to return field-level errors or one general message
 * - optionally revalidate the tickets list page after a successful mutation
 * - redirect to the new ticket detail page once createTicket() returns real data
 */
export async function createTicketAction(
  _prev: TicketActionResult,
  formData: FormData,
): Promise<TicketActionResult> {
  const parsed = CreateTicketSchema.safeParse({
    title: formData.get("title"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    if (parsed.error.issues.length > 1) {
      return {
        success: false,
        error: parsed.error.issues.map((issue) => issue.message).join(" "),
      };
    } else {
      return { success: false, error: parsed.error.issues[0].message };
    }
  }

  try {
    const actor = await getActorAction();
    const ticket = await createTicket(actor, parsed.data);

    // TODO: Check what to return here once createTicket() is implemented. The goal is to return enough
    // information for the UI to either refresh the list or redirect to the new ticket's detail page.

    return {
      success: true,
      ticketId:
        typeof ticket === "object" && ticket !== null && "id" in ticket
          ? String(ticket.id)
          : undefined,
    };
  } catch (err) {
    if (err instanceof ServiceError) {
      return { success: false, error: err.message };
    }

    console.error("[createTicketAction] unexpected error", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Ticket listing action.
 *
 * Goal:
 * - return the list of tickets the actor is allowed to see
 * - return only the fields needed for the list view, not the full ticket details
 * - optionally support pagination or sorting in the future
 *
 * Suggested approach:
 * - implement the access filter in ticketAccessFilter() and reuse it in getTicket()
 * - return a simplified ticket shape here, not the full Prisma model with messages
 * - throw ServiceError("TICKET_LIST_FETCH_FAILED", ...) on unexpected errors
 * - return an empty list when there are no tickets, don't throw an error
 */

export async function listTicketsAction(): Promise<ListTicketsResult> {
  try {
    const actor = await getActorAction();

    const tickets = await listTickets(actor);

    return { success: true, tickets };
  } catch (err) {
    if (err instanceof ServiceError) {
      return { success: false, error: err.message };
    }

    console.error("[listTicketsAction] unexpected error", err);
    return {
      success: false,
      error: "Unexpected error occurred. Please contact support.",
    };
  }
}

/**
 * Boilerplate for posting a reply to a ticket thread.
 *
 * What you should implement next:
 * - revalidate the ticket detail page after success
 * - return enough information for the UI to refresh or redirect cleanly
 */
export async function postReplyAction(
  ticketId: string,
  _prev: TicketActionResult,
  formData: FormData,
): Promise<TicketActionResult> {
  const parsed = PostReplySchema.safeParse({
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = await getActorAction();
    await postReply(actor, ticketId, parsed.data);

    // Revalidate the ticket detail page to show the new reply.
    revalidatePath(`/tickets/${ticketId}`);

    return { success: true, ticketId };
  } catch (err) {
    if (err instanceof ServiceError) {
      return { success: false, error: err.message };
    }

    console.error("[postReplyAction] unexpected error", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Boilerplate for the staff-only status toggle.
 *
 * What you should implement next:
 * - connect the calling UI to this action
 * - decide whether the UI should optimistically update or wait for the server response
 */
export async function changeTicketStatusAction(
  ticketId: string,
  nextStatus: TicketStatus,
  _prev: TicketActionResult,
  _formData: FormData,
): Promise<TicketActionResult> {
  const parsed = ChangeStatusSchema.safeParse({ status: nextStatus });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = await getActorAction();
    await changeTicketStatus(actor, ticketId, parsed.data.status);
    revalidatePath(`/tickets/${ticketId}`);
    return { success: true, ticketId, status: parsed.data.status };
  } catch (err) {
    if (err instanceof ServiceError) {
      return { success: false, error: err.message };
    }

    console.error("[changeTicketStatusAction] unexpected error", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
