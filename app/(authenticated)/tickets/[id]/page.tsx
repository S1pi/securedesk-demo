"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

// TODO: replace with real data from API
const MOCK_TICKET = {
  id: "tkt_1",
  title: "Cannot reset my password",
  status: "OPEN" as const,
  createdBy: { email: "alice@example.com" },
  createdAt: "2026-03-01T10:00:00Z",
};

const MOCK_MESSAGES = [
  {
    id: "msg_1",
    author: { email: "alice@example.com", role: "CUSTOMER" as const },
    content:
      "I tried resetting my password three times and the link in the email always says expired. Can you help?",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "msg_2",
    author: { email: "staff@securedesk.com", role: "STAFF" as const },
    content:
      "Hi Alice, I've manually reset your password. Please check your inbox for the new link — it should be valid for 24 hours.",
    createdAt: "2026-03-02T14:30:00Z",
  },
];

// TODO: replace with real session
const MOCK_USER = { role: "CUSTOMER" as "CUSTOMER" | "STAFF" };

// TODO: Ensure this page is protected and only accessible to authenticated users. Also implement proper authorization checks to ensure customers can only access and see their own tickets and staff can access all tickets.

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [reply, setReply] = useState("");

  const isStaff = MOCK_USER.role === "STAFF";

  // TODO: React.FormEvent is deprecated, replace with correct handler type (Check if React.SubmitEvent or similar is available in your React version)
  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST to /api/tickets/[id]/messages
    console.log("Post reply to", params.id, ":", reply);
    setReply("");
  }

  function handleStatusChange(newStatus: "OPEN" | "CLOSED") {
    // TODO: PATCH /api/tickets/[id]
    console.log("Change status of", params.id, "to", newStatus);
  }

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/tickets"
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to tickets
        </Link>

        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {MOCK_TICKET.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Opened by {MOCK_TICKET.createdBy.email} on{" "}
              {new Date(MOCK_TICKET.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={MOCK_TICKET.status === "OPEN" ? "default" : "secondary"}
            >
              {MOCK_TICKET.status}
            </Badge>

            {/* Staff-only status toggle */}
            {isStaff && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleStatusChange(
                    MOCK_TICKET.status === "OPEN" ? "CLOSED" : "OPEN",
                  )
                }
              >
                {MOCK_TICKET.status === "OPEN"
                  ? "Close Ticket"
                  : "Reopen Ticket"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Message thread */}
      <div className="space-y-4">
        {MOCK_MESSAGES.map((msg) => (
          <Card key={msg.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  {msg.author.email}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {msg.author.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Reply form */}
      <form onSubmit={handleReply} className="space-y-3">
        <Textarea
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
    </div>
  );
}
