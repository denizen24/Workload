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
        }
      }
    }
  },
  plugins: []
} satisfies Config;
