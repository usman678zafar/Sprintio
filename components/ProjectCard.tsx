import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Users, CheckSquare, MoreVertical, Edit2, Trash2 } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  memberCount: number;
  taskCount: number;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ProjectCard({ id, name, memberCount, taskCount, onEdit, onDelete }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative group">
      <Link href={`/project/${id}`} className="block">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary/30 transition cursor-pointer h-full">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-800 transition group-hover:text-primary pr-8 truncate">
              {name}
            </h3>
          </div>
          
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
      
      <div className="absolute top-4 right-4" ref={menuRef}>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition opacity-0 group-hover:opacity-100"
        >
          <MoreVertical size={20} />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(false);
                onEdit(id, name);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit2 size={14} />
              Edit Name
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(false);
                onDelete(id);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
