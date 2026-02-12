import { resolve } from "node:path";
import type { Config } from "tailwindcss";

export default {
  content: [resolve(__dirname, "src/**/*.{ts,tsx,html}")],
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
