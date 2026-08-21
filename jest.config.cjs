module.exports = {
  setupFilesAfterEnv: ["<rootDir>/tests/helpers/consoleNoiseFilter.ts"],
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^log4javascript$": "<rootDir>/tests/__mocks__/log4javascript.js",
    "^pixi\\.js-legacy$": "<rootDir>/tests/__mocks__/pixi.js",
    "\\.(css|less|scss)$": "<rootDir>/tests/__mocks__/styleMock.js",
  },
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { useESM: true, isolatedModules: true }],
  },
  testMatch: [
    "<rootDir>/tests/**/*.[jt]s?(x)",
    "<rootDir>/tests/**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  testPathIgnorePatterns: [
    "/helpers/",
    "/__mocks__/",
    "/assets/",
    // Playwright suites — run via `npx playwright test`, not Jest.
    // (tests/sim/e2e/ IS Jest and must not be ignored.)
    "<rootDir>/tests/e2e/",
    "<rootDir>/tests/mitmproxy/",
    // glossary-loader.test.ts uses TLA and must be run with NODE_OPTIONS=--experimental-vm-modules
    // via jest.esm.config.cjs (npm run test:loader).
    "<rootDir>/node_modules",
    "<rootDir>/tests/setup.ts",
    "<rootDir>/tests/glossary-loader.test.ts",
    "<rootDir>/tests/phrases-loader.test.ts",
  ],
};
