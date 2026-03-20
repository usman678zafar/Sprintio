import { getDashboardData } from "@/lib/data";
import ProjectsClient from "./ProjectsClient";

export const metadata = {
  title: "Projects | Sprintio",
  description: "Manage your project portfolio and check team progress.",
};

export default async function ProjectsPage() {
  // Fetch data on the server for faster initial rendering
  const { projects } = await getDashboardData();

  return <ProjectsClient initialProjects={projects} />;
}
