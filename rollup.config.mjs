import path from "node:path";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import { terser } from "@rollup/plugin-terser";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const INPUT_FILE = "src/index.ts";

const VARIANT_OUTPUTS = {
  base: {
    directory: "dist",
    fileBaseName: "index"
  },
  react: {
    directory: "dist/react",
    fileBaseName: "index"
  }
};

function normalizeVariants(commandLineArgs) {
  const detected = new Set();
  for (const key of Object.keys(commandLineArgs)) {
    if (key === "configTypes" || key === "config-types") {
      detected.add("types");
      continue;
    }

    if (key.startsWith("config")) {
      const maybeVariant = key.replace(/^config-?/, "");
      if (maybeVariant.length > 0) {
        detected.add(maybeVariant.toLowerCase());
      }
    }
  }

  if (detected.size === 0) {
    detected.add("base");
  }

  return Array.from(detected);
}

function createBundleConfig(variant) {
  const outputMeta = VARIANT_OUTPUTS[variant] ?? VARIANT_OUTPUTS.base;
  const baseFile = path.join(outputMeta.directory, outputMeta.fileBaseName);

  return {
    input: INPUT_FILE,
    output: [
      {
        file: `${baseFile}.js`,
        format: "esm",
        sourcemap: true
      },
      {
        file: `${baseFile}.cjs`,
        format: "cjs",
        sourcemap: true,
        exports: "named"
      }
    ],
    plugins: [
      peerDepsExternal(),
      resolve({ extensions: EXTENSIONS }),
      commonjs(),
      typescript({ tsconfig: "./tsconfig.rollup.json" }),
      terser({ format: { comments: false } })
    ]
  };
}

function createDtsConfig() {
  return {
    input: INPUT_FILE,
    output: {
      file: "dist/index.d.ts",
      format: "es"
    },
    plugins: [dts({ tsconfig: "./tsconfig.types.json" })]
  };
}

export default (commandLineArgs = {}) => {
  const variants = normalizeVariants(commandLineArgs);
  return variants.map((variant) => {
    if (variant === "types") {
      return createDtsConfig();
    }
    return createBundleConfig(variant);
  });
};
