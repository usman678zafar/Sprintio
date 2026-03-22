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
        brand: "#D97757",
        background: {
          light: "#FAF9F5",
          dark: "#262624",
        },
        surface: {
          light: "#F0EEE6",
          dark: "#141413",
        }
      },
      fontFamily: {
        sans: ["var(--font-poppins)"],
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
};

export default config;
