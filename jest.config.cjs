module.exports = {
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
    "^.+\\.[tj]sx?$": ["ts-jest", { useESM: true }],
  },
  testMatch: [
    "<rootDir>/tests/**/*.[jt]s?(x)",
    "<rootDir>/tests/**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  testPathIgnorePatterns: ["/__mocks__/"],
};
