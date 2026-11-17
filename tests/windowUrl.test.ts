/**
 * @jest-environment node
 *
 * Unit tests for components/windowUrl.js — participant/session/study_id
 * query parsing and the Prolific daisy-chain redirect URL, extracted from
 * threshold.js (parseWindowURL / daisyChainURLBefore).
 *
 * Characterization tests: they pin CURRENT behavior, including the wart
 * that absent participant/session/study_id render as the literal string
 * "undefined" in the redirect URL (matching the browser behavior the
 * downstream Prolific endpoints see today).
 */
import {
  parseWindowQuery,
  daisyChainRedirectURL,
} from "../components/windowUrl.js";

describe("parseWindowQuery", () => {
  test("parses participant, session, study_id", () => {
    expect(parseWindowQuery("?participant=P1&session=3&study_id=S9")).toEqual({
      participant: "P1",
      session: "3",
      study_id: "S9",
      completedDaisyChainBefore: null,
    });
  });
  test("missing params are null, not undefined strings", () => {
    expect(parseWindowQuery("")).toEqual({
      participant: null,
      session: null,
      study_id: null,
      completedDaisyChainBefore: null,
    });
  });
  test("completedDaisyChainBefore flag is read", () => {
    expect(
      parseWindowQuery("?completedDaisyChainBefore=true")
        .completedDaisyChainBefore,
    ).toBe("true");
  });
  test("unrelated params are ignored", () => {
    expect(parseWindowQuery("?foo=1&participant=P").participant).toBe("P");
  });
});

describe("daisyChainRedirectURL", () => {
  test("no url → null (no redirect)", () => {
    expect(daisyChainRedirectURL("", { participant: "P" })).toBeNull();
    expect(daisyChainRedirectURL(undefined, {})).toBeNull();
  });
  test("already completed the chain before → null", () => {
    expect(
      daisyChainRedirectURL("https://app.prolific.co/next", {
        participant: "P",
        session: null,
        study_id: null,
        completedDaisyChainBefore: "true",
      }),
    ).toBeNull();
  });
  test("composes the full redirect URL", () => {
    expect(
      daisyChainRedirectURL("https://next.example/continue", {
        participant: "P1",
        session: "2",
        study_id: "S9",
        completedDaisyChainBefore: null,
      }),
    ).toBe(
      "https://next.example/continue" +
        "?external_id=P1&participant=P1&session=2&study_id=S9" +
        "&completedDaisyChainBefore=true",
    );
  });
  test("absent fields stringify as 'null' (current behavior)", () => {
    expect(
      daisyChainRedirectURL("https://next.example/continue", {
        participant: null,
        session: null,
        study_id: null,
        completedDaisyChainBefore: null,
      }),
    ).toBe(
      "https://next.example/continue" +
        "?external_id=null&participant=null&session=null&study_id=null" +
        "&completedDaisyChainBefore=true",
    );
  });
});
