/**
 * @jest-environment jsdom
 *
 * Await-point breadcrumbs: a wedge at a long await (Q&A modal, proceed
 * popup) must be reported WHERE IT HAPPENED, not at the last flushed row.
 * The unload stamp reads status.currentFunction — these tests pin that the
 * long awaits set it for their duration and restore it after.
 */
import { jest, expect, describe, test, beforeEach } from "@jest/globals";

jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: jest.fn((_k: string, _l?: string) => "Return"),
}));
jest.mock("../components/response", () => ({
  canClick: jest.fn(() => false),
  canType: jest.fn(() => true),
}));
jest.mock("../components/utils", () => ({
  safeExecuteFunc: jest.fn(),
  showCursor: jest.fn(),
  logger: jest.fn(),
}));
jest.mock("../components/markdownInline", () => ({
  renderMarkdown: jest.fn((s: string) => s),
}));

jest.mock("../components/global", () => ({
  // global re-exports the REAL status object (global.js line 351) — share it.
  status: require("../components/status").status,
}));

import { withBreadcrumb, status } from "../components/status";
import { addPopupLogic } from "../components/popup";
import { readFileSync } from "fs";

beforeEach(() => {
  status.currentFunction = "trialRoutineEnd";
  jest.clearAllMocks();
});

describe("withBreadcrumb", () => {
  test("sets the breadcrumb for the duration of the await, restores after", async () => {
    let seen = "";
    const out = await withBreadcrumb("questionAndAnswerSwal", async () => {
      seen = status.currentFunction;
      return 42;
    });
    expect(seen).toBe("questionAndAnswerSwal");
    expect(out).toBe(42);
    expect(status.currentFunction).toBe("trialRoutineEnd");
  });

  test("restores the breadcrumb even when the await rejects", async () => {
    await expect(
      withBreadcrumb("questionAndAnswerSwal", async () => {
        throw new Error("swal blew up");
      }),
    ).rejects.toThrow("swal blew up");
    expect(status.currentFunction).toBe("trialRoutineEnd");
  });
});

describe("addPopupLogic — breadcrumb for the proceed-popup wait", () => {
  test("breadcrumb is popup:<keyName> while waiting, restored on resolve", async () => {
    // Stage the popup DOM that proceed() touches (jsdom has no experiment page).
    for (const id of [
      "takeABreak-container",
      "takeABreak-title",
      "takeABreak-sub-text",
      "takeABreak-continue-button",
    ]) {
      const el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    const done = addPopupLogic("takeABreak", "typing");
    expect(status.currentFunction).toBe("popup:takeABreak");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await done;
    expect(status.currentFunction).toBe("trialRoutineEnd");
  });
});

describe("Q&A modal awaits are wrapped (source contract)", () => {
  test("the pure-QA Swal in threshold.js carries the questionAndAnswerSwal breadcrumb", () => {
    const src = readFileSync("threshold.js", "utf8");
    const swalAt = src.indexOf(
      'input: choiceQuestionBool ? "radio" : "textarea"',
    );
    expect(swalAt).toBeGreaterThan(-1);
    const before = src.lastIndexOf("withBreadcrumb", swalAt);
    expect(before).toBeGreaterThan(-1);
    expect(src.slice(before, before + 60)).toContain("questionAndAnswerSwal");
  });

  test("questionAndAnswerForImage's Swal awaits carry the breadcrumb", () => {
    const src = readFileSync("components/image.js", "utf8");
    const fnAt = src.indexOf("export const questionAndAnswerForImage");
    const body = src.slice(fnAt);
    const wrapped =
      body.match(/withBreadcrumb\(\s*"questionAndAnswerSwal"/g) ?? [];
    // two Swal paths: thumbnails and the direct await
    expect(wrapped.length).toBeGreaterThanOrEqual(2);
  });
});
