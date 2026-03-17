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
      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
      : task.status === "In Progress"
        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
        : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";

  return (
    <div
      className={[
        "group transition-all duration-500 ease-out animate-in fade-in slide-in-from-top-2",
        isRootTask
          ? "flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:justify-between bg-white/70 dark:bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-slate-800/50 hover:border-primary/30 dark:hover:border-primary/20 shadow-sm hover:shadow-xl hover:shadow-primary/5 active:scale-[0.99]"
          : "rounded-2xl border border-transparent bg-white/40 dark:bg-slate-900/40 px-5 py-4 hover:border-primary/20 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-all",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {hasChildren ? (
          <button
            onClick={toggleExpand}
            className={[
              "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 shadow-sm",
              expanded 
                ? "bg-primary text-white border-primary shadow-primary/20 scale-105" 
                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:border-primary hover:text-primary"
            ].join(" ")}
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : (
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-100 dark:border-slate-800/50 text-gray-200 dark:text-slate-800">
            <div className="w-1 h-1 rounded-full bg-current" />
          </div>
        )}

        <div
          onClick={() => canChangeStatus && onStatusChange(task._id, isDone ? "Pending" : "Done")}
          className={[
            "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-500 cursor-pointer shadow-sm",
            isDone 
              ? "border-emerald-200 bg-emerald-500 text-white shadow-emerald-500/20 rotate-[360deg]" 
              : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-300 dark:text-slate-600 hover:border-emerald-400 hover:text-emerald-400",
          ].join(" ")}
          title={canChangeStatus ? "Toggle Completion" : "Status Indicator"}
        >
          <CheckCircle2 size={18} strokeWidth={isDone ? 3 : 2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className={[
                isRootTask ? "text-xl" : "text-base",
                "font-bold tracking-tight transition-all duration-300",
                isDone ? "text-gray-400 dark:text-slate-500 line-through opacity-60" : "text-gray-900 dark:text-white",
              ].join(" ")}
            >
              {task.title}
            </span>

            {!isRootTask && (
              <span className="rounded-md bg-primary/5 dark:bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                Subtask
              </span>
            )}

            {task.assignedTo && (
              <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-lg px-2 py-1 transition-transform hover:scale-105">
                <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold">
                  {task.assignedTo.name?.[0].toUpperCase()}
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {task.assignedTo.name}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
             {formattedDeadline && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/30">
                  <CalendarDays size={12} />
                  {formattedDeadline}
                </span>
              )}

              <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusTone}`}>
                <div className={`w-1 h-1 rounded-full ${task.status === "Done" ? "bg-emerald-500" : task.status === "In Progress" ? "bg-amber-500" : "bg-slate-400"}`} />
                {task.status}
              </span>
          </div>

          {task.description && (
            <p className="mt-3 max-w-2xl break-words text-sm leading-relaxed text-gray-500 dark:text-slate-400 line-clamp-2 hover:line-clamp-none transition-all duration-300 cursor-default">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-row items-center gap-2 mt-4 md:mt-0 md:ml-4 shrink-0">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task._id, e.target.value)}
          disabled={!canChangeStatus}
          className="appearance-none rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-slate-400 hover:border-primary/30 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-50 text-center"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status} className="dark:bg-slate-900 font-sans normal-case tracking-normal">
              {status}
            </option>
          ))}
        </select>

        {canManageTasks && (
          <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-slate-800 p-1 shadow-sm opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-0 md:group-hover:translate-x-0">
            <button
              onClick={() => onAddSubtask(task._id)}
              className="rounded-lg p-2 text-gray-400 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
              title="Add Subtask"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
            <button
              onClick={() => onEdit(task)}
              className="rounded-lg p-2 text-gray-400 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
              title="Edit Task"
            >
              <Edit2 size={16} strokeWidth={3} />
            </button>
            <button
              onClick={() => onDelete(task._id)}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all active:scale-90"
              title="Delete Task"
            >
              <Trash2 size={16} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
