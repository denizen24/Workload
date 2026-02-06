import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "../manifest.json",
          dest: "."
        },
        {
          src: "../public/*.*",
          dest: "."
        }
      ]
    }),
    viteStaticCopy({
      targets: [
        {
          src: "widgets/**/*.{svg,png,jpg,json}",
          dest: "."
        }
      ],
      structured: true
    })
  ],
  root: "./src",
  base: "",
  publicDir: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    copyPublicDir: false,
    target: ["es2022"],
    assetsDir: "widgets/assets",
    rollupOptions: {
      input: {
        calendar: resolve(__dirname, "src/widgets/calendar/index.html")
      }
    }
  }
});
