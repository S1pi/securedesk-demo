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
  getAuditEventById,
  logAuditEvent,
  toLogAuditEventInput,
} from "@/lib/services/audit";
import { ServiceError } from "@/lib/CustomErrors";

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
        target: { type: "AuditEvent", id },
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

  let auditEvent: AuditLogListItem | null = null;
  try {
    auditEvent = await getAuditEventById(actor, id);
  } catch (err) {
    console.error("[AuditEventDetailPage] error loading audit event", err);
    if (err instanceof ServiceError && err.code === "FORBIDDEN") {
      return notFound();
    }
  }

  // If the event can't be loaded for any reason (not found, invalid ID format, etc), we still want to show the page skeleton with placeholders, rather than an error page. This is because the most likely reason for an error is that the ID is invalid or the event has been deleted, and in both cases we want to show the same "event not found" UI.
  if (!auditEvent) {
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
              Detail view for a single audit event.
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="break-all">Event ID: {id}</span>
              <Badge variant="outline">Event not found</Badge>
            </CardTitle>
            <CardDescription>
              We couldn't load the details for this event. It may have been
              deleted or the ID may be invalid.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const requestContextRows = getRequestContextRows(auditEvent);

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
            Detail view for a single audit event.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/admin/audit">Return to list</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all">Event ID: {id}</span>
            <Badge
              variant={
                ACTION_VARIANTS[auditEvent?.action ?? "outline"] ?? "outline"
              }
            >
              {formatActionLabel(
                auditEvent?.action ?? "FORBIDDEN_ACTION_ATTEMPT",
              )}
            </Badge>
          </CardTitle>
          <CardDescription>
            {auditEvent
              ? "Structured metadata for this audit event."
              : "Loading... (this is a mockup, not the final detail page)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Time
            </p>
            <p className="text-sm">
              {auditEvent
                ? new Date(auditEvent.createdAt).toLocaleString()
                : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reason
            </p>
            <p className="text-sm">{auditEvent?.reason ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Actor
            </p>
            <p className="text-sm break-all">{auditEvent?.actorEmail ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Target
            </p>
            <p className="text-sm break-all">{formatTarget(auditEvent)}</p>
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
              Notes and ideas for the final design of this page. The current
              content is just a placeholder to help visualize the layout and
              structure of the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This page is a starting point for the audit event detail view. It
              is not the final design, but it includes the key pieces of
              information that we want to surface for each audit event.
            </p>
            <p>
              The main goal of this page is to provide enough context for
              investigating security incidents. The request context section is
              especially important for this, as it surfaces critical information
              about the request that triggered the event in a structured and
              easily digestible format.
            </p>
            <p>
              The raw metadata section is also important, as it allows
              investigators to see the full JSON payload for the event. This can
              be useful for debugging and to verify that important context is
              being captured in the audit log.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raw Metadata</CardTitle>
          <CardDescription>
            Full JSON payload for this event's metadata. Useful for debugging
            and to verify that important context is being captured in the audit
            log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">
            {buildMetaPreview(auditEvent)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
