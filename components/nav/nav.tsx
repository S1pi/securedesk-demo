import { NavClient } from "@/components/nav/nav-client";
import { type NavUser } from "@/lib/types/auth";

type NavProps = {
  user: NavUser;
};

export function Nav({ user }: NavProps) {
  return <NavClient user={user} />;
}
