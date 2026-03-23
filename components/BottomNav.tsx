"use client";

import {
  BookOpen,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Team",
    href: "/team",
    icon: Users,
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Wiki",
    href: "/wiki",
    icon: BookOpen,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle md:hidden"
      style={{ backgroundColor: "rgb(var(--bg-surface-rgb))" }}
    >
      <div
        className="scrollbar-none overflow-x-auto px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-3"
        style={{ backgroundColor: "rgb(var(--bg-surface-rgb))" }}
      >
        <div className="flex min-w-max gap-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href === "/projects" && pathname.startsWith("/project/")) ||
              (href === "/settings" && pathname.startsWith("/settings"));

            return (
              <Link
                key={label}
                href={href}
                prefetch
                onTouchStart={() => router.prefetch(href)}
                className={`flex min-w-[122px] items-center gap-3 rounded-[22px] border px-3 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-border-subtle bg-base text-muted"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                    isActive
                      ? "border-[#2563EB] bg-[#1D4ED8] text-white"
                      : "border-border-subtle bg-surface text-muted"
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex min-w-[122px] items-center gap-3 rounded-[22px] border border-border-subtle bg-base px-3 py-3 text-sm font-medium text-muted transition-all disabled:opacity-60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-surface text-muted">
              <LogOut size={18} />
            </span>
            <span className="whitespace-nowrap">{isLoggingOut ? "Leaving..." : "Logout"}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
