const base = require("./jest.config.cjs");

module.exports = {
  ...base,
  testPathIgnorePatterns: ["<rootDir>/node_modules"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testMatch: [
    "<rootDir>/tests/glossary-loader.test.ts",
    "<rootDir>/tests/phrases-loader.test.ts",
  ],
};
