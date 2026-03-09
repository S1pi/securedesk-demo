import { Nav } from "@/components/nav/nav";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <Nav
        user={{
          email: session.user.email,
          role: session.user.role,
        }}
      />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
