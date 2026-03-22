import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12 sm:px-6">
      <div className="panel-surface w-full max-w-5xl px-6 py-14 sm:px-10 lg:px-14">
        <Logo className="mb-10" iconSize={34} />

        <div className="max-w-3xl">
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

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row">
          <a href="/login" className="btn-primary px-7 py-3 text-base">
            Get Started
          </a>
          <a href="/signup" className="btn-secondary px-7 py-3 text-base">
            Create Account
          </a>
        </div>

        <div className="mt-14 grid gap-3 text-sm text-muted sm:grid-cols-3 sm:text-base">
          <div className="rounded-2xl border border-border-subtle bg-base px-4 py-4">
            Warm light and dark themes with system-aware switching.
          </div>
          <div className="rounded-2xl border border-border-subtle bg-base px-4 py-4">
            Structured navigation, cleaner cards, and gentler spacing.
          </div>
          <div className="rounded-2xl border border-border-subtle bg-base px-4 py-4">
            Fast enough for heavy work without looking loud or harsh.
          </div>
        </div>
      </div>
    </main>
  );
}
