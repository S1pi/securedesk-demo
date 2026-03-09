"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { type NavUser } from "@/lib/types/auth";
import { isActivePath } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/tickets", label: "Tickets" },
];

const STAFF_NAV_ITEMS = [{ href: "/admin/audit", label: "Audit Log" }];

type NavClientProps = {
  user: NavUser;
};

export function NavClient({ user }: NavClientProps) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);
  const isStaff = user.role === "STAFF";

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
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="font-bold tracking-tight">
          SecureDesk
        </Link>

        <Separator orientation="vertical" className="h-6" />

        <Button variant="outline" size="sm" onClick={toggleDarkMode}>
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </Button>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.href}
              variant={
                isActivePath(pathname, item.href) ? "secondary" : "ghost"
              }
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
                variant={
                  isActivePath(pathname, item.href) ? "secondary" : "ghost"
                }
                size="sm"
                asChild
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <Badge variant="outline">{user.role}</Badge>
          <span className="text-sm text-muted-foreground">{user.email}</span>
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
