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

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login", redirect: true });
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
        className="rounded-xl border border-border-subtle p-2 text-muted transition hover:bg-[var(--color-light-bg)] )]"
        aria-label="Open Menu"
      >
        <Menu size={20} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface/30 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-2 left-2 z-50 flex w-[min(18rem,calc(100vw-1rem))] transform flex-col overflow-hidden rounded-[28px] bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border-subtle px-5">
          <Logo href="/dashboard" />
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-xl border border-border-subtle p-2 text-muted transition hover:bg-[var(--color-light-bg)] )]"
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
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive
                    ? "bg-brand/10 dark:bg-brand/5 text-primary"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-bg)]"
                    }`}
                >
                  <Icon
                    size={20}
                    className={isActive ? "text-primary" : "text-neutral-500 dark:text-neutral-400"}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border-subtle px-5 py-4">
          <div className="mb-4 flex items-center gap-3">
            {user?.image ? (
              <div className="flex h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-[var(--color-light-surface)] )]">
                <img src={user.image} alt={user?.name || "User"} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-muted">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-muted">
                {user?.name || "Sprinto User"}
              </p>
              <p className="truncate text-xs text-muted">
                {user?.email || "Admin Account"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-subtle px-4 py-3 text-sm font-medium text-muted transition hover:border-border-subtle hover:bg-[var(--color-light-bg)] )] disabled:opacity-50"
          >
            <LogOut size={18} />
            {isLoggingOut ? "Leaving..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}
