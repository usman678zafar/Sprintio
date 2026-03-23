"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
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

export default function MobileSidebar({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname() ?? "";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  const userInitial = getUserInitial(user);

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
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border-subtle bg-surface text-muted transition hover:border-primary hover:text-primary"
        aria-label="Open Menu"
      >
        <Menu size={20} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-2 left-2 z-50 flex w-[min(21rem,calc(100vw-1rem))] transform flex-col overflow-hidden rounded-[32px] border border-border-subtle bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle px-5">
          <Logo href="/dashboard" />
          <button
            onClick={() => setIsOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border-subtle bg-base text-muted transition hover:border-primary hover:text-primary"
            aria-label="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="shrink-0 border-b border-border-subtle px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
            Workspace
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Swipe the bottom navigation left and right for quick access on mobile.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
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
                  className={`flex items-center gap-3 rounded-[22px] border px-3 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "border-[#D97757] bg-[#D97757] text-white"
                      : "border-transparent text-muted hover:border-border-subtle hover:bg-base hover:text-text-base"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
                      isActive
                        ? "border-[#D97757] bg-[#B96447] text-white"
                        : "border-border-subtle bg-base text-muted"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className={isActive ? "font-semibold" : ""}>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 border-t border-border-subtle bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="rounded-[24px] bg-surface p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D97757] text-sm font-semibold text-white">
                {userInitial}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-base">
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <LogOut size={18} />
              {isLoggingOut ? "Leaving..." : "Logout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
