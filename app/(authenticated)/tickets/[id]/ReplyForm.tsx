"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function ReplyForm() {
  const [reply, setReply] = useState("");

  // TODO:
  // This should become a small mutation component for posting replies.
  //
  // Suggested implementation:
  // - accept `ticketId` as a prop from the server page
  // - use a Server Action such as `postReplyAction(ticketId, ...)`
  // - keep local state only for the textarea value / pending UI
  // - make sure the textarea has `name="content"` so FormData + Zod can read it
  // - optionally accept `disabled` or `isClosed` as props so CLOSED tickets can block replies in the UI
  //
  // Validation and authorization must still be enforced on the server side even if
  // the UI disables the form.
  function handleReply(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO:
    // Replace this temporary client-only handler with a Server Action based submit flow.
    // For example, the form can use `action={formAction}` from `useActionState`, or
    // a plain `<form action={...}>` if you do not need client-managed pending state.
    setReply("");
  }

  return (
    <>
      {/*
        Reply form note:
        this component is the right place for interactive form state, but not for
        data fetching or permission decisions. The parent server page should load the
        ticket, and this component should only handle the reply submission UX.
      */}
      <form onSubmit={handleReply} className="space-y-3">
        <Textarea
          name="content"
          placeholder="Write your reply..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={2000}
          rows={4}
          required
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{reply.length}/2000</p>
          <Button type="submit">Post Reply</Button>
        </div>
      </form>
    </>
  );
}
