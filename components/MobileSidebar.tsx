"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
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

export default function MobileSidebar({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
        aria-label="Open Menu"
      >
        <Menu size={20} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-2 left-2 z-50 flex w-[min(18rem,calc(100vw-1rem))] transform flex-col overflow-hidden rounded-[28px] bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Logo href="/dashboard" />
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            aria-label="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
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
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
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
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-800">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.name || "Sprintio User"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {user?.email || "Admin Account"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
