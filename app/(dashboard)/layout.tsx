import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import Logo from "@/components/Logo";
import MobileSidebar from "@/components/MobileSidebar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh overflow-x-hidden bg-base text-text-base md:h-svh">
      <Sidebar user={session.user} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="sticky top-0 z-40 border-b border-border-subtle bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <MobileSidebar user={session.user} />
            <div className="flex justify-center">
              <Logo href="/dashboard" iconSize={28} />
            </div>
            <div className="h-11 w-11" aria-hidden="true" />
          </div>
        </div>
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
