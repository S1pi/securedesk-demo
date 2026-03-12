// Request-boundary context for audit decisions.
// Keep this intentionally small and separate from persisted audit event payloads.

// TODO: Move this file to lib/utils or similar if it doesn't end up having any audit-specific logic.
export type RequestAuditContext = {
  endpoint: string;
  sourceIp?: string;
  userAgent?: string;
};

type HeaderSource = {
  get: (name: string) => string | null;
};

function normalizeHeaderValue(value: string | null): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function normalizeIpAddress(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  // Normalize IPv4-mapped IPv6 values like ::ffff:192.168.1.138 to plain IPv4.
  if (value.startsWith("::ffff:")) {
    return value.slice("::ffff:".length);
  }

  return value;
}

export function getSourceIpFromHeaders(
  headers: HeaderSource,
): string | undefined {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfConnectingIp = headers.get("cf-connecting-ip");

  return normalizeIpAddress(
    forwardedFor?.split(",")[0]?.trim() ||
      normalizeHeaderValue(realIp) ||
      normalizeHeaderValue(cfConnectingIp) ||
      undefined,
  );
}

export function createRequestAuditContext(
  endpoint: string,
  headers: HeaderSource,
): RequestAuditContext {
  return {
    endpoint,
    sourceIp: getSourceIpFromHeaders(headers),
    userAgent: normalizeHeaderValue(headers.get("user-agent")),
  };
}
