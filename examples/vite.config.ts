import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@form/react": path.resolve(__dirname, "../packages/react/src/index.ts"),
      "@form/core": path.resolve(__dirname, "../packages/core/src/index.ts")
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
