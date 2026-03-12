"use client";

import { LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary">Sprintio</h1>
      </div>
      <div className="p-4 flex-1">
        <nav className="space-y-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition ${
              pathname === "/dashboard"
                ? "bg-primary text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <LayoutDashboard size={20} />
            Projects
          </Link>
        </nav>
      </div>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-red-600 font-medium hover:bg-red-50 transition"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
