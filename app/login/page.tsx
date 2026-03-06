// Wrapper page to check if user is already authenticated. If so, redirect to dashboard. Otherwise, show login form.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();

  if (session) redirect("/dashboard");

  return <LoginForm />;
}
