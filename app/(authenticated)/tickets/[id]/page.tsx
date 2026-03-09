import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ReplyForm from "./ReplyForm";
import StatusChangeButton from "./StatusChangeButton";
import { requireActor } from "@/lib/security/requireActor";
import { getTicket } from "@/lib/services/ticket";
import {
  canChangeTicketStatus,
  canReadTicket,
} from "@/lib/security/permissions";
import { notFound } from "next/navigation";
import { ServiceError } from "@/lib/CustomErrors";

type TicketDetailPageParams = {
  params: Promise<{ id: string }>;
};

export default async function TicketDetailPage({
  params,
}: TicketDetailPageParams) {
  const actor = await requireActor();

  const { id: ticketId } = await params;

  let ticket;

  try {
    ticket = await getTicket(actor, ticketId);
  } catch (err) {
    if (err instanceof ServiceError && err.code === "NOT_FOUND") {
      return notFound();
    }

    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        <Link href="/tickets" className="text-sm text-blue-500 hover:underline">
          &larr; Back to tickets
        </Link>
        <p className="text-sm">
          An unexpected error occurred while loading the ticket. Please try
          again later or contact support if the issue persists.
        </p>
      </div>
    );
  }

  // NOTE:
  // This extra permission check is probably redundant once `getTicket()` is trusted
  // to enforce ownership correctly. Keeping it is harmless as a defensive check,
  // but the service query should remain the real security boundary.
  // We keep it as defence in depth in case of future changes to the service layer, and to avoid accidentally exposing ticket data in the UI if the service layer check is bypassed or removed by mistake.

  const ticketPermContext = {
    createdByUserId: ticket.createdByUserId,
    status: ticket.status,
  };

  if (!canReadTicket(actor, ticketPermContext)) {
    return notFound();
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

            {canChangeTicketStatus(actor) && (
              <StatusChangeButton
                ticketId={ticketId}
                currentStatus={ticket.status}
              />
            )}

            {/* For testing purposes only to check authorization  */}
            {/* <StatusChangeButton
              ticketId={ticketId}
              currentStatus={ticket.status}
            /> */}
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

      <ReplyForm ticketId={ticketId} isClosed={ticket.status === "CLOSED"} />
    </div>
  );
}
