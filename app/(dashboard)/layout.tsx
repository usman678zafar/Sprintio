import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

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
    <div className="flex min-h-svh bg-base text-text-base md:h-svh">
      <Sidebar user={session.user} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pb-24 md:pb-0">
        <main className="flex-1 overflow-y-auto">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
