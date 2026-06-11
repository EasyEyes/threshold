import { readFileSync } from "fs";
import { resolve } from "path";

test("marked CDN version matches devDependency", () => {
  const indexHtml = readFileSync(resolve(__dirname, "../index.html"), "utf8");
  const cdnMatch = indexHtml.match(/marked@([\d.]+)\//);
  expect(cdnMatch).not.toBeNull();

  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, "../package.json"), "utf8"),
  );
  const devDepVersion = (pkg.devDependencies?.marked || "").replace(
    /^[\^~]/,
    "",
  );
  expect(devDepVersion).toBe(cdnMatch![1]);
});
