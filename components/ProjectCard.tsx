import Link from "next/link";
import { Users, CheckSquare } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  memberCount: number;
  taskCount: number;
}

export default function ProjectCard({ id, name, memberCount, taskCount }: ProjectCardProps) {
  return (
    <Link href={`/project/${id}`} className="block">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary/30 transition cursor-pointer group">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 group-hover:text-primary transition">{name}</h3>
        
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} />
            <span>{taskCount} Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} />
            <span>{memberCount} Members</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
