"use client";

import {
  BookOpen,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

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

function getUserInitial(user: any) {
  const source = user?.name?.trim() || user?.email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedState = window.localStorage.getItem("sprinto-sidebar-collapsed");
    if (savedState === "1") {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("sprinto-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  const userInitial = getUserInitial(user);

  return (
    <aside
      className={`hidden shrink-0 border-r border-border-subtle bg-surface p-3 transition-[width] duration-300 ease-out md:flex md:flex-col ${
        isCollapsed ? "w-[104px]" : "w-72"
      }`}
    >
      <div className="flex h-[calc(100svh-1.5rem)] flex-col overflow-hidden bg-surface">
        <div className="flex h-16 items-center justify-between px-4">
          <div
            className={`overflow-hidden transition-all duration-300 ${
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            <Logo href="/dashboard" />
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border-subtle bg-base text-muted transition hover:border-primary hover:text-primary"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <div className={`flex flex-1 flex-col py-6 transition-all duration-300 ${isCollapsed ? "px-3" : "px-4"}`}>
          <div
            className={`mb-4 overflow-hidden px-2 transition-all duration-300 ${
              isCollapsed ? "h-0 opacity-0" : "h-auto opacity-100"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
              Navigation
            </p>
          </div>

          <nav className="space-y-2">
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
                  onMouseEnter={() => router.prefetch(href)}
                  className={`group relative flex items-center rounded-[22px] border px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    isCollapsed ? "justify-center" : "gap-3"
                  } ${
                    isActive
                      ? "border-[#D97757] bg-[#D97757] text-white"
                      : "sidebar-hover-surface border-transparent text-muted hover:border-border-subtle hover:text-text-base"
                  }`}
                  title={isCollapsed ? label : undefined}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${
                      isActive
                        ? "border-[#D97757] bg-[#B96447] text-white"
                        : "border-border-subtle bg-surface text-muted"
                    }`}
                  >
                    <Icon size={18} />
                  </span>

                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                      isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    } ${isActive ? "font-semibold" : "group-hover:font-semibold"}`}
                  >
                    {label}
                  </span>

                </Link>
              );
            })}
          </nav>
        </div>

        <div className={`p-4 transition-all duration-300 ${isCollapsed ? "px-3" : "px-4"}`}>
          <div className="bg-surface p-3">
            <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D97757] text-sm font-semibold text-white">
                {userInitial}
              </div>

              <div
                className={`min-w-0 flex-1 overflow-hidden transition-all duration-300 ${
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                <p className="truncate text-sm font-semibold text-text-base">
                  {user?.name || "Sprinto User"}
                </p>
                <p className="truncate text-sm text-muted">
                  {user?.email || "Admin Account"}
                </p>
              </div>
            </div>

            {isCollapsed ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="mt-3 flex h-14 w-full items-center justify-center rounded-2xl border border-border-subtle bg-surface text-text-base transition hover:border-primary hover:text-primary disabled:opacity-50"
                title="Logout"
              >
                <LogOut size={20} strokeWidth={2.2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <LogOut size={18} />
                <span>{isLoggingOut ? "Leaving..." : "Logout"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
