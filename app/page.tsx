import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-white to-white px-4 py-12 sm:px-6">
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-purple-400 to-primary" />
      <Logo className="mb-8 scale-100 sm:mb-10 sm:scale-110" iconSize={40} />
      <h1 className="mb-5 max-w-4xl text-center text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
        Manage Projects with <span className="text-primary italic">Speed.</span>
      </h1>
      <p className="mb-8 max-w-2xl text-center text-base leading-relaxed text-gray-500 text-balance sm:mb-10 sm:text-xl">
        Sprinto is the modern task management platform designed for high-performance teams.
        Clean, fast, and remarkably intuitive.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center">
        <a href="/login" className="rounded-xl bg-primary px-8 py-3 text-center font-semibold text-white shadow-lg shadow-purple-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-purple-700">
          Get Started Free
        </a>
        <a href="/signup" className="rounded-xl border border-gray-200 bg-white px-8 py-3 text-center font-semibold text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50">
          Create Account
        </a>
      </div>
      <div className="mt-14 flex flex-wrap justify-center gap-6 opacity-40 grayscale pointer-events-none sm:mt-20 sm:gap-12">
        <div className="text-lg font-bold uppercase tracking-widest sm:text-xl">Minimal</div>
        <div className="text-lg font-bold uppercase tracking-widest sm:text-xl">Modern</div>
        <div className="text-lg font-bold uppercase tracking-widest sm:text-xl">Clean</div>
      </div>
    </main>
  );
}
