import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { canReadAuditLog } from "@/lib/security/permissions";
import { requireActor } from "@/lib/security/requireActor";
import { type AuditLogListItem } from "@/lib/types/audit";
import { notFound } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { headers } from "next/headers";
import { createRequestAuditContext } from "@/lib/request-audit";
import {
  listAuditEvents,
  logAuditEvent,
  toLogAuditEventInput,
} from "@/lib/services/audit";
import { Button } from "@/components/ui/button";

const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN_FAILED: "Login Failed",
  FORBIDDEN_ACTION_ATTEMPT: "Forbidden",
  RATE_LIMIT_TRIGGERED: "Rate Limited",
  TICKET_CREATED: "Ticket Created",
  TICKET_REPLY_POSTED: "Reply Posted",
  TICKET_STATUS_CHANGED: "Status Changed",
};

function formatActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatTarget(event: AuditLogListItem): string {
  if (!event.targetType) {
    return "—";
  }

  return event.targetId
    ? `${event.targetType} ${event.targetId}`
    : event.targetType;
}

function formatMetaValue(value: AuditLogListItem["meta"][string]): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? "[]" : `[${value.length} items]`;
  }

  return "{...}";
}

function formatMetaSummary(meta: AuditLogListItem["meta"]): string {
  const entries = Object.entries(meta).filter(([key]) => key !== "reason");

  if (entries.length === 0) {
    return "—";
  }

  const preview = entries
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${formatMetaValue(value)}`)
    .join(" | ");

  return entries.length > 2
    ? `${preview} | +${entries.length - 2} more`
    : preview;
}

// Action variants for visual emphasis in the UI. Adjust as needed.
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

export default async function AuditLogPage() {
  const actor = await requireActor();

  if (!canReadAuditLog(actor)) {
    // Audit forbidden attempts to access the audit log, even though the page will also be protected by a server-side check. This is a security-sensitive action worth recording.
    const headerStore = await headers();

    const requestAuditContext = createRequestAuditContext(
      "/admin/audit",
      headerStore,
    );

    await logAuditEvent(
      toLogAuditEventInput({
        action: "FORBIDDEN_ACTION_ATTEMPT",
        actorUserId: actor.id,
        meta: {
          endpoint: requestAuditContext.endpoint,
          sourceIp: requestAuditContext.sourceIp ?? "unknown",
          userAgent: requestAuditContext.userAgent,
          reason: "admin_area_access_attempt",
        },
      }),
    );
    return notFound();
  }

  const auditEvents = await listAuditEvents(actor);

  // TODO: when the detail view becomes real, consider whether the main list should
  // show even less inline context and rely more heavily on the detail page.

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Security-critical events (staff only)
        </p>
      </div>

      <div className="rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28 whitespace-normal sm:w-36">
                Time
              </TableHead>
              <TableHead className="w-28 whitespace-normal sm:w-36 lg:w-40">
                Action
              </TableHead>
              <TableHead className="whitespace-normal">Reason</TableHead>
              <TableHead className="hidden whitespace-normal md:table-cell">
                Actor
              </TableHead>
              <TableHead className="hidden whitespace-normal lg:table-cell">
                Target
              </TableHead>
              <TableHead className="hidden whitespace-normal xl:table-cell">
                Context
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="text-sm align-top whitespace-normal wrap-break-word">
                  {new Date(event.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="align-center whitespace-normal wrap-break-word">
                  <Badge
                    variant={ACTION_VARIANTS[event.action] ?? "outline"}
                    className="max-w-full whitespace-nowrap text-center leading-tight"
                  >
                    {formatActionLabel(event.action)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground align-top whitespace-normal wrap-break-word">
                  {event.reason ?? "—"}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground align-top whitespace-normal wrap-break-word md:table-cell">
                  {event.actorEmail ?? "—"}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground align-top whitespace-normal wrap-break-word lg:table-cell">
                  {formatTarget(event)}
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground font-mono align-top xl:table-cell">
                  <div className="max-w-[16rem] truncate whitespace-nowrap">
                    {formatMetaSummary(event.meta)}
                  </div>
                </TableCell>
                <TableCell className="text-right align-top">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/audit/${event.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {auditEvents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
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
