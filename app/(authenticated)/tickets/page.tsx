import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// TODO: replace with real data from API / server action (Also create types for Ticket and User)
const MOCK_TICKETS = [
  {
    id: "tkt_1",
    title: "Cannot reset my password",
    status: "OPEN" as const,
    createdBy: "alice@example.com",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-02T14:30:00Z",
  },
  {
    id: "tkt_2",
    title: "Billing question about last invoice",
    status: "OPEN" as const,
    createdBy: "bob@example.com",
    createdAt: "2026-03-02T08:15:00Z",
    updatedAt: "2026-03-03T09:00:00Z",
  },
  {
    id: "tkt_3",
    title: "Feature request: dark mode",
    status: "CLOSED" as const,
    createdBy: "alice@example.com",
    createdAt: "2026-02-20T16:45:00Z",
    updatedAt: "2026-02-25T11:00:00Z",
  },
];

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">
            View and manage support tickets
          </p>
        </div>
        <Button asChild>
          <Link href="/tickets/new">New Ticket</Link>
        </Button>
      </div>

      {/* Ticket list table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_TICKETS.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="font-medium hover:underline"
                  >
                    {ticket.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={ticket.status === "OPEN" ? "default" : "secondary"}
                  >
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {ticket.createdBy}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(ticket.updatedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}

            {MOCK_TICKETS.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No tickets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
