import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

// TODO: replace role with a type from your database schema, ensure this is consistent across your application

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: "CUSTOMER" | "STAFF";
    };
  }
  interface User {
    id: string;
    email: string;
    role: "CUSTOMER" | "STAFF";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CUSTOMER" | "STAFF";
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          // Log the failed login attempt for auditing purposes (you can expand this to include IP address, user agent, etc.)
          // This is if the email does not exist in the database, which could indicate a user trying to guess valid emails. Logging this can help you identify potential malicious activity.
          // TODO: Implement proper logging of failed login attempts to the database for auditing and security monitoring
          return null;
        }
        const isValidPw = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isValidPw) {
          // Log the failed login attempt for auditing purposes (you can expand this to include IP address, user agent, etc.)
          // This is if the password is incorrect for a valid email, which could indicate a brute force attack. Logging this can help you identify potential malicious activity.
          // TODO: Implement proper logging of failed login attempts to the database for auditing and security monitoring
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          role: user.role as "CUSTOMER" | "STAFF",
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
