"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M21.805 10.023H12.25v3.955h5.49c-.237 1.273-.957 2.351-2.037 3.075v2.558h3.305c1.935-1.782 3.047-4.405 3.047-7.523 0-.69-.062-1.353-.18-1.995Z"
        fill="#4285F4"
      />
      <path
        d="M12.25 22c2.745 0 5.047-.91 6.73-2.468l-3.305-2.558c-.91.61-2.075.972-3.425.972-2.646 0-4.89-1.788-5.69-4.19H3.146v2.64A10.16 10.16 0 0 0 12.25 22Z"
        fill="#34A853"
      />
      <path
        d="M6.56 13.755a6.1 6.1 0 0 1 0-3.87v-2.64H3.146a10.16 10.16 0 0 0 0 9.15l3.414-2.64Z"
        fill="#FBBC04"
      />
      <path
        d="M12.25 5.693c1.49 0 2.825.512 3.877 1.517l2.91-2.91C17.293 2.677 14.99 1.75 12.25 1.75a10.16 10.16 0 0 0-9.104 5.495l3.414 2.64c.8-2.403 3.044-4.192 5.69-4.192Z"
        fill="#EA4335"
      />
    </svg>
  );
}

type GoogleAuthButtonProps = {
  callbackUrl: string;
  disabled?: boolean;
  label?: string;
};

export default function GoogleAuthButton({
  callbackUrl,
  disabled = false,
  label = "Continue with Google",
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={() => {
        setLoading(true);
        void signIn("google", { callbackUrl });
      }}
      className="btn-secondary w-full py-3 text-base"
    >
      <GoogleIcon />
      {loading ? "Redirecting..." : label}
    </button>
  );
}
