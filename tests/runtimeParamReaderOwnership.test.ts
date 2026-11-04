import fs from "node:fs";
import path from "node:path";

const sourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.[jt]s$/.test(entry.name) ? [file] : [];
  });

describe("runtime ParamReader dependency direction", () => {
  it("components never import the reader back from the application entry point", () => {
    const root = path.resolve(__dirname, "..");
    const offenders = sourceFiles(path.join(root, "components"))
      .filter((file) => !file.endsWith(".d.ts"))
      .filter((file) =>
        /import\s*\{[^}]*\bparamReader\b[^}]*\}\s*from\s*["']\.\.\/threshold(?:\.js)?["']/s.test(
          fs.readFileSync(file, "utf8"),
        ),
      )
      .map((file) => path.relative(root, file));

    expect(offenders).toEqual([]);
  });

  it("never imports the deleted JavaScript reader module", () => {
    const root = path.resolve(__dirname, "..");
    const files = [
      ...sourceFiles(path.join(root, "components")),
      path.join(root, "threshold.js"),
    ];
    const offenders = files
      .filter((file) => !file.endsWith(".d.ts"))
      .filter((file) =>
        /parameters\/paramReader\.js/.test(fs.readFileSync(file, "utf8")),
      )
      .map((file) => path.relative(root, file));

    expect(offenders).toEqual([]);
  });

  it("uses one parameter module for reader types and runtime ownership", () => {
    const root = path.resolve(__dirname, "..");
    const files = [
      ...sourceFiles(path.join(root, "components")),
      path.join(root, "threshold.js"),
    ];
    const offenders = files
      .filter((file) => !file.endsWith(".d.ts"))
      .filter((file) =>
        /parameters\/(?:runtimeParamReader|parameterValues)/.test(
          fs.readFileSync(file, "utf8"),
        ),
      )
      .map((file) => path.relative(root, file));

    expect(offenders).toEqual([]);
  });
});
