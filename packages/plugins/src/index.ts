import type { Plugin } from "@form/core";

/**
 * @packageDocumentation
 * Lightweight plugin collection for the form store.
 */

/**
 * Schema validation plugin placeholder. Real logic will be provided later.
 */
export const schemaPlugin: Plugin = {
  name: "schema",
  setup() {
    return undefined;
  }
};

/**
 * DevTools bridge plugin placeholder. Helps during development.
 */
export const devtoolsPlugin: Plugin = {
  name: "devtools",
  setup() {
    return undefined;
  }
};

/**
 * Async backend bridge plugin placeholder. Demonstrates extension points.
 */
export const asyncPlugin: Plugin = {
  name: "async",
  setup() {
    return undefined;
  }
};

/**
 * Export all placeholder plugins for simple imports.
 */
export const placeholderPlugins = [schemaPlugin, devtoolsPlugin, asyncPlugin] as const;

export type { Plugin };
