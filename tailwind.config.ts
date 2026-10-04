import type { Config } from "tailwindcss";

// Colour tokens live in globals.css as CSS variables so they can be themed in one place.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        surface: token("surface"),
        ink: token("ink"),
        muted: token("muted"),
        line: token("line"),
        brand: { DEFAULT: token("brand"), soft: token("brand-soft"), deep: token("brand-deep") },
        calm: { DEFAULT: token("calm"), soft: token("calm-soft") },
        warn: { DEFAULT: token("warn"), soft: token("warn-soft") },
        urgent: { DEFAULT: token("urgent"), soft: token("urgent-soft") },
        ok: { DEFAULT: token("ok"), soft: token("ok-soft") },
      },
      fontFamily: {
        sans: [
          "var(--font-latin)",
          "var(--font-ta)",
          "var(--font-hi)",
          "var(--font-te)",
          "var(--font-ml)",
          "var(--font-kn)",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: { card: "1.25rem" },
      boxShadow: {
        card: "0 1px 2px rgb(31 42 46 / 0.06), 0 2px 8px rgb(31 42 46 / 0.05)",
      },
      minHeight: { touch: "3rem", action: "4.5rem" },
      minWidth: { touch: "3rem" },
    },
  },
  plugins: [],
} satisfies Config;
