"use client";

import {
  BookOpen,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle md:hidden"
      style={{ backgroundColor: "rgb(var(--bg-surface-rgb))" }}
    >
      <div
        className="px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2"
        style={{ backgroundColor: "rgb(var(--bg-surface-rgb))" }}
      >
        <div className="grid grid-cols-6 gap-1">
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
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-[#D97757] text-white"
                    : "text-muted hover:bg-base"
                }`}
                aria-label={label}
                title={label}
              >
                <span className="flex h-8 w-8 items-center justify-center">
                  <Icon size={18} />
                </span>
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
