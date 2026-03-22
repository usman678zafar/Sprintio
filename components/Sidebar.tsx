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

import Logo from "./Logo";
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
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
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
      className={`hidden shrink-0 border-r border-border-subtle bg-surface/88 backdrop-blur-xl transition-[width] duration-300 ease-out md:flex md:flex-col ${
        isCollapsed ? "w-[88px]" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4">
        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
          <Logo href="/dashboard" />
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-base hover:text-text-base"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className={`flex flex-1 flex-col py-6 transition-all duration-300 ${isCollapsed ? "px-3" : "px-5"}`}>
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
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted"
                >
                  <Icon size={20} className="text-muted" />
                  <span>{label}</span>
                </div>
              );
            }

            return (
              <Link
                key={label}
                href={href}
                prefetch
                onMouseEnter={() => router.prefetch(href)}
                className={`relative flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isCollapsed ? "justify-center" : "gap-3"
                } ${isActive
                  ? "bg-primary/12 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-muted hover:bg-base hover:text-text-base"
                  }`}
                title={isCollapsed ? label : undefined}
              >
                <Icon
                  size={20}
                  className={isActive ? "text-primary" : "text-muted"}
                />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                    isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <span className="absolute inset-y-0 right-0 w-1 rounded-l-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`border-t border-border-subtle py-5 transition-all duration-300 ${isCollapsed ? "px-3" : "px-5"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-4"}`}>
          {user?.image ? (
            <div className="flex h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface">
              <img src={user.image} alt={user?.name || "User"} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div className={`min-w-0 flex-1 overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
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
          className={`mt-4 flex w-full items-center justify-center rounded-2xl border border-border-subtle px-4 py-3 text-sm font-medium text-muted transition hover:bg-base hover:text-text-base disabled:opacity-50 ${
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
    </aside>
  );
}
