import { redirect } from "next/navigation";

// Root page redirects into the app
export default function RootPage() {
  // TODO: check session — if authenticated redirect to /dashboard, else /login
  redirect("/dashboard");
}
