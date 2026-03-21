import { getProjectData } from "@/lib/data";
import { notFound } from "next/navigation";
import ProjectClient from "./ProjectClient";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const data = await getProjectData(params.id);
  if (!data) return { title: "Project Not Found | Sprinto" };

  return {
    title: `${data.project.name} | Sprinto`,
    description: data.project.description || "Project management tasks and team progress.",
  };
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  // Fetch data on the server for maximum speed and SEO
  const data = await getProjectData(params.id);

  if (!data) {
    notFound();
  }

  return <ProjectClient initialData={data} />;
}
