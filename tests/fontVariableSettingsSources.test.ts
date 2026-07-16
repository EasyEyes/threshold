/**
 * validateVariableFontSettings — adobe coverage.
 *
 * Regression: the variable-axis validator did `if (source !== "file")
 * continue;`, so adobe fonts were never axis-checked. fontVariableSettings
 * on a non-variable adobe font slipped through compile and silently no-opped
 * at runtime. The validator now fetches adobe bytes (github open-source /
 * Typekit kit for paid) and runs get_font_variable_axes on them.
 *
 * Google is intentionally NOT covered here — it has a separate validator
 * (validateGoogleFontVariableSettings via the css2 API).
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";
import { loadGlossaryForTests } from "./helpers/glossary";
import { validateVariableFontSettings } from "../preprocess/experimentFileChecks";

jest.mock("../preprocess/global", () => ({
  typekit: { kitId: "", fonts: new Map() },
}));
import { typekit } from "../preprocess/global";
const mockTypekit = typekit as unknown as {
  kitId: string;
  fonts: Map<string, string>;
};

// initEasyEyesWasm uses `new Function("s","return import(s)")`, which fails
// under Jest (no --experimental-vm-modules). Return the real node WASM
// instead — it has get_font_variable_axes and is auto-initialized.
jest.mock("../preprocess/wasmFontLoader", () => ({
  initEasyEyesWasm: async () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../@rust/pkg-node/easyeyes_wasm.js"),
}));

const read = (name: string) =>
  fs.readFileSync(path.join(__dirname, "..", "examples", "fonts", name));
const FIRASANS = read("FiraSans.ttf"); // non-variable
const ROBOTOFLEX = read("RobotoFlex-Variable.woff2"); // variable (wght)

beforeAll(async () => {
  await loadGlossaryForTests();
});

const makeDf = (cols: Record<string, string[]>) => {
  const names = Object.keys(cols);
  const rows = cols[names[0]]?.length ?? 0;
  return {
    listColumns: () => names,
    dim: () => [rows, names.length],
    select: (col: string) => ({
      toArray: () => (cols[col] ?? []).map((v) => [v]),
    }),
  };
};

const variableDf = (fontSource: string, variableSettings: string) =>
  makeDf({
    font: ["SomeFont"],
    fontSource: [fontSource],
    fontVariableSettings: [variableSettings],
  });

/** github mock serving `bytes` for any font. */
const installGithubMock = (bytes: Buffer) => {
  global.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    if (u.startsWith("https://api.github.com/repos/")) {
      return new Response(
        JSON.stringify([
          {
            name: "SomeFont[wght].ttf",
            download_url: "https://raw.example/f.ttf",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (u.startsWith("https://raw.example/"))
      return new Response(bytes, { status: 200 });
    return new Response("nf", { status: 404 });
  }) as unknown as typeof fetch;
};

/** Typekit kit mock (paid adobe) serving `bytes`. */
const installTypekitMock = (bytes: Buffer) => {
  mockTypekit.kitId = "kit123";
  const css = `@font-face { font-family: "SomeFont"; src: url(https://use.typekit.net/af/x/y/l?primer=abc&fvd=n4&v=3) format("woff2"); }`;
  global.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    if (u.startsWith("https://api.github.com/repos/"))
      return new Response("nf", { status: 404 });
    if (u === "https://use.typekit.net/kit123.css")
      return new Response(css, { status: 200 });
    if (u.startsWith("https://use.typekit.net/af/"))
      return new Response(bytes, { status: 200 });
    return new Response("nf", { status: 404 });
  }) as unknown as typeof fetch;
};

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  mockTypekit.kitId = "";
  mockTypekit.fonts.clear();
});

describe("validateVariableFontSettings — adobe coverage", () => {
  it("adobe (github) + non-variable font + fontVariableSettings → error", async () => {
    installGithubMock(FIRASANS);
    const errs = await validateVariableFontSettings(
      variableDf("adobe", '"wght" 700'),
      "node",
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].name).toContain("not variable");
  });

  it("adobe (github) + variable font + valid axis → no error", async () => {
    installGithubMock(ROBOTOFLEX);
    const errs = await validateVariableFontSettings(
      variableDf("adobe", '"wght" 700'),
      "node",
    );
    expect(errs).toEqual([]);
  });

  it("adobe PAID (Typekit kit) + non-variable font + fontVariableSettings → error", async () => {
    installTypekitMock(FIRASANS);
    const errs = await validateVariableFontSettings(
      variableDf("adobe", '"wght" 700'),
      "node",
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].name).toContain("not variable");
  });
});
