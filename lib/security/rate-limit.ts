type RateLimitScope =
  | "login_ip"
  | "login_ip_identifier"
  | "register_ip"
  | "ticket_creation"
  | "ticket_reply"
  | "ticket_status_change";

export type RateLimitConfig = {
  scope: RateLimitScope;
  maxAttempts: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
  resetAt: Date;
};

type StoredBucket = {
  attempts: number;
  resetAtMs: number;
  auditLogged: boolean;
};

export const RATE_LIMITS: Record<RateLimitScope, RateLimitConfig> = {
  login_ip: {
    scope: "login_ip",
    maxAttempts: 10, // 10 for demo purposes, consider more attempts for production
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  login_ip_identifier: {
    scope: "login_ip_identifier",
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  register_ip: {
    scope: "register_ip",
    maxAttempts: 2, // 2 for demo purposes, consider more attempts for production example 5
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  ticket_creation: {
    scope: "ticket_creation",
    maxAttempts: 2, // 2 for demo purposes, consider more attempts for production example 5
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  ticket_reply: {
    scope: "ticket_reply",
    maxAttempts: 5, // 5 for demo purposes, consider more attempts for production example 20
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  ticket_status_change: {
    scope: "ticket_status_change",
    maxAttempts: 10, // 10 for demo purposes, consider more attempts for production
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
};

const rateLimitBuckets: Map<string, StoredBucket> = new Map();

function getRateLimitKey(scope: RateLimitScope, key: string): string {
  return `${scope}:${key}`;
}

// export function checkRateLimit

export function consumeRateLimit(
  config: RateLimitConfig,
  key: string,
): RateLimitResult & Pick<StoredBucket, "auditLogged"> {
  const now = Date.now();
  const rateLimitKey = getRateLimitKey(config.scope, key);
  const existingBucket = rateLimitBuckets.get(rateLimitKey);

  if (!existingBucket || existingBucket.resetAtMs <= now) {
    const newBucket: StoredBucket = {
      attempts: 1,
      resetAtMs: now + config.windowMs,
      auditLogged: false,
    };

    rateLimitBuckets.set(rateLimitKey, newBucket);

    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
      resetAt: new Date(newBucket.resetAtMs),
      auditLogged: false,
    };
  }

  existingBucket.attempts += 1;

  const allowed = existingBucket.attempts <= config.maxAttempts;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existingBucket.resetAtMs - now) / 1000),
  );

  return {
    allowed,
    remainingAttempts: Math.max(
      0,
      config.maxAttempts - existingBucket.attempts,
    ),
    retryAfterSeconds,
    resetAt: new Date(existingBucket.resetAtMs),
    auditLogged: existingBucket.auditLogged,
  };
}

export function markRateLimitAuditLogged(scope: RateLimitScope, key: string) {
  const rateLimitKey = getRateLimitKey(scope, key);
  const existingBucket = rateLimitBuckets.get(rateLimitKey);
  if (existingBucket) {
    existingBucket.auditLogged = true;
  }
}
