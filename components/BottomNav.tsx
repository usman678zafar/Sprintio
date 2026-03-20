"use client";

import {
    CalendarDays,
    FolderKanban,
    LayoutDashboard,
    Settings,
    Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    {
        label: "Home",
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
        label: "Events",
        href: "/calendar",
        icon: CalendarDays,
    },
    {
        label: "Settings",
        href: "/settings",
        icon: Settings,
    },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/80 pb-safe backdrop-blur-lg md:hidden">
            <div className="flex h-16 items-center justify-around px-2">
                {navItems.map(({ label, href, icon: Icon }) => {
                    const isActive = href
                        ? pathname === href ||
                        (href === "/projects" && pathname.startsWith("/project/")) ||
                        (href === "/settings" && pathname.startsWith("/settings"))
                        : false;

                    return (
                        <Link
                            key={label}
                            href={href}
                            className={`flex flex-col items-center gap-1 transition-colors ${isActive ? "text-primary" : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            <div className={`relative flex h-8 w-12 items-center justify-center rounded-2xl transition-all ${isActive ? "bg-blue-100/50" : ""}`}>
                                <Icon size={22} className={isActive ? "text-primary" : "text-slate-400"} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
