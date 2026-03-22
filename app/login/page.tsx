"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Eye, EyeOff } from "lucide-react";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Get the callbackUrl from search parameters if it exists
    const searchParams = new URLSearchParams(window.location.search);
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const res = await signIn("credentials", {
      email,
      password,
      rememberMe,
      redirect: false,
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      // Use the callbackUrl if available, otherwise default to dashboard
      // If it's an absolute URL for the same host, Next.js push might be slow, so we can use window.location
      if (callbackUrl.startsWith("http")) {
        window.location.href = callbackUrl;
      } else {
        router.push(callbackUrl);
      }
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-[var(--color-light-surface)] )] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo className="mb-4" iconSize={28} />
          <p className="text-muted font-medium">Log in to manage your projects.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full px-4 py-2 border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted transition"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary cursor-pointer"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="text-sm text-muted group-hover:text-muted transition">Remember me for 30 days</span>
            </label>
            <a href="#" className="text-sm text-primary hover:underline font-medium">Forgot?</a>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-purple-700 transition disabled:opacity-70"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted">
          Don't have an account?{" "}
          <a href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
