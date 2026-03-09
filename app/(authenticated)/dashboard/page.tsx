import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isStaff } from "@/lib/security/permissions";
import { requireActor } from "@/lib/security/requireActor";
import { getTicketStats } from "@/lib/services/ticket";
import { ServiceError } from "@/lib/CustomErrors";
import { type TicketStats } from "@/lib/types/tickets";

export default async function DashboardPage() {
  const actor = await requireActor({ includeEmail: true });

  let ticketStats: TicketStats | undefined;
  let ticketStatsErrorMsg;

  try {
    ticketStats = await getTicketStats(actor);
  } catch (err) {
    console.error("Failed to fetch ticket stats for dashboard", err);
    if (err instanceof ServiceError && err.code === "STATS_FETCH_FAILED") {
      // Handle the specific error case
      ticketStatsErrorMsg =
        "Failed to load ticket statistics. Please try again later or contact support if the issue persists.";
    } else {
      // Handle unexpected errors
      ticketStatsErrorMsg =
        "An unexpected error occurred while loading ticket statistics. Please try again later or contact support if the issue persists.";
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {actor.email}{" "}
          <Badge variant="secondary">{actor.role}</Badge>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ticketStatsErrorMsg ? (
          <div className="p-4 bg-destructive text-destructive-foreground rounded">
            <p className="text-sm">{ticketStatsErrorMsg}</p>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Open Tickets</CardDescription>
                <CardTitle className="text-4xl">
                  {ticketStats?.openTickets}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Awaiting response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Closed Tickets</CardDescription>
                <CardTitle className="text-4xl">
                  {ticketStats?.closedTickets}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Tickets</CardDescription>
                <CardTitle className="text-4xl">
                  {ticketStats?.totalTickets}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/tickets/new">Create New Ticket</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tickets">View All Tickets</Link>
        </Button>
        {isStaff(actor) && (
          <Button variant="outline" asChild>
            <Link href="/admin/audit">Audit Log</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
