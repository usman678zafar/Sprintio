"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import MobileSidebar from "./MobileSidebar";

export default function Navbar({ user }: { user: any }) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const searchPlaceholder =
    pathname === "/calendar"
      ? "Search tasks..."
      : pathname === "/settings"
        ? "Search settings..."
        : "Search projects or tasks...";

  useEffect(() => {
    const searchEventName =
      pathname === "/dashboard"
        ? "dashboard-search"
        : pathname === "/projects"
          ? "projects-search"
          : pathname === "/calendar"
            ? "calendar-search"
          : pathname === "/settings"
            ? "settings-search"
          : pathname === "/team"
            ? "team-search"
          : null;

    if (!searchEventName) {
      setSearchQuery("");
      return;
    }

    window.dispatchEvent(
      new CustomEvent(searchEventName, { detail: searchQuery })
    );
  }, [pathname, searchQuery]);

  const handlePrimaryAction = () => {
    const addEventName =
      pathname === "/dashboard"
        ? "dashboard-add-project"
        : pathname === "/projects"
          ? "projects-add-project"
          : pathname === "/calendar"
            ? "calendar-add-task"
          : null;

    if (addEventName) {
      window.dispatchEvent(new Event(addEventName));
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-5">
        <div className="shrink-0 md:hidden">
          <MobileSidebar user={user} />
        </div>

        <div className="relative hidden max-w-2xl flex-1 sm:block">
          <Search
            size={20}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            className="rounded-2xl border border-transparent p-2.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>

          {(pathname === "/dashboard" || pathname === "/projects" || pathname === "/calendar") && (
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 sm:px-5"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">
                {pathname === "/calendar" ? "New Task" : "Add New Project"}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 pb-4 sm:hidden">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>
    </header>
  );
}
