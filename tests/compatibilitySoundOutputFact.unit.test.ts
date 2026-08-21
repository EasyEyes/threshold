/**
 * The sound-output browser-support fact row (✗ RC_BrowserLacksSoundSupport,
 * e.g. Firefox) in the Requirements-page ✓/✗ checklist. Per the v1.5 card,
 * lacking the needed APIs is a REJECTION — and it must be VISIBLE (the
 * original fatal check was invisible, showing all-✓ plus an incompatible
 * verdict).
 *
 * @jest-environment jsdom
 */
import { loadPhrasesForTests } from "./helpers/phrases";
import { summarizeKnownDeviceFacts } from "../components/compatibilityUI";

const mkReader = (rows: Record<string, string[]>): any => ({
  _blockCount: 1,
  read: (name: string) => rows[name] ?? [""],
});

const rc = { language: { value: "en" } } as any;

beforeAll(async () => {
  await loadPhrasesForTests();
});

describe("sound-output browser-support fact row", () => {
  it("demanded + no setSinkId (jsdom) → ✗ row naming the browser problem", () => {
    const facts = summarizeKnownDeviceFacts(
      mkReader({ needSoundOutput: ["headphones"] }),
      rc,
    );
    const fact = facts.find((f: any) => f.labelKey === "RC_SoundOutput");
    expect(fact).toBeDefined();
    expect(fact.ok).toBe(false);
    // Value carries the RC_BrowserLacksSoundSupport guidance.
    expect(String(fact.rawValue)).toMatch(/lacks needed sound support/i);
    expect(String(fact.rawValue)).toMatch(/Chrome or Edge/);
  });

  it("no demand → no row (the step skips itself; nothing to reject)", () => {
    const facts = summarizeKnownDeviceFacts(mkReader({}), rc);
    expect(
      facts.find((f: any) => f.labelKey === "RC_SoundOutput"),
    ).toBeUndefined();
  });
});
