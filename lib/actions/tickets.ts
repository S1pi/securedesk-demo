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
import {
  type ListTicketsResult,
  type TicketActionResult,
} from "@/lib/types/tickets";
import { type Actor } from "../security/permissions";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createRequestAuditContext } from "../request-audit";

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
 * - redirect to the new ticket detail page instead of the tickets list
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

    return {
      success: true,
      ticketId: ticket.id,
    };
  } catch (err) {
    if (err instanceof ServiceError) {
      return { success: false, error: err.message };
    }

    console.error("[createTicketAction] unexpected error", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

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

    const headersStore = await headers();

    const requestAuditContext = createRequestAuditContext(
      "ticket.postReplyAction",
      headersStore,
    );

    await postReply(actor, ticketId, parsed.data, requestAuditContext);

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

    const headersStore = await headers();

    const requestAuditContext = createRequestAuditContext(
      "ticket.changeTicketStatusAction",
      headersStore,
    );

    await changeTicketStatus(
      actor,
      ticketId,
      parsed.data.status,
      requestAuditContext,
    );
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
