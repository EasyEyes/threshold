import { describe, test, expect } from "@jest/globals";
import { status, resetBlockScopedStatus } from "../components/status";

/** Run-level fields resetBlockScopedStatus leaves untouched (managed by the
 * flow scheduler, not the per-block reset). */
const RUN_LEVEL_FIELDS = new Set(["block", "nthBlock", "consentGiven"]);

const SENTINEL = "__DIRTY__";

describe("resetBlockScopedStatus", () => {
  test("resets every block-scoped own property of status, and only those", () => {
    const keys = Object.keys(status);
    const blockScopedKeys = keys.filter((key) => !RUN_LEVEL_FIELDS.has(key));
    expect(blockScopedKeys.length).toBeGreaterThan(0);

    // Snapshot fresh values: maps by size, scalars by value.
    const fresh = Object.fromEntries(
      keys.map((key) => {
        const value = (status as unknown as Record<string, unknown>)[key];
        return [key, value instanceof Map ? value.size : value];
      }),
    );

    // Dirty every own property (block-scoped AND run-level).
    for (const key of keys) {
      const value = (status as unknown as Record<string, unknown>)[key];
      if (value instanceof Map) {
        value.set(SENTINEL, 999);
      } else {
        (status as unknown as Record<string, unknown>)[key] = SENTINEL;
      }
    }

    resetBlockScopedStatus();

    for (const key of keys) {
      const value = (status as unknown as Record<string, unknown>)[key];
      if (RUN_LEVEL_FIELDS.has(key)) {
        // left dirty (run-level)
        expect(value).toBe(SENTINEL);
      } else if (value instanceof Map) {
        // cleared (block-scoped map)
        expect(value.size).toBe(fresh[key]);
        expect(value.has(SENTINEL)).toBe(false);
      } else {
        // restored (block-scoped scalar)
        expect(value).toBe(fresh[key]);
      }
    }
  });
});
