"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Logo from "./Logo";

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  // Close sidebar when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
        aria-label="Open Menu"
      >
        <Menu size={24} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <Logo href="/dashboard" />
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition"
            aria-label="Close Menu"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
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
      </div>
    </div>
  );
}
