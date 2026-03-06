"use server";

import { RegisterSchema } from "@/lib/validation/schemas";
import { registerUser } from "@/lib/services/auth";
import { ServiceError } from "../CustomErrors";
import { auth } from "../auth";

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
    await registerUser(parsed.data);
    return { success: true };
  } catch (err) {
    if (err instanceof ServiceError) {
      return { success: false, error: err.message };
    }
    console.error("[registerAction] unexpected error", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
