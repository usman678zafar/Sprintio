"use client";

import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import Logo from "./Logo";

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

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <Logo href="/dashboard" />
      </div>

      <div className="flex flex-1 flex-col px-5 py-6">
        <nav className="space-y-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = href
              ? pathname === href ||
                (href === "/projects" && pathname.startsWith("/project/")) ||
                (href === "/settings" && pathname.startsWith("/settings"))
              : false;

            if (!href) {
              return (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600"
                >
                  <Icon size={20} className="text-slate-500" />
                  <span>{label}</span>
                </div>
              );
            }

            return (
              <Link
                key={label}
                href={href}
                className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-primary"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? "text-primary" : "text-slate-500"}
                />
                <span>{label}</span>
                {isActive && (
                  <span className="absolute inset-y-0 right-0 w-1 rounded-l-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 px-5 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-800">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user?.name || "Sprintio User"}
            </p>
            <p className="truncate text-sm text-slate-500">
              {user?.email || "Admin Account"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
