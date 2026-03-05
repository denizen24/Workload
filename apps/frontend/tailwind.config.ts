import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          light: "#f7f5f2",
          dark: "#1f1f22"
        },
        ui: {
          mutedLight: "#475569",
          mutedDark: "#94a3b8",
          success: "#16a34a",
          warning: "#d97706",
          danger: "#dc2626",
          info: "#2563eb"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
