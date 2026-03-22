"use client";

import {
    CalendarDays,
    FolderKanban,
    LayoutDashboard,
    Settings,
    Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

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
    const router = useRouter();

    useEffect(() => {
        navItems.forEach((item) => {
            router.prefetch(item.href);
        });
    }, [router]);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)]/80 pb-safe backdrop-blur-lg md:hidden">
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
                            prefetch
                            onTouchStart={() => router.prefetch(href)}
                            className={`flex flex-col items-center gap-1 transition-colors ${isActive ? "text-primary" : "text-slate-400 hover:text-neutral-600 dark:text-neutral-400"
                                }`}
                        >
                            <div className={`relative flex h-8 w-12 items-center justify-center rounded-2xl transition-all ${isActive ? "bg-brand/20 dark:bg-brand/30/50" : ""}`}>
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
