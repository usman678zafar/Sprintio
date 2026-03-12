import { useState } from "react";
import { CheckCircle2, Circle, ChevronRight, ChevronDown, Plus, Trash2, Edit2 } from "lucide-react";

interface TaskProps {
  task: any;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEdit: (task: any) => void;
  level?: number;
  hasChildren?: boolean;
  expanded?: boolean;
  toggleExpand?: () => void;
  canEdit?: boolean;
}

export default function TaskItem({
  task,
  onStatusChange,
  onDelete,
  onAddSubtask,
  onEdit,
  level = 0,
  hasChildren = false,
  expanded = false,
  toggleExpand,
  canEdit = false
}: TaskProps) {
  const isDone = task.status === "Done";

  const handleStatusToggle = () => {
    onStatusChange(task._id, isDone ? "Pending" : "Done");
  };

  return (
    <div
      className={`flex items-center justify-between py-3 px-4 border-b border-gray-100 group hover:bg-gray-50 transition`}
      style={{ paddingLeft: `${Math.max(1, level) * 1.5 + 1}rem` }}
    >
      <div className="flex items-center gap-3 flex-1">
        {hasChildren ? (
          <button onClick={toggleExpand} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : (
          <div className="w-[18px]" /> // Spacer for alignment
        )}

        <button onClick={handleStatusToggle} className={`focus:outline-none ${isDone ? "text-green-500" : "text-gray-300 hover:text-gray-400"}`}>
          {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>

        <span className={`font-medium ${isDone ? "text-gray-400 line-through" : "text-gray-700"}`}>
          {task.title}
        </span>
        
        {task.assignedTo && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-2">
            {task.assignedTo.name}
          </span>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onAddSubtask(task._id)} className="p-1 text-gray-400 hover:text-primary transition" title="Add Subtask">
            <Plus size={16} />
          </button>
          <button onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-primary transition" title="Edit Task">
            <Edit2 size={16} />
          </button>
          <button onClick={() => onDelete(task._id)} className="p-1 text-gray-400 hover:text-red-500 transition" title="Delete Task">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
