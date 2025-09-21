import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  target: "es2020",
  minify: false,
  clean: true,
  treeshake: true,
  splitting: false,
  shims: false
});
