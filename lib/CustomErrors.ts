// ---------------------------------------------------------------------------
// Shared service error class
// ---------------------------------------------------------------------------

export class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ServiceError";
  }
}

export class RateLimitExceededError extends ServiceError {
  constructor(message: string) {
    super("RATE_LIMIT_EXCEEDED", message);
    this.name = "RateLimitExceededError";
  }
}
