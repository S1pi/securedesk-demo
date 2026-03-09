"use client";

import { type TicketStatus } from "@/app/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  changeTicketStatusAction,
  type TicketActionResult,
} from "@/lib/actions/tickets";
import { useActionState } from "react";

const initialState: TicketActionResult = { success: false };

type StatusChangeButtonProps = {
  ticketId: string;
  currentStatus: TicketStatus;
};

export default function StatusChangeButton({
  ticketId,
  currentStatus,
}: StatusChangeButtonProps) {
  const nextStatus: TicketStatus =
    currentStatus === "OPEN" ? "CLOSED" : "OPEN";

  const boundAction = changeTicketStatusAction.bind(null, ticketId, nextStatus);

  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState,
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={formAction}>
        <Button variant="outline" size="sm" type="submit" disabled={isPending}>
          {isPending
            ? currentStatus === "OPEN"
              ? "Closing..."
              : "Reopening..."
            : currentStatus === "OPEN"
              ? "Close Ticket"
              : "Reopen Ticket"}
        </Button>
      </form>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}