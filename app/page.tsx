export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-primary mb-4">Welcome to Sprintio</h1>
      <p className="text-lg text-gray-600 mb-8 text-center text-balance max-w-md">
        A clean, responsive, and minimal platform for task and project management.
      </p>
      <div className="flex gap-4">
        <a href="/login" className="px-6 py-2 bg-primary text-white rounded-md font-medium hover:bg-purple-700 transition">
          Login
        </a>
        <a href="/signup" className="px-6 py-2 border border-gray-300 text-black rounded-md font-medium hover:bg-gray-50 transition">
          Sign Up
        </a>
      </div>
    </main>
  );
}
