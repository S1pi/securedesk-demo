import { RateLimitExceededError } from "../CustomErrors";
import { logAuditEvent, toLogAuditEventInput } from "../services/audit";
import {
  consumeRateLimit,
  markRateLimitAuditLogged,
  RATE_LIMITS,
} from "./rate-limit";

type BoundaryInput = {
  scope: keyof typeof RATE_LIMITS;
  limiterKey: string;
  endpoint: string;
  sourceIp?: string;
  userAgent?: string;
  actorUserId?: string | null;
};

export async function checkRateLimit(input: BoundaryInput): Promise<void> {
  const config = RATE_LIMITS[input.scope];
  const result = consumeRateLimit(config, input.limiterKey);

  if (result.allowed) {
    return;
  }

  // Log audit event for rate limit triggered
  if (!result.auditLogged) {
    await logAuditEvent(
      toLogAuditEventInput({
        action: "RATE_LIMIT_TRIGGERED",
        actorUserId: input.actorUserId ?? null,
        target: {
          type: "Rate Limit",
          id: `${input.scope} - ${input.limiterKey}`,
        },
        meta: {
          endpoint: input.endpoint,
          sourceIp: input.sourceIp ?? "unknown",
          userAgent: input.userAgent,
          limiterScope: input.scope,
          limiterKey: input.limiterKey,
          reason: `rate_limit_exceeded`,
        },
      }),
    );

    markRateLimitAuditLogged(config.scope, input.limiterKey);
  }

  throw new RateLimitExceededError(
    `Too many attempts. Please try again after ${result.retryAfterSeconds} seconds.`,
  );
}
