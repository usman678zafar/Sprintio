import { CheckCircle2, ChevronRight, ChevronDown, Plus, Trash2, Edit2, CalendarDays } from "lucide-react";

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
  canManageTasks?: boolean;
  currentUserId?: string;
}

const STATUS_OPTIONS = ["Pending", "In Progress", "Done"];

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
  canManageTasks = false,
  currentUserId
}: TaskProps) {
  const canChangeStatus = canManageTasks || task.assignedTo?._id === currentUserId || task.assignedTo === currentUserId;
  const isDone = task.status === "Done";
  const formattedDeadline = task.deadline ? new Date(task.deadline).toLocaleDateString() : null;

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

        <CheckCircle2 size={18} className={isDone ? "text-green-500" : "text-gray-300"} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-medium ${isDone ? "text-gray-400 line-through" : "text-gray-700"}`}>
              {task.title}
            </span>

            {task.assignedTo && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {task.assignedTo.name}
              </span>
            )}

            {formattedDeadline && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                <CalendarDays size={12} />
                {formattedDeadline}
              </span>
            )}
          </div>

          {task.description && (
            <p className="mt-1 text-sm text-gray-500 truncate">{task.description}</p>
          )}
        </div>
      </div>

      <div className="ml-4 flex items-center gap-3">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task._id, e.target.value)}
          disabled={!canChangeStatus}
          className="border border-gray-200 bg-white text-sm rounded-md px-2 py-1 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {canManageTasks && (
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
    </div>
  );
}
