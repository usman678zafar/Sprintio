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
  const isRootTask = level === 0;
  const statusTone =
    task.status === "Done"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : task.status === "In Progress"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div
      className={[
        "group transition",
        isRootTask
          ? "flex flex-col gap-4 px-5 py-4 md:flex-row md:items-start md:justify-between"
          : "rounded-xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:border-purple-200 hover:bg-white",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {hasChildren ? (
          <button
            onClick={toggleExpand}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 hover:border-purple-200 hover:text-primary"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent" />
        )}

        <div
          className={[
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
            isDone ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-gray-200 bg-gray-50 text-gray-300",
          ].join(" ")}
        >
          <CheckCircle2 size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                isRootTask ? "text-lg" : "text-base",
                "font-semibold",
                isDone ? "text-gray-400 line-through" : "text-gray-800",
              ].join(" ")}
            >
              {task.title}
            </span>

            {!isRootTask && (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-purple-700">
                Subtask
              </span>
            )}

            {task.assignedTo && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {task.assignedTo.name}
              </span>
            )}

            {formattedDeadline && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                <CalendarDays size={12} />
                {formattedDeadline}
              </span>
            )}

            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone}`}>
              {task.status}
            </span>
          </div>

          {task.description && (
            <p className="mt-1 max-w-3xl break-words text-sm leading-6 text-gray-500">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:ml-4 md:justify-end">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task._id, e.target.value)}
          disabled={!canChangeStatus}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm disabled:bg-gray-100 disabled:text-gray-400"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {canManageTasks && (
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm opacity-100 md:opacity-70 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onAddSubtask(task._id)}
              className="rounded-lg p-2 text-gray-400 hover:bg-purple-50 hover:text-primary transition"
              title="Add Subtask"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => onEdit(task)}
              className="rounded-lg p-2 text-gray-400 hover:bg-purple-50 hover:text-primary transition"
              title="Edit Task"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => onDelete(task._id)}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
              title="Delete Task"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
