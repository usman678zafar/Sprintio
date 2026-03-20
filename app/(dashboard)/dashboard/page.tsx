import { getDashboardData } from "@/lib/data";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Dashboard | Sprintio",
  description: "View your active projects and team progress.",
};

export default async function DashboardPage() {
  // Fetch data directly on the server for maximum speed and zero loading flash
  const { projects } = await getDashboardData();

  return <DashboardClient initialProjects={projects} />;
}
