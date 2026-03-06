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

// TODO: replace with real session / data fetching
const MOCK_USER = {
  name: "Demo User",
  role: "CUSTOMER" as "CUSTOMER" | "STAFF",
};

const MOCK_STATS = {
  openTickets: 3,
  closedTickets: 7,
  totalTickets: 10,
};

export default function DashboardPage() {
  const isStaff = MOCK_USER.role === "STAFF";

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {MOCK_USER.name}{" "}
          <Badge variant="secondary">{MOCK_USER.role}</Badge>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Tickets</CardDescription>
            <CardTitle className="text-4xl">{MOCK_STATS.openTickets}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Closed Tickets</CardDescription>
            <CardTitle className="text-4xl">
              {MOCK_STATS.closedTickets}
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
              {MOCK_STATS.totalTickets}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/tickets/new">Create New Ticket</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tickets">View All Tickets</Link>
        </Button>
        {isStaff && (
          <Button variant="outline" asChild>
            <Link href="/admin/audit">Audit Log</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
