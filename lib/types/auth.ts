import { type Role } from "@/app/generated/prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
};

export type NavUser = Pick<SessionUser, "email" | "role">;