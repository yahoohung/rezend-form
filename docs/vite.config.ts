import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@form/core": resolve(currentDir, "../packages/core/src/index.ts")
    }
  },
  css: {
    postcss: "./postcss.config.cjs"
  }
});
