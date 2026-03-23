"use client";

import { useMemo } from "react";
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  Layers, 
  ArrowUpRight,
  Plus,
  LayoutGrid,
  Clock,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";

const RECENT_ACTIVITY_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

type Project = {
  _id: string;
  name: string;
  memberCount: number;
  taskCount: number;
  description?: string;
  createdAt?: string;
};

type Task = {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  projectId: {
    _id: string;
    name: string;
  };
};

type DashboardMetrics = {
  totalTasks: number;
  activeProjects: number;
  upcomingDeadlines: number;
  efficiency: number;
};

export default function DashboardClient({
  initialProjects,
  initialMetrics,
  recentTasks = [],
  user,
  renderedAt,
}: {
  initialProjects: Project[];
  initialMetrics: DashboardMetrics;
  recentTasks?: Task[];
  user?: any;
  renderedAt: string;
}) {
  const hasProjects = initialProjects.length > 0;
  const renderDate = useMemo(() => new Date(renderedAt), [renderedAt]);
  
  const greeting = useMemo(() => {
    const hour = renderDate.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [renderDate]);

  const metricCards = [
    {
      label: "Total Tasks",
      value: initialMetrics.totalTasks,
      icon: Layers,
      color: "brand",
      helper: "Across all projects",
    },
    {
      label: "Active Projects",
      value: initialMetrics.activeProjects,
      icon: LayoutGrid,
      color: "blue",
      helper: "Projects you're in",
    },
    {
      label: "Upcoming Deadlines",
      value: initialMetrics.upcomingDeadlines,
      icon: Calendar,
      color: "orange",
      helper: "Due within 7 days",
    },
    {
      label: "Efficiency",
      value: `${initialMetrics.efficiency}%`,
      icon: CheckCircle2,
      color: "green",
      helper: "Success rate",
    },
  ];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const diff = renderDate.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return RECENT_ACTIVITY_FORMATTER.format(date);
  };

  return (
    <div className="min-h-full bg-base px-4 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1240px]">
        {/* Header Section */}
        <header className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-text-base sm:text-5xl">
              {greeting}, <span className="text-brand">{user?.name?.split(' ')[0] || 'User'}</span>
            </h1>
            <p className="mt-3 text-lg text-muted max-w-2xl leading-relaxed">
              Welcome back to Sprinto. You have <span className="text-text-base font-semibold">{initialMetrics.upcomingDeadlines} urgent deadlines</span> this week.
            </p>
          </div>
          
          <Link 
            href="/projects" 
            className="btn-primary group h-12 px-6 text-base shadow-lg shadow-brand/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={20} className="transition-transform group-hover:rotate-90" />
            Create Project
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Stats Grid */}
            <section className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {metricCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.label}
                    className="group relative overflow-hidden rounded-[32px] border border-border-subtle bg-surface p-7 transition-all hover:border-brand/40 hover:bg-surface-elevated"
                  >
                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-base text-brand group-hover:bg-brand group-hover:text-white transition-all duration-300">
                          <Icon size={24} />
                        </div>
                        <p className="mt-6 text-sm font-semibold text-muted uppercase tracking-wider">{card.label}</p>
                        <p className="mt-1 text-4xl font-black tracking-tight text-text-base">{card.value}</p>
                        <p className="mt-2 text-xs font-medium text-muted/70">{card.helper}</p>
                      </div>
                      <ArrowUpRight size={20} className="text-muted/40 group-hover:text-brand transition-colors" />
                    </div>
                    
                    {/* Decorative background accent */}
                    <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-brand/5 blur-2xl transition-all group-hover:bg-brand/10" />
                  </article>
                );
              })}
            </section>

            {/* Projects Section */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-text-base flex items-center gap-3">
                  <BarChart3 size={24} className="text-brand" />
                  Active Projects
                </h2>
                {hasProjects && (
                  <Link href="/projects" className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline group">
                    View Gallery
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>

              {hasProjects ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {initialProjects.slice(0, 4).map((project) => (
                    <ProjectCard
                      key={project._id}
                      id={project._id}
                      name={project.name}
                      memberCount={project.memberCount}
                      taskCount={project.taskCount}
                      showActions={false}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-border-subtle bg-surface/30 p-16 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted/10 text-muted mb-6">
                    <LayoutGrid size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-text-base">No workspace activity</h3>
                  <p className="mt-3 text-muted max-w-sm text-base leading-relaxed">
                    Ready to start something new? Create your first project and invite your team to begin.
                  </p>
                  <Link 
                    href="/projects" 
                    className="mt-8 btn-primary px-8"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4">
            <section className="sticky top-6 rounded-[32px] border border-border-subtle bg-surface/50 p-8 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-text-base flex items-center gap-3 mb-8">
                <Clock size={22} className="text-brand" />
                Recent Activity
              </h3>
              
              <div className="space-y-8">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <div key={task._id} className="group relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-brand ring-4 ring-brand/10 z-10" />
                        <div className="h-full w-0.5 bg-border-subtle group-last:hidden mt-2" />
                      </div>
                      <div className="pb-4">
                        <p className="text-xs font-bold text-brand uppercase tracking-widest mb-1">
                          {task.projectId.name}
                        </p>
                        <h4 className="text-[15px] font-semibold text-text-base line-clamp-1 group-hover:text-brand transition-colors cursor-pointer">
                          {task.title}
                        </h4>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} />
                            {formatTime(task.createdAt)}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-muted/40" />
                          <span className={`${
                            task.status === 'Done' ? 'text-green-600' : 
                            task.status === 'In Progress' ? 'text-blue-500' : 'text-orange-500'
                          } font-medium`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <div className="bg-muted/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 text-muted/50">
                      <Clock size={20} />
                    </div>
                    <p className="text-sm text-muted">No recent tasks found.</p>
                  </div>
                )}
              </div>

              <div className="mt-10 pt-8">
                <p className="text-sm font-semibold text-text-base mb-2">New to Sprinto?</p>
                <p className="text-xs text-muted mb-6 leading-relaxed">
                  Join our community of 10k+ developers moving faster with better project management.
                </p>
                <button className="w-full btn-secondary text-sm h-11">
                  View Docs
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
