"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postReplyAction } from "@/lib/actions/tickets";
import { type TicketActionResult } from "@/lib/types/tickets";
import { useActionState, useEffect, useState } from "react";

let initialState: TicketActionResult = { success: false };

type ReplyFormProps = {
  ticketId: string;
  isClosed?: boolean;
};

export default function ReplyForm({
  ticketId,
  isClosed = false,
}: ReplyFormProps) {
  const [reply, setReply] = useState("");

  const actionTicketWithId = postReplyAction.bind(null, ticketId);

  const [state, formAction, isPending] = useActionState(
    actionTicketWithId,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      setReply("");
    }
  }, [state.success, ticketId]);

  return (
    <>
      <form action={formAction} className="space-y-3">
        <Textarea
          name="content"
          placeholder="Write your reply..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={2000}
          rows={4}
          required
          disabled={isClosed || isPending}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{reply.length}/2000</p>
          <Button type="submit" disabled={isClosed || isPending}>
            {isPending ? "Posting reply…" : "Post Reply"}
          </Button>
        </div>
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </form>
    </>
  );
}
