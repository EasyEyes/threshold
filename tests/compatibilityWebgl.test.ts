/**
 * _needWebGL surfaces where the participant sees it: a ✓/✗ "known device
 * fact" row on the Device Compatibility pages, and a fatal unmet need in
 * checkSystemCompatibility (incompatibility exit + unmetNeeds CSV column).
 *
 * The fact-row half runs against the real summarizeKnownDeviceFacts with the
 * WebGL measurement mocked; the enforcement half is a source contract
 * (compatibilityCheck.js's import chain is not jsdom-loadable).
 *
 * @jest-environment jsdom
 */
import { loadPhrasesForTests } from "./helpers/phrases";

jest.mock("../components/webglRequirements", () => ({
  ...jest.requireActual("../components/webglRequirements"),
  getWebGLRequirements: jest.fn(),
}));

import { summarizeKnownDeviceFacts } from "../components/compatibilityUI";
import { getWebGLRequirements } from "../components/webglRequirements";
import { readFileSync } from "fs";
import * as path from "path";

const mocked = getWebGLRequirements as jest.Mock;

const mkReader = (rows: Record<string, string[]>): any => ({
  _blockCount: 1,
  read: (name: string) => rows[name] ?? [""],
});

const rc = { language: { value: "en" } } as any;

beforeAll(async () => {
  await loadPhrasesForTests();
});

const okCaps = {
  supported: true,
  version: 2,
  textureSize: 16384,
  portSize: 32767,
};
const defaultNeed = { version: 2, textureSize: 8192, portSize: 16384 };

describe("WebGL known-device-fact row (Requirements page checklist)", () => {
  it("capable device → ✓ row showing the WebGL version", () => {
    mocked.mockReturnValueOnce({
      need: defaultNeed,
      capabilities: okCaps,
      meetsNeed: true,
      unmet: [],
    });
    const facts = summarizeKnownDeviceFacts(mkReader({}), rc);
    const fact: any = facts.find((f: any) => f.labelKey === "EE_WebGLGraphics");
    expect(fact).toBeDefined();
    expect(fact.ok).toBe(true);
    expect(String(fact.rawValue)).toMatch(/WebGL 2/);
  });

  it("below minimum → ✗ row stating the needed minimum and the fix", () => {
    mocked.mockReturnValueOnce({
      need: { version: 2, textureSize: 16384, portSize: 16384 },
      capabilities: {
        supported: true,
        version: 2,
        textureSize: 8192,
        portSize: 16384,
      },
      meetsNeed: false,
      unmet: ["textureSize"],
    });
    const facts = summarizeKnownDeviceFacts(mkReader({}), rc);
    const fact: any = facts.find((f: any) => f.labelKey === "EE_WebGLGraphics");
    expect(fact.ok).toBe(false);
    // Participant must learn what is missing AND what to do about it.
    expect(String(fact.rawValue)).toMatch(/16384/);
    expect(String(fact.rawValue)).toMatch(/another browser or computer/i);
  });

  it("no WebGL context → ✗ row with the fix, never a silent pass", () => {
    mocked.mockReturnValueOnce({
      need: defaultNeed,
      capabilities: {
        supported: false,
        version: null,
        textureSize: null,
        portSize: null,
        unmaskedRenderer: "",
      },
      meetsNeed: false,
      unmet: ["support"],
    });
    const facts = summarizeKnownDeviceFacts(mkReader({}), rc);
    const fact: any = facts.find((f: any) => f.labelKey === "EE_WebGLGraphics");
    expect(fact.ok).toBe(false);
    expect(String(fact.rawValue)).toMatch(/another browser or computer/i);
  });

  it("row always present (defaults always demand WebGL)", () => {
    mocked.mockReturnValue({
      need: defaultNeed,
      capabilities: okCaps,
      meetsNeed: true,
      unmet: [],
    });
    const facts = summarizeKnownDeviceFacts(mkReader({}), rc);
    expect(facts.some((f: any) => f.labelKey === "EE_WebGLGraphics")).toBe(
      true,
    );
  });

  it("never shows raw [[N]] tokens, whether the sheet phrase or the fallback is used", () => {
    mocked.mockReturnValueOnce({
      need: { version: 2, textureSize: 16384, portSize: 32768 },
      capabilities: {
        supported: true,
        version: 2,
        textureSize: 8192,
        portSize: 16384,
      },
      meetsNeed: false,
      unmet: ["textureSize"],
    });
    const facts = summarizeKnownDeviceFacts(mkReader({}), rc);
    const fact: any = facts.find((f: any) => f.labelKey === "EE_WebGLGraphics");
    expect(String(fact.rawValue)).not.toMatch(/\[\[N\d+\]\]/);
    expect(String(fact.rawValue)).toMatch(/texture 16384/);
  });
});

describe("enforcement — source contract (checkSystemCompatibility)", () => {
  const src = readFileSync(
    path.join(__dirname, "..", "components", "compatibilityCheck.js"),
    "utf8",
  );

  it("unmet WebGL flips the device incompatible and records the unmet need", () => {
    expect(src).toContain('needsUnmet.push("_needWebGL")');
    expect(src).toMatch(
      /deviceIsCompatibleBool = false[\s\S]{0,200}needsUnmet\.push\("_needWebGL"\)/,
    );
  });

  it("guards against duplicate _needWebGL pushes (checkSystemCompatibility re-runs on language change)", () => {
    // needsUnmet is module-level and survives across calls; recompute()
    // (language change / refresh) calls checkSystemCompatibility again.
    // Without a guard, unmetNeeds in the CSV reads "_needWebGL,_needWebGL".
    // Same guard pattern as the _needSoundOutput push.
    expect(src).toMatch(
      /needsUnmet\.includes\("_needWebGL"\)[\s\S]{0,120}needsUnmet\.push\("_needWebGL"\)/,
    );
  });

  it("reads _needWebGL through getWebGLRequirements", () => {
    expect(src).toContain("getWebGLRequirements(reader)");
    expect(src).toContain('"_needWebGL"');
  });

  it("requirements note uses a phrase key with an English fallback", () => {
    expect(src).toMatch(/tryReadPhrase\("EE_needWebGL"/);
  });

  it("sheet phrases with [[N]] tokens are filled, not shown raw", () => {
    expect(src).toMatch(/fillPhrase\(webglPhrase,/);
  });
});

describe("diagnosis report — single measurement source", () => {
  it("runDiagnosisReport delegates context probing to measureWebGLCapabilities", () => {
    const utils = readFileSync(
      path.join(__dirname, "..", "components", "utils.js"),
      "utf8",
    );
    expect(utils).toContain("measureWebGLCapabilities");
  });
});
