import * as fs from "fs";
import * as path from "path";

/** Only checked-in corpora: developer-local examples are not test fixtures. */
export function exampleTables(): Map<string, string> {
  const tables = new Map<string, string>();
  for (const dir of [
    path.resolve(__dirname, "../sim/assets"),
    path.resolve(__dirname, "../fixtures/validation-tables"),
    path.resolve(__dirname, "../../examples/tables"),
  ]) {
    for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
      tables.set(name, path.join(dir, name));
    }
  }
  return new Map([...tables].sort(([a], [b]) => a.localeCompare(b)));
}
