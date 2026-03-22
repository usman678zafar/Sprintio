"use client";

import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-surface md:hidden">
      <div className="scrollbar-none overflow-x-auto px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-3">
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
                    ? "border-primary bg-primary text-white"
                    : "border-border-subtle bg-base text-muted"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                    isActive
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-border-subtle bg-surface text-muted"
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
