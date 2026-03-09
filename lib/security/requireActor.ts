import { redirect } from "next/navigation";
import { auth } from "../auth";
import { Actor } from "./permissions";

type RequireActorProps = {
  // You can add additional options here if needed, such as required roles or permissions
  includeEmail?: boolean; // Example option to include email in the returned actor
};

export async function requireActor({
  includeEmail,
}: RequireActorProps = {}): Promise<Actor & { email?: string }> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    role: session.user.role,
    email: includeEmail ? session.user.email : undefined,
  };
}
