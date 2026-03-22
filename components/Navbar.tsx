"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import Logo from "./Logo";
import MobileSidebar from "./MobileSidebar";

export default function Navbar({ user }: { user: any }) {
  const pathname = usePathname() ?? "";
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
    <header className="border-b border-border-subtle bg-surface/78 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-5">
        <div className="flex items-center gap-3 md:hidden">
          <MobileSidebar user={user} />
          <Logo href="/dashboard" />
        </div>

        {pathname !== "/dashboard" && (
          <div className="relative hidden max-w-2xl flex-1 sm:block">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="field-surface h-11 pl-11 pr-4"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          {(pathname === "/dashboard" || pathname === "/projects" || pathname === "/calendar") && (
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="btn-primary px-3 sm:px-5"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">
                {pathname === "/calendar" ? "New Task" : "Add New Project"}
              </span>
            </button>
          )}
        </div>
      </div>

      {pathname !== "/dashboard" && (
        <div className="border-t border-border-subtle px-4 pb-4 sm:hidden">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="field-surface h-11 pl-11 pr-4"
            />
          </div>
        </div>
      )}
    </header>
  );
}
