"use server";

import { RegisterSchema } from "@/lib/validation/schemas";
import { registerUser } from "@/lib/services/auth";
import { RateLimitExceededError, ServiceError } from "../CustomErrors";
import { checkRateLimit } from "../security/rate-limit-boundary";
import { createRequestAuditContext } from "../request-audit";
import { headers } from "next/headers";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function registerAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = RegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const headerStore = await headers();
    const requestAuditContext = createRequestAuditContext(
      "registerAction",
      headerStore,
    );

    // Rate limit check for registration by IP
    await checkRateLimit({
      scope: "register_ip",
      limiterKey: requestAuditContext.sourceIp ?? "unknown_ip",
      endpoint: requestAuditContext.endpoint,
      sourceIp: requestAuditContext.sourceIp,
      userAgent: requestAuditContext.userAgent,
    });
    await registerUser(parsed.data);
    return { success: true };
  } catch (err) {
    if (err instanceof ServiceError || err instanceof RateLimitExceededError) {
      return { success: false, error: err.message };
    }
    console.error("[registerAction] unexpected error", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
