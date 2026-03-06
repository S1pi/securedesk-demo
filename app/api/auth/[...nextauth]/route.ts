import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Example usage of auth function to get the current session in a server component or API route

// const session = await auth();
// if (!session) {
//   // Not signed in
//   console.log("User is not authenticated");
// }

// session.user.id, session.user.role is available here
