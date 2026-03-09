import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ReplyForm from "./ReplyForm";
import { requireActor } from "@/lib/security/requireActor";
import { getTicket } from "@/lib/services/ticket";
import {
  canChangeTicketStatus,
  canReadTicket,
} from "@/lib/security/permissions";
import { notFound } from "next/navigation";

type TicketDetailPageParams = {
  params: Promise<{ id: string }>;
};

export default async function TicketDetailPage({
  params,
}: TicketDetailPageParams) {
  const actor = await requireActor();

  const { id } = await params;

  // TODO:
  // `getTicket()` is the main access-control boundary for this page.
  // The intended behavior is:
  // - staff can fetch any ticket by id
  // - customers only get a result when the ticket belongs to them
  // - non-existent / unauthorized tickets should resolve to a 404-style outcome
  //
  // Suggested approach:
  // - keep the ownership filter inside the service query
  // - catch a NOT_FOUND-style service error here and call `notFound()`
  // - avoid showing a generic crash page for expected access denials

  const ticket = await getTicket(actor, id);

  // NOTE:
  // This extra permission check is probably redundant once `getTicket()` is trusted
  // to enforce ownership correctly. Keeping it is harmless as a defensive check,
  // but the service query should remain the real security boundary.

  const ticketPermContext = {
    createdByUserId: ticket.createdByUserId,
    status: ticket.status,
  };

  if (!canReadTicket(actor, ticketPermContext)) {
    notFound();
  }

  function handleStatusChange(newStatus: "OPEN" | "CLOSED") {
    // TODO: PATCH /api/tickets/[id]
    // console.log("Change status of", params.id, "to", newStatus);
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
              {ticket.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Opened by {ticket.createdBy.email} on{" "}
              {new Date(ticket.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={ticket.status === "OPEN" ? "default" : "secondary"}>
              {ticket.status}
            </Badge>

            {/*
              Status toggle guidance:
              - simplest approach: keep this page server-rendered and submit a small
                `<form action={...}>` to a Server Action that changes the status
              - use a dedicated client component only if you want local pending state,
                optimistic UI, or richer interaction than a basic form submit
              - server-side authorization must still live in `changeTicketStatus()`
            */}
            {canChangeTicketStatus(actor) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleStatusChange(
                    ticket.status === "OPEN" ? "CLOSED" : "OPEN",
                  )
                }
              >
                {ticket.status === "OPEN" ? "Close Ticket" : "Reopen Ticket"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Message thread */}
      <div className="space-y-4">
        {ticket.messages.map((msg) => (
          <Card key={msg.id} className="gap-4">
            <CardHeader className="pb-1">
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

      <ReplyForm />
    </div>
  );
}
