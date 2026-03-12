import {
  type AuditAction,
  type TicketStatus,
} from "@/app/generated/prisma/client";

export type AuditMetaValue =
  | string
  | number
  | boolean
  | null
  | AuditMetaObject
  | AuditMetaValue[];

export type AuditMetaObject = {
  [key: string]: AuditMetaValue;
};

export type AuditTarget = {
  type?: string | null;
  id?: string | null;
};

export type LogAuditEventInput = {
  actorUserId?: string | null;
  action: AuditAction;
  target?: AuditTarget;
  meta?: AuditMetaObject;
};

export type AuditEndpointMeta = {
  endpoint: string;
};

export type AuditSourceMeta = {
  sourceIp: string;
  userAgent?: string;
};

export type AuthLoginFailedMeta = AuditEndpointMeta &
  AuditSourceMeta & {
    attemptedIdentifier: string;
    reason: string;
  };

export type TicketCreatedMeta = AuditEndpointMeta;

export type TicketReplyPostedMeta = AuditEndpointMeta & {
  ticketId: string;
};

export type TicketStatusChangedMeta = AuditEndpointMeta & {
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
};

export type ForbiddenActionAttemptMeta = AuditEndpointMeta &
  AuditSourceMeta & {
    reason: string;
    ticketId?: string;
  };

export type RateLimitTriggeredMeta = AuditEndpointMeta &
  AuditSourceMeta & {
    limiterScope: string;
    limiterKey: string;
    reason: string;
  };

// Lightweight compile-time contract for the current event set.
// Keep LogAuditEventInput generic until the runtime call sites are wired.
export type CurrentAuditEventContract =
  | {
      action: "AUTH_LOGIN_FAILED";
      actorUserId?: null;
      target?: { type?: null; id?: null };
      meta: AuthLoginFailedMeta;
    }
  | {
      action: "TICKET_CREATED";
      actorUserId: string;
      target: { type: "Ticket"; id: string };
      meta?: TicketCreatedMeta;
    }
  | {
      action: "TICKET_REPLY_POSTED";
      actorUserId: string;
      target: { type: "TicketMessage"; id: string };
      meta: TicketReplyPostedMeta;
    }
  | {
      action: "TICKET_STATUS_CHANGED";
      actorUserId: string;
      target: { type: "Ticket"; id: string };
      meta: TicketStatusChangedMeta;
    }
  | {
      action: "FORBIDDEN_ACTION_ATTEMPT";
      actorUserId?: string | null;
      target?: AuditTarget;
      meta: ForbiddenActionAttemptMeta;
    }
  | {
      action: "RATE_LIMIT_TRIGGERED";
      actorUserId?: string | null;
      target?: AuditTarget;
      meta: RateLimitTriggeredMeta;
    };

export type ListAuditEventsInput = {
  limit?: number;
};

export type AuditLogListItem = {
  id: string;
  action: AuditAction;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  meta: AuditMetaObject;
  createdAt: Date;
};