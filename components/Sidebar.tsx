"use client";

import {
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
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

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

  return (
    <aside
      className={`hidden shrink-0 bg-base p-3 transition-[width] duration-300 ease-out md:flex md:flex-col ${
        isCollapsed ? "w-[104px]" : "w-72"
      }`}
    >
      <div className="panel-surface flex h-[calc(100svh-1.5rem)] flex-col overflow-hidden bg-surface">
        <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4">
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
                      ? "border-primary bg-primary text-white"
                      : "border-transparent text-muted hover:border-border-subtle hover:bg-base hover:text-text-base"
                  }`}
                  title={isCollapsed ? label : undefined}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${
                      isActive
                        ? "border-white/20 bg-white/10 text-white"
                        : "border-border-subtle bg-surface text-muted group-hover:border-primary group-hover:text-primary"
                    }`}
                  >
                    <Icon size={18} />
                  </span>

                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                      isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    } ${isActive ? "font-semibold" : ""}`}
                  >
                    {label}
                  </span>

                </Link>
              );
            })}
          </nav>
        </div>

        <div className={`border-t border-border-subtle p-4 transition-all duration-300 ${isCollapsed ? "px-3" : "px-4"}`}>
          <div className="rounded-[24px] border border-border-subtle bg-base/72 p-3">
            <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
              {user?.image ? (
                <div className="flex h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface">
                  <img src={user.image} alt={user?.name || "User"} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}

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

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`mt-3 flex w-full items-center justify-center rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:border-primary hover:text-primary disabled:opacity-50 ${
                isCollapsed ? "gap-0" : "gap-2"
              }`}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut size={18} />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                {isLoggingOut ? "Leaving..." : "Logout"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
