import { getDashboardData } from "@/lib/data";
import DashboardClient from "./DashboardClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Dashboard | Sprinto",
  description: "View your active projects and team progress.",
};

export default async function DashboardPage() {
  // Fetch data directly on the server for maximum speed and zero loading flash
  const { projects, metrics, recentTasks } = await getDashboardData();
  const session = await getServerSession(authOptions);

  return (
    <DashboardClient 
      initialProjects={projects} 
      initialMetrics={metrics} 
      recentTasks={recentTasks}
      user={session?.user} 
      renderedAt={new Date().toISOString()}
    />
  );
}
