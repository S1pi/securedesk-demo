import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { type Role } from "@/app/generated/prisma/client";
import prisma from "@/lib/db";
import { type SessionUser } from "@/lib/types/auth";
import { logAuditEvent, toLogAuditEventInput } from "./services/audit";
import { createRequestAuditContext } from "./request-audit";

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
  interface User extends SessionUser {}
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

export const authOptions: NextAuthOptions = {
  // Possible session strategies are "jwt" or "database".
  // For this demo, we'll use JWT to keep it simple, but in a production app you might want to use a database session strategy for better security and scalability.
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 1 Week in seconds
    // Update age is used if you use database sessions, to extend the session.
    // Use it to limit write operations to the database, by only updating the session in the database if the session is accessed after the update age has passed.
    // JWT sessions ignore this option
    // updateAge: 24 * 60 * 60, // 24 hours in seconds

    // For database sessions, you specify a function to generate the session token. For JWT sessions, this is not used, as the token is generated and signed automatically by NextAuth.
    // generateSessionToken: () => {
    //   // You can implement your own session token generation logic here if you want to use something other than a random UUID. For JWT sessions, this is not used, but for database sessions it is.
    //   return crypto.randomUUID();
    // },
  },
  pages: {
    signIn: "/login",
    // You can also specify custom pages for error, signOut, etc. For this demo, we'll just use the default pages for those.
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const headerSource = {
          get: (name: string) => {
            const headerValue =
              req?.headers?.[name] ?? req?.headers?.[name.toLowerCase()];

            return typeof headerValue === "string" ? headerValue : null;
          },
        };

        const requestAuditContext = createRequestAuditContext(
          "/api/auth/callback/credentials",
          headerSource,
        );

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          // Future audit hook: record AUTH_LOGIN_FAILED without storing password data.

          await logAuditEvent(
            toLogAuditEventInput({
              action: "AUTH_LOGIN_FAILED",
              actorUserId: null,
              meta: {
                endpoint: requestAuditContext.endpoint,
                sourceIp: requestAuditContext.sourceIp ?? "unknown",
                userAgent: requestAuditContext.userAgent,
                attemptedIdentifier: credentials.email,
                reason: "user_not_found",
              },
            }),
          );

          return null;
        }

        const isValidPw = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isValidPw) {
          // Future audit hook: record AUTH_LOGIN_FAILED without storing password data.
          await logAuditEvent(
            toLogAuditEventInput({
              action: "AUTH_LOGIN_FAILED",
              actorUserId: null,
              meta: {
                endpoint: requestAuditContext.endpoint,
                sourceIp: requestAuditContext.sourceIp ?? "unknown",
                userAgent: requestAuditContext.userAgent,
                attemptedIdentifier: credentials.email,
                reason: "invalid_password",
              },
            }),
          );

          return null;
        }
        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function auth() {
  return getServerSession(authOptions);
}
