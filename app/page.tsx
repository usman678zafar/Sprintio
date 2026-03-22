import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div className="panel-surface relative w-full max-w-5xl overflow-hidden px-6 py-14 sm:px-10 lg:px-14">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="absolute -right-20 top-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-surface-elevated blur-3xl" />

        <Logo className="relative z-10 mb-10" iconSize={34} />

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Quietly Powerful Workflow
          </span>
          <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-[-0.04em] text-text-base sm:text-5xl lg:text-6xl">
            Calm project management for teams that need clarity without the noise.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted text-balance sm:text-lg">
            Sprinto brings projects, deadlines, and collaboration into one warm, focused workspace with a lighter visual footprint and a faster daily rhythm.
          </p>
        </div>

        <div className="relative z-10 mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row">
          <a href="/login" className="btn-primary px-7 py-3 text-base">
            Get Started
          </a>
          <a href="/signup" className="btn-secondary px-7 py-3 text-base">
            Create Account
          </a>
        </div>

        <div className="relative z-10 mt-14 grid gap-3 text-sm text-muted sm:grid-cols-3 sm:text-base">
          <div className="rounded-2xl border border-border-subtle bg-base/60 px-4 py-4 backdrop-blur-sm">
            Warm light and dark themes with system-aware switching.
          </div>
          <div className="rounded-2xl border border-border-subtle bg-base/60 px-4 py-4 backdrop-blur-sm">
            Structured navigation, cleaner cards, and gentler spacing.
          </div>
          <div className="rounded-2xl border border-border-subtle bg-base/60 px-4 py-4 backdrop-blur-sm">
            Fast enough for heavy work without looking loud or harsh.
          </div>
        </div>
      </div>
    </main>
  );
}
