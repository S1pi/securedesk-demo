import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { ServiceError } from "../CustomErrors";
import { Prisma, type Role } from "@/app/generated/prisma/client";

const BCRYPT_ROUNDS = 12;

type RegisterInput = {
  email: string;
  password: string;
  role: Role;
};

type RegisterResult = {
  id: string;
  email: string;
  role: Role;
};

/**
 * Register a new user. Hashes password with bcrypt and creates the DB record.
 *
 * Returns the created user on success.
 * Throws a coded error for known failure cases (duplicate email).
 */

export async function registerUser(
  input: RegisterInput,
): Promise<RegisterResult> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: { id: true, email: true, role: true },
    });

    return user;
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        err.code === "P2002" &&
        (err.meta?.target as string[]).includes("email")
      ) {
        throw new ServiceError(
          "EMAIL_TAKEN",
          "An account with that email already exists.",
        );
      }
    }
    throw err;
  }
}

// (
//       typeof err === "object" &&
//       err !== null &&
//       "code" in err &&
//       (err as { code: string }).code === "P2002"
//     )
