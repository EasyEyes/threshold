/**
 * @jest-environment node
 *
 * "Parameter is unrecognized", two behaviors:
 *
 * 1. Invisible characters (zero-width space, bidi controls, …) in a column-A
 *    name are stripped during normalization, so a hidden-character twin of a
 *    valid parameter (e.g. "\u200Bblock") compiles as that parameter — no
 *    error at all. (Names are identifiers; no glossary key contains one.)
 *
 * 2. For genuinely unrecognized names, the "closest supported parameter"
 *    sentence renders the suggested name as a git-style diff against the
 *    supplied name: characters to delete in red with strikethrough,
 *    characters to add in green, shared characters plain. When the two names
 *    aren't similar enough to diff usefully, the suggestion stays plain.
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";
import { normalizeParameterName } from "../preprocess/parameterName";

beforeAll(async () => {
  await loadGlossaryForTests();
});

const BASE = `block,,1
conditionName,,A`;

const errorsFor = (csv: string) => {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  const t = new ExperimentTable(p.data as readonly (readonly string[])[]);
  return validateExperimentTable(t);
};

const unrecognized = (csv: string) =>
  errorsFor(csv).find((e) => e.name === "Parameter is unrecognized");

const RED = (s: string) =>
  `<span style="color: #bb2c22; font-weight: bold; text-decoration: line-through;">${s}</span>`;
const GREEN = (s: string) =>
  `<span style="color: #147133; font-weight: bold;">${s}</span>`;
const PARAM = (s: string) => `<span class="error-parameter">${s}</span>`;
const REVEALED = (s: string) =>
  `<span style="color: #bb2c22; font-weight: bold;">${s}</span>`;

describe("hidden-character twins are normalized, not errored", () => {
  it("zero-width space before a valid parameter name compiles as that parameter", () => {
    const errors = errorsFor(`${BASE}\n\u200BtargetKind,,letter`);
    expect(errors.some((e) => e.name === "Parameter is unrecognized")).toBe(
      false,
    );
  });

  it("normalizeParameterName trims/strips the ENDS only, never the middle", () => {
    expect(normalizeParameterName(" \u200B\u200D block \uFEFF ")).toBe("block");
    expect(normalizeParameterName("\u200DtargetKind\u200C")).toBe("targetKind");
    // A hidden character inside a name stays — different identifier
    expect(normalizeParameterName("blo\u200Cck")).toBe("blo\u200Cck");
    expect(normalizeParameterName("block")).toBe("block");
    expect(normalizeParameterName("\u200B\u200D")).toBe("");
  });
});

describe("closest-supported suggestion: plain name first, diff parenthetically", () => {
  it("surplus character: correct word plain, struck junk parenthetically after", () => {
    // targetKindz -> targetKind: delete "z"
    const error = unrecognized(`${BASE}\ntargetKindz,,letter`);
    expect(error).toBeDefined();
    expect(error!.message).toContain(
      `The closest supported parameter is ${PARAM("targetKind")} (${PARAM(
        "targetKind",
      )}${RED("z")}) &#8212 is that what you meant?`,
    );
  });

  it("missing character: green insertion inside the correct word", () => {
    // conditionNam -> conditionName: add "e"
    const error = unrecognized(`${BASE}\nconditionNam,,A`);
    expect(error).toBeDefined();
    expect(error!.message).toContain(
      `The closest supported parameter is ${PARAM("conditionName")} (${PARAM(
        "conditionNam",
      )}${GREEN("e")}) &#8212 is that what you meant?`,
    );
  });

  it("substituted character: correct characters in, struck junk outside", () => {
    // conditionNamw -> conditionName: the correct word reads unbroken with
    // the green "e" brought in; the struck "w" trails on the outside.
    const error = unrecognized(`${BASE}\nconditionNamw,,A`);
    expect(error).toBeDefined();
    expect(error!.message).toContain(
      `The closest supported parameter is ${PARAM("conditionName")} (${PARAM(
        "conditionNam",
      )}${GREEN("e")}${RED("w")}) &#8212 is that what you meant?`,
    );
  });

  it("mid-word substitution keeps the correct word contiguous", () => {
    // targertKind -> targetKind: "targetKind" reads unbroken; struck "r" outside
    const error = unrecognized(`${BASE}\ntargertKind,,letter`);
    expect(error).toBeDefined();
    expect(error!.message).toContain(
      `The closest supported parameter is ${PARAM("targetKind")} (${PARAM(
        "targe",
      )}${PARAM("tKind")}${RED("r")}) &#8212 is that what you meant?`,
    );
  });

  it("leading junk character: struck deletion before the shared name", () => {
    // %_consentForm -> _consentForm: delete "%" — already at the outside
    const error = unrecognized(`${BASE}\n%_consentForm,,x.pdf`);
    expect(error).toBeDefined();
    expect(error!.message).toContain(
      `The closest supported parameter is ${PARAM("_consentForm")} (${RED(
        "%",
      )}${PARAM("_consentForm")}) &#8212 is that what you meant?`,
    );
  });
});

describe("middle invisible characters: not stripped, but made visible", () => {
  it("echo shows the hidden character as a red code-point label", () => {
    const error = unrecognized(`${BASE}\nblo\u200Bck,,x`);
    expect(error).toBeDefined();
    // raw name preserved in parameters — the middle char is still there
    expect(error!.parameters).toEqual(["blo\u200Bck"]);
    // the reveal lives in the hint (the raw name above the title renders
    // invisible characters as nothing, so the hint is the only place the
    // corrupted name can be seen)
    expect(error!.hint).toContain(
      `The name blo${REVEALED("U+200B")}ck contains an invisible character`,
    );
  });

  it("diff suggestion shows the deletion as a struck, visible stand-in", () => {
    const error = unrecognized(`${BASE}\nblo\u200Bck,,x`);
    expect(error).toBeDefined();
    expect(error!.message).toContain(
      `The closest supported parameter is ${PARAM("block")} (${PARAM(
        "blo",
      )}${PARAM("ck")}${RED("U+200B")}) &#8212 is that what you meant?`,
    );
  });
});

describe("dissimilar suggestions stay plain", () => {
  it("no red/green spans when the names aren't close", () => {
    const error = unrecognized(`${BASE}\nzzzNotARealParam,,x`);
    expect(error).toBeDefined();
    expect(error!.message).toBe(
      `The closest supported parameter is ${PARAM(
        "_consentForm",
      )} &#8212 is that what you meant?`,
    );
    expect(error!.message).not.toContain("#bb2c22");
    expect(error!.message).not.toContain("#147133");
  });

  it("message states only the suggestion; no echo of the supplied name", () => {
    const error = unrecognized(`${BASE}\ntargetKindz,,letter`);
    expect(error).toBeDefined();
    expect(error!.message).toBe(
      `The closest supported parameter is ${PARAM("targetKind")} (${PARAM(
        "targetKind",
      )}${RED("z")}) &#8212 is that what you meant?`,
    );
    expect(error!.message).not.toContain("Sorry");
    expect(error!.message).not.toContain("couldn't recognize");
  });

  it("hint and parameters field keep their existing shape", () => {
    const error = unrecognized(`${BASE}\ntargetKindz,,letter`);
    expect(error!.parameters).toEqual(["targetKindz"]);
    expect(error!.hint).toMatch(
      /^The other closest supported parameters found were <span class="error-parameter">[a-zA-Z0-9_@]+<\/span> and <span class="error-parameter">[a-zA-Z0-9_@]+<\/span>\. All parameters are case-sensitive\.$/,
    );
  });
});
