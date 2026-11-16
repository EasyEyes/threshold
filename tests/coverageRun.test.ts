/**
 * @jest-environment node
 *
 * Unified single-screen `npm run coverage`: after the jest grid (inherited
 * TTY), the sim tier renders as a static 3-cell row in the same aesthetic —
 * cells flip in place, per-table output is swallowed unless a table fails
 * (then a captured tail prints below). These tests cover the sim region
 * state machine and the output-tail helper.
 */

const run = require("../server/coverageRun.ts");

describe("createSimTier", () => {
  test("static region: 3 pending cells and names from the start", () => {
    const tier = run.createSimTier({
      color: false,
      tables: ["image-identify-sim", "reading-identify-sim", "rsvpReading-sim"],
    });
    const lines = tier.lines();
    expect(lines[0]).toBe("sim tier 0/3");
    expect(lines[1]).toBe("· · ·");
    expect(lines[2]).toBe(
      "image-identify-sim ⏳ · reading-identify-sim ⏳ · rsvpReading-sim ⏳",
    );
  });

  test("tables flip in place with duration; failures flip red and note", () => {
    const tier = run.createSimTier({
      color: false,
      tables: ["a-sim", "b-sim", "c-sim"],
    });
    tier.done(0, true, 26);
    tier.done(1, false, 5);
    const lines = tier.lines();
    expect(lines[0]).toBe("sim tier 2/3");
    expect(lines[1]).toBe(". F ·"); // position fixed, only color changed
    expect(lines[2]).toBe("a-sim ✓ 26s · b-sim ✕ 5s · c-sim ⏳");
    expect(tier.failed()).toBe(true);
  });

  test("all good when every table passes", () => {
    const tier = run.createSimTier({ color: false, tables: ["a", "b"] });
    tier.done(0, true, 1);
    tier.done(1, true, 2);
    expect(tier.lines()[0]).toBe("sim tier 2/2");
    expect(tier.failed()).toBe(false);
  });

  test("colored mode uses the grid palette", () => {
    const tier = run.createSimTier({
      color: true,
      tables: ["a", "b"],
    });
    tier.done(0, false, 1);
    const cells = tier.lines()[1];
    expect(cells).toContain("█");
    expect(cells).toContain("\u001b[31m"); // failed cell red
    expect(cells).toContain("\u001b[2m"); // pending cell dim
  });
});

describe("tailOf", () => {
  test("keeps the last n lines of captured child output", () => {
    const text = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n");
    expect(run.tailOf(text, 3)).toBe("line 17\nline 18\nline 19");
    expect(run.tailOf("", 3)).toBe("");
  });
});
