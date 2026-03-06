import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// TODO: replace with real data from API (staff-only endpoint)
const MOCK_AUDIT_EVENTS = [
  {
    id: "evt_1",
    action: "AUTH_LOGIN_FAILED",
    actorEmail: "unknown@example.com",
    targetType: null,
    targetId: null,
    meta: { endpoint: "/api/auth/callback/credentials" },
    createdAt: "2026-03-01T08:00:00Z",
  },
  {
    id: "evt_2",
    action: "TICKET_CREATED",
    actorEmail: "alice@example.com",
    targetType: "Ticket",
    targetId: "tkt_1",
    meta: {},
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "evt_3",
    action: "TICKET_REPLY_POSTED",
    actorEmail: "staff@securedesk.com",
    targetType: "TicketMessage",
    targetId: "msg_2",
    meta: { ticketId: "tkt_1" },
    createdAt: "2026-03-02T14:30:00Z",
  },
  {
    id: "evt_4",
    action: "TICKET_STATUS_CHANGED",
    actorEmail: "staff@securedesk.com",
    targetType: "Ticket",
    targetId: "tkt_3",
    meta: { from: "OPEN", to: "CLOSED" },
    createdAt: "2026-03-03T09:00:00Z",
  },
  {
    id: "evt_5",
    action: "FORBIDDEN_ACTION_ATTEMPT",
    actorEmail: "bob@example.com",
    targetType: "Ticket",
    targetId: "tkt_1",
    meta: { endpoint: "/api/tickets/tkt_1", reason: "not owner" },
    createdAt: "2026-03-04T11:30:00Z",
  },
  {
    id: "evt_6",
    action: "RATE_LIMIT_TRIGGERED",
    actorEmail: "bob@example.com",
    targetType: null,
    targetId: null,
    meta: { endpoint: "/api/tickets" },
    createdAt: "2026-03-04T11:31:00Z",
  },
];

const ACTION_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  AUTH_LOGIN_FAILED: "destructive",
  FORBIDDEN_ACTION_ATTEMPT: "destructive",
  RATE_LIMIT_TRIGGERED: "destructive",
  TICKET_CREATED: "default",
  TICKET_REPLY_POSTED: "secondary",
  TICKET_STATUS_CHANGED: "outline",
};

export default function AuditLogPage() {
  // TODO: enforce staff-only access via session check

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Security-critical events (staff only)
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Meta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_AUDIT_EVENTS.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={ACTION_VARIANTS[event.action] ?? "outline"}>
                    {event.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {event.actorEmail ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {event.targetType
                    ? `${event.targetType} ${event.targetId}`
                    : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono max-w-xs truncate">
                  {Object.keys(event.meta).length > 0
                    ? JSON.stringify(event.meta)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}

            {MOCK_AUDIT_EVENTS.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No audit events found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
