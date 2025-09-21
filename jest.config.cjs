/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  collectCoverageFrom: [
    "packages/**/src/**/*.{ts,tsx}",
    "!packages/**/src/**/*.d.ts"
  ],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.test.json",
      useESM: true,
      isolatedModules: true
    }
  },
  moduleNameMapper: {
    "^@form/core$": "<rootDir>/packages/core/src/index.ts",
    "^@form/react$": "<rootDir>/packages/react/src/index.ts",
    "^@form/plugins$": "<rootDir>/packages/plugins/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1"
  }
};
