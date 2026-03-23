"use client";

import {
  BookOpen,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    label: "Wiki",
    href: "/wiki",
    icon: BookOpen,
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

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  useEffect(() => {
    const savedState = window.localStorage.getItem("sprinto-sidebar-expanded");
    if (savedState === "1") {
      setIsExpanded(true);
    }
  }, []);

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      window.localStorage.setItem("sprinto-sidebar-expanded", next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside
      className={`hidden shrink-0 border-r border-border-subtle bg-surface p-3 transition-[width] duration-300 md:flex md:flex-col ${
        isExpanded ? "w-72" : "w-[104px]"
      }`}
    >
      <div className="flex h-[calc(100svh-1.5rem)] flex-col overflow-hidden bg-surface">
        <div className={`flex h-16 items-center px-4 ${isExpanded ? "justify-start" : "justify-center"}`}>
          <Logo href="/dashboard" showText={isExpanded} iconSize={28} />
        </div>

        <div className="flex flex-1 flex-col px-3 py-6">
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
                    isExpanded ? "justify-start gap-3" : "justify-center"
                  } ${
                    isActive
                      ? "border-[#D97757] bg-[#D97757] text-white"
                      : "sidebar-hover-surface border-transparent text-muted hover:border-border-subtle hover:text-text-base"
                  }`}
                  title={label}
                  aria-label={label}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center transition-all ${
                    isActive ? "text-white" : "text-muted"
                  }`}>
                    <Icon size={16} />
                  </span>
                  {isExpanded ? <span className="truncate">{label}</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3">
          <div className="bg-surface p-3">
            <button
              type="button"
              onClick={toggleExpanded}
              className={`flex w-full items-center px-3 py-3 text-sm font-medium text-muted transition hover:text-primary ${
                isExpanded ? "justify-start gap-3" : "justify-center"
              }`}
              title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                {isExpanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              </span>
              {isExpanded ? <span>Collapse</span> : null}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
