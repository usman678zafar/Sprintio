"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Eye, EyeOff } from "lucide-react";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import PublicLogo from "@/components/PublicLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();
  const callbackUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("callbackUrl") || "/dashboard"
      : "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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
    <div className="flex min-h-svh flex-col p-4 sm:p-6 lg:p-8">
      <header className="container mx-auto max-w-7xl px-4 py-4">
        <PublicLogo iconSize={32} />
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="panel-surface w-full max-w-md p-6 sm:p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-text-base">Welcome back</h1>
            <p className="mt-2 font-medium text-muted">Log in to manage your projects.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Email</label>
              <input
                type="email"
                required
                className="field-surface px-4 py-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="field-surface px-4 py-3 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-base"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="group flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-border-subtle text-primary focus:ring-primary"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-sm text-muted transition group-hover:text-text-base">Remember me for 30 days</span>
              </label>
              <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot?</a>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted/70">
            <div className="h-px flex-1 bg-border-subtle" />
            <span>or</span>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>

          <GoogleAuthButton callbackUrl={callbackUrl} disabled={loading} label="Log in with Google" />

          <div className="mt-6 text-center text-sm text-muted">
            Don't have an account?{" "}
            <a href="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
