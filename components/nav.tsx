"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

// TODO: replace with real session from NextAuth
const MOCK_USER = {
  name: "Demo User",
  email: "demo@example.com",
  role: "CUSTOMER" as "CUSTOMER" | "STAFF",
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/tickets", label: "Tickets" },
];

const STAFF_NAV_ITEMS = [{ href: "/admin/audit", label: "Audit Log" }];

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);
  const isStaff = MOCK_USER.role === "STAFF";

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      html.classList.add("dark");
      setIsDarkMode(true);
    }
  };

  // TODO: Implement sign out functionality using NextAuth signOut()
  // For now, we'll just forward to the login page on sign out
  const handleSignOut = () => {
    router.push("/login");
  };

  useEffect(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (prefersDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        {/* Brand */}
        <Link href="/" className="font-bold tracking-tight">
          SecureDesk
        </Link>

        <Separator orientation="vertical" className="h-6" />

        <Button variant="outline" size="sm" onClick={toggleDarkMode}>
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </Button>

        {/* Navigation links */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          {isStaff &&
            STAFF_NAV_ITEMS.map((item) => (
              <Button
                key={item.href}
                variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User info */}
        <div className="flex items-center gap-3">
          <Badge variant="outline">{MOCK_USER.role}</Badge>
          <span className="text-sm text-muted-foreground">
            {MOCK_USER.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
