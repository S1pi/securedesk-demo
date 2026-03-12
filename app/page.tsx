import { redirect } from "next/navigation";

// Let the authenticated area decide whether this resolves to /dashboard or /login.
export default function RootPage() {
  redirect("/dashboard");
}
