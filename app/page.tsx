import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-white to-white">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-400 to-primary"></div>
      <Logo className="mb-10 scale-110" iconSize={40} />
      <h1 className="text-5xl font-extrabold text-gray-900 mb-6 text-center tracking-tight">
        Manage Projects with <span className="text-primary italic">Speed.</span>
      </h1>
      <p className="text-xl text-gray-500 mb-10 text-center text-balance max-w-2xl leading-relaxed">
        Sprintio is the modern task management platform designed for high-performance teams. 
        Clean, fast, and remarkably intuitive.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none justify-center">
        <a href="/login" className="px-8 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-purple-200 hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-200 text-center">
          Get Started Free
        </a>
        <a href="/signup" className="px-8 py-3 border border-gray-200 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-center">
          Create Account
        </a>
      </div>
      <div className="mt-20 flex flex-wrap justify-center gap-12 opacity-40 grayscale pointer-events-none">
        <div className="font-bold text-xl uppercase tracking-widest">Minimal</div>
        <div className="font-bold text-xl uppercase tracking-widest">Modern</div>
        <div className="font-bold text-xl uppercase tracking-widest">Clean</div>
      </div>
    </main>
  );
}
