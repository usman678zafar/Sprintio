import { LayoutGrid, List, Plus } from "lucide-react";

export default function ProjectsLoading() {
  return (
    <div className="min-h-full bg-base px-4 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1240px]">
        
        {/* Real-looking static header so it doesn't look like a skeleton */}
        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-base sm:text-4xl">Project Portfolio</h1>
            <p className="mt-3 text-lg font-medium text-muted">
              Overview of all your active workspaces and team missions.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 opacity-80">
            <button type="button" disabled className="btn-primary px-4 py-2.5">
              <Plus size={18} />
              Add New Project
            </button>
            <div className="flex h-11 items-center rounded-full border border-border-subtle bg-surface p-1">
              <button disabled className="flex h-9 w-12 items-center justify-center rounded-full bg-[#111827] text-white">
                <LayoutGrid size={18} />
              </button>
              <button disabled className="flex h-9 w-12 items-center justify-center rounded-full text-muted">
                <List size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Real-looking tabs */}
        <section className="mb-10 border-y border-border-subtle/50 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between opacity-80">
            <div className="flex h-14 items-center rounded-2xl border border-border-subtle bg-surface p-1.5 hidden sm:flex">
              <button disabled className="relative h-full rounded-xl px-6 text-sm font-bold uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20">
                All Projects
              </button>
              <button disabled className="relative h-full rounded-xl px-6 text-sm font-bold uppercase tracking-widest text-muted">
                Active
              </button>
              <button disabled className="relative h-full rounded-xl px-6 text-sm font-bold uppercase tracking-widest text-muted">
                Completed
              </button>
              <button disabled className="relative h-full rounded-xl px-6 text-sm font-bold uppercase tracking-widest text-muted">
                Archived
              </button>
            </div>
            
            {/* Mobile fallback tabs just to keep layout visually stable */}
            <div className="flex h-14 items-center rounded-2xl border border-border-subtle bg-surface p-1.5 sm:hidden">
              <button disabled className="relative h-full rounded-xl px-6 text-sm font-bold uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20">
                All Projects
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-muted/60">Sort by:</span>
              <div className="relative">
                <select disabled className="h-14 appearance-none rounded-2xl border border-border-subtle bg-surface pl-6 pr-12 text-sm font-bold uppercase tracking-widest text-text-base outline-none">
                  <option>Newest First</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                  <List size={16} strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fully solid dark skeleton blocks for cards ONLY */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div 
              key={item} 
              className="h-[310px] rounded-[32px] bg-border-subtle/50 animate-pulse border-none"
              style={{ animationDelay: `${item * 75}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
