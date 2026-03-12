import { type Prisma } from "@/app/generated/prisma/client";
import { ServiceError } from "@/lib/CustomErrors";
import prisma from "@/lib/db";
import { canReadAuditLog, type Actor } from "@/lib/security/permissions";
import {
  type AuditLogListItem,
  type AuditMetaObject,
  type CurrentAuditEventContract,
  type ListAuditEventsInput,
  type LogAuditEventInput,
} from "@/lib/types/audit";
import { headers } from "next/headers";
import { createRequestAuditContext } from "../request-audit";

const DEFAULT_AUDIT_LIST_LIMIT = 50;
const MAX_AUDIT_LIST_LIMIT = 100;

function clampAuditListLimit(limit?: number): number {
  if (limit === undefined) {
    return DEFAULT_AUDIT_LIST_LIMIT;
  }

  return Math.min(Math.max(limit, 1), MAX_AUDIT_LIST_LIMIT);
}

function isAuditMetaObject(value: Prisma.JsonValue): value is AuditMetaObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getAuditReason(meta: AuditMetaObject): string | null {
  const reason = meta.reason;

  return typeof reason === "string" ? reason : null;
}

function buildAuditEventCreateData(input: LogAuditEventInput) {
  return {
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.target?.type ?? null,
    targetId: input.target?.id ?? null,
    meta: input.meta,
  };
}

// Event-specific payload expectations are documented in docs/audit-payload-contract.md.
// Keep this helper generic for now so current wiring can happen incrementally.
export function toLogAuditEventInput(
  contract: CurrentAuditEventContract,
): LogAuditEventInput {
  return contract;
}

function mapAuditEvent(event: {
  id: string;
  action: AuditLogListItem["action"];
  targetType: string | null;
  targetId: string | null;
  meta: Prisma.JsonValue;
  createdAt: Date;
  actor: { email: string } | null;
}): AuditLogListItem {
  const meta = isAuditMetaObject(event.meta) ? event.meta : {};

  return {
    id: event.id,
    action: event.action,
    actorEmail: event.actor?.email ?? null,
    targetType: event.targetType,
    targetId: event.targetId,
    reason: getAuditReason(meta),
    meta,
    createdAt: event.createdAt,
  };
}

/**
 * Foundational write helper for security-critical events.
 *
 * Next steps:
 * - call this from auth and ticket mutation paths
 * - keep payloads minimal; never log message bodies, passwords, or tokens
 * - add focused helper wrappers if repeated event shapes emerge
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: buildAuditEventCreateData(input),
    });
  } catch (err) {
    // Audit logging must stay non-blocking so the primary request can still succeed.
    console.error("[logAuditEvent] failed to persist audit event", err);
  }
}

/**
 * Foundational read helper for the staff-only audit page.
 *
 * Next steps:
 * - add filtering by action, actor, or target id
 * - add cursor pagination once the page stops using mock data
 */
export async function listAuditEvents(
  actor: Actor,
  input: ListAuditEventsInput = {},
): Promise<AuditLogListItem[]> {
  if (!canReadAuditLog(actor)) {
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
          reason: "staff_required_for_audit_log",
        },
      }),
    );

    throw new ServiceError(
      "FORBIDDEN",
      "You are not allowed to view audit events.",
    );
  }

  try {
    const events = await prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: clampAuditListLimit(input.limit),
      include: {
        actor: {
          select: {
            email: true,
          },
        },
      },
    });

    return events.map(mapAuditEvent);
  } catch (err) {
    console.error("[listAuditEvents] unexpected error", err);
    throw new ServiceError(
      "AUDIT_LIST_FAILED",
      "Failed to load audit events. Please try again.",
    );
  }
}
