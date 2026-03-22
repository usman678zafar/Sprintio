import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "var(--color-brand)",
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        "text-base": "var(--text-base)",
        "text-muted": "var(--text-muted)",
        "border-subtle": "var(--border-subtle)"
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
      }
    },
  },
  plugins: [],
};

export default config;
