import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createRequestAuditContext } from "@/lib/request-audit";
import { canReadAuditLog } from "@/lib/security/permissions";
import { requireActor } from "@/lib/security/requireActor";
import { type AuditLogListItem } from "@/lib/types/audit";
import {
  listAuditEvents,
  logAuditEvent,
  toLogAuditEventInput,
} from "@/lib/services/audit";

const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN_FAILED: "Login Failed",
  FORBIDDEN_ACTION_ATTEMPT: "Forbidden",
  RATE_LIMIT_TRIGGERED: "Rate Limited",
  TICKET_CREATED: "Ticket Created",
  TICKET_REPLY_POSTED: "Reply Posted",
  TICKET_STATUS_CHANGED: "Status Changed",
};

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

type AuditEventDetailPageParams = {
  params: Promise<{ id: string }>;
};

function formatActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatTarget(event: AuditLogListItem | null): string {
  if (!event?.targetType) {
    return "No target";
  }

  return event.targetId
    ? `${event.targetType} ${event.targetId}`
    : event.targetType;
}

function buildMetaPreview(event: AuditLogListItem | null): string {
  if (!event) {
    return JSON.stringify(
      {
        endpoint: "/admin/audit/[id]",
        reason: "detail_mockup_placeholder",
      },
      null,
      2,
    );
  }

  return JSON.stringify(event.meta, null, 2);
}

function getRequestContextRows(event: AuditLogListItem | null) {
  return [
    {
      label: "Endpoint",
      value:
        typeof event?.meta.endpoint === "string" ? event.meta.endpoint : "—",
    },
    {
      label: "Source IP",
      value:
        typeof event?.meta.sourceIp === "string" ? event.meta.sourceIp : "—",
    },
    {
      label: "User Agent",
      value:
        typeof event?.meta.userAgent === "string" ? event.meta.userAgent : "—",
    },
  ];
}

export default async function AuditEventDetailPage({
  params,
}: AuditEventDetailPageParams) {
  const actor = await requireActor();
  const { id } = await params;

  if (!canReadAuditLog(actor)) {
    const headerStore = await headers();
    const requestAuditContext = createRequestAuditContext(
      `/admin/audit/${id}`,
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
          reason: "audit_event_detail_access_attempt",
        },
      }),
    );

    return notFound();
  }

  const auditEvents = await listAuditEvents(actor, { limit: 100 });
  const event = auditEvents.find((candidate) => candidate.id === id) ?? null;
  const requestContextRows = getRequestContextRows(event);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/audit"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back to audit log
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Audit Event Detail
          </h1>
          <p className="text-muted-foreground">
            Mock detail layout for a single audit event.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/admin/audit">Return to list</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all">{id}</span>
            <Badge
              variant={ACTION_VARIANTS[event?.action ?? "outline"] ?? "outline"}
            >
              {formatActionLabel(event?.action ?? "FORBIDDEN_ACTION_ATTEMPT")}
            </Badge>
          </CardTitle>
          <CardDescription>
            {event
              ? "This preview reuses the current audit list read model until a dedicated detail query is implemented."
              : "This is a layout-only placeholder because the event was not found in the current list query."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Time
            </p>
            <p className="text-sm">
              {event ? new Date(event.createdAt).toLocaleString() : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reason
            </p>
            <p className="text-sm">{event?.reason ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Actor
            </p>
            <p className="text-sm break-all">{event?.actorEmail ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Target
            </p>
            <p className="text-sm break-all">{formatTarget(event)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Request Context</CardTitle>
            <CardDescription>
              Core request-derived metadata surfaced separately from the raw
              JSON payload.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requestContextRows.map((row) => (
              <div key={row.label} className="space-y-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {row.label}
                  </p>
                  <p className="text-sm break-all">{row.value}</p>
                </div>
                <Separator />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mockup Notes</CardTitle>
            <CardDescription>
              This page is intentionally a mockup, not the final read path.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The final version should load a single audit event by id instead
              of scanning the list view model.
            </p>
            <p>
              The main audit table can stay compact while this page shows the
              full structured payload.
            </p>
            <p>
              Future refinements can add linked targets, richer field
              formatting, and investigator notes if needed.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raw Metadata</CardTitle>
          <CardDescription>
            Full metadata preview for the future detail view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">
            {buildMetaPreview(event)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
