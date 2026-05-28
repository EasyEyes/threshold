module.exports = {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { useESM: true, isolatedModules: true }],
  },
  testMatch: [
    "<rootDir>/tests/**/*.[jt]s?(x)",
    "<rootDir>/tests/**/?(*.)+(spec|test).[jt]s?(x)",
  ],
};
