/**
 * @jest-environment jsdom
 *
 * components/runtimeErrorMessage — the fatal run-time error dialog's text.
 *
 * Contract under test:
 *  - three parts in order: participant's language, English, technical details
 *  - the English parts are always dir="ltr", even when <body dir> is "rtl",
 *    which is what made earlier Persian-study errors unreadable
 *  - the English part is dropped when the study is already in English
 *  - a missing or unloaded phrase table still yields a complete dialog
 */
import type { PhrasesData } from "../../source/components/types";

const phrases: PhrasesData = {
  version: "test",
  phrases: {
    EE_LanguageDirection: { en: "LTR", fa: "RTL" },
    EE_errorDialogTitle: { en: "Error", fa: "خطا" },
    EE_studyEndedWithError: {
      en: "The study ended with this error.",
      fa: "مطالعه با این خطا پایان یافت.",
    },
    EE_unspecifiedJavascriptError: {
      en: "Unspecified JavaScript error",
      fa: "خطای نامشخص جاوااسکریپت",
    },
    EE_ok: { en: "OK", fa: "تأیید" },
  },
};

const context = {
  where: "initInstructionRoutineBegin",
  block: 11,
  condition: "3",
  trial: 6,
  conditionName: "crowding",
  experiment: "Compare3Languages73",
  currentTime: "Aug 8, 2026 11:58 AM EDT",
  compilerUpdated: "Aug 8, 2026 9:29 AM EDT",
};

const errorDescription = 'Phrase "T_guessingGame" not defined. Language "fa".';

const loadComposer = async (withPhrases = true) => {
  jest.resetModules();
  if (withPhrases) {
    const registry = await import("../parameters/phrasesRegistry");
    registry.initPhrases(phrases);
  }
  return import("../components/runtimeErrorMessage.js");
};

const parse = (html: string) => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return Array.from(root.querySelectorAll(":scope > div > div"));
};

describe("buildRuntimeErrorMessage", () => {
  afterEach(() => {
    document.body.removeAttribute("dir");
  });

  it("orders the message: localized, then English, then details", async () => {
    const { buildRuntimeErrorMessage } = await loadComposer();

    const { html } = buildRuntimeErrorMessage({
      errorDescription,
      context,
      language: "fa",
    });
    const blocks = parse(html);

    expect(blocks).toHaveLength(3);
    // a. Localized: title, summary, hint
    expect(blocks[0].getAttribute("lang")).toBe("fa");
    expect(blocks[0].textContent).toContain("خطا");
    expect(blocks[0].textContent).toContain("مطالعه با این خطا پایان یافت.");
    // b. English: title, summary, hint
    expect(blocks[1].getAttribute("lang")).toBe("en");
    expect(blocks[1].textContent).toContain("Error");
    expect(blocks[1].textContent).toContain("The study ended with this error.");
    // c. English: technical details
    expect(blocks[2].textContent).toContain(errorDescription);
  });

  it("titles the dialog in the participant's language and direction", async () => {
    const { buildRuntimeErrorMessage } = await loadComposer();

    const message = buildRuntimeErrorMessage({
      errorDescription,
      context,
      language: "fa",
    });

    expect(message.title).toBe("خطا");
    expect(message.titleDirection).toBe("rtl");
    expect(message.titleLanguage).toBe("fa");
    expect(message.okText).toBe("تأیید");
  });

  it("lays the English out left-to-right inside an RTL study", async () => {
    const { buildRuntimeErrorMessage } = await loadComposer();
    document.body.setAttribute("dir", "rtl");

    const { html } = buildRuntimeErrorMessage({
      errorDescription,
      context,
      language: "fa",
    });
    const [localized, english, technical] = parse(html);

    expect(localized.getAttribute("dir")).toBe("rtl");
    expect(english.getAttribute("dir")).toBe("ltr");
    expect(technical.getAttribute("dir")).toBe("ltr");
    // Isolation keeps the surrounding RTL context from reordering these runs.
    expect(english.getAttribute("style")).toContain("unicode-bidi: isolate");
    expect(technical.getAttribute("style")).toContain("unicode-bidi: isolate");
  });

  it("when _language is English, shows only English summary then technical details", async () => {
    const { buildRuntimeErrorMessage } = await loadComposer();

    const message = buildRuntimeErrorMessage({
      errorDescription,
      context,
      language: "en",
    });
    const blocks = parse(message.html);

    // b + c only — no separate localized block
    expect(blocks).toHaveLength(2);
    expect(blocks[0].getAttribute("lang")).toBe("en");
    expect(blocks[0].getAttribute("dir")).toBe("ltr");
    expect(blocks[0].textContent).toContain("Error");
    expect(blocks[0].textContent).toContain("The study ended with this error.");
    expect(blocks[1].textContent).toContain(errorDescription);
    expect(message.title).toBe("Error");
    expect(message.titleLanguage).toBe("en");
    expect(message.okText).toBe("OK");
    expect(
      message.html.match(/The study ended with this error\./g),
    ).toHaveLength(1);
    // Visual break between participant text and developer details
    expect(message.html).toContain("<hr");
  });

  it("lists every technical detail, in English", async () => {
    const { buildRuntimeErrorMessage } = await loadComposer();

    const { html } = buildRuntimeErrorMessage({
      errorDescription,
      contextChain: ["when initialising the experiment"],
      context,
      language: "fa",
    });
    const technical = parse(html)[2];

    expect(technical.textContent).toContain("when initialising the experiment");
    expect(technical.textContent).toContain(
      "where: initInstructionRoutineBegin",
    );
    expect(technical.textContent).toContain(
      "block: 11, condition: 3, trial: 6",
    );
    expect(technical.textContent).toContain("conditionName: crowding");
    expect(technical.textContent).toContain("experiment: Compare3Languages73");
    expect(technical.textContent).toContain(
      "current time: Aug 8, 2026 11:58 AM EDT",
    );
    expect(technical.textContent).toContain(
      "Compiler updated Aug 8, 2026 9:29 AM EDT",
    );
  });

  it("names the error when the browser gave us nothing to report", async () => {
    const { buildRuntimeErrorMessage } = await loadComposer();

    const { html } = buildRuntimeErrorMessage({
      errorDescription: "   ",
      context,
      language: "fa",
    });
    const [localized, english] = parse(html);

    expect(localized.textContent).toContain("خطای نامشخص جاوااسکریپت");
    expect(english.textContent).toContain("Unspecified JavaScript error");
  });

  it("still shows a complete English dialog when the phrase table is unusable", async () => {
    // No initPhrases: every lookup throws, exactly as it does when a study
    // fails before the phrases finish loading.
    const { buildRuntimeErrorMessage } = await loadComposer(false);
    document.body.setAttribute("dir", "rtl");

    const message = buildRuntimeErrorMessage({
      errorDescription,
      context,
      language: "fa",
    });
    const blocks = parse(message.html);

    expect(message.title).toBe("Error");
    expect(message.okText).toBe("OK");
    // <body dir> still tells us the study is right-to-left.
    expect(message.titleDirection).toBe("rtl");
    expect(blocks).toHaveLength(3);
    expect(blocks[0].textContent).toContain("The study ended with this error.");
    expect(blocks[2].textContent).toContain(errorDescription);
  });

  it("escapes markup in the error so it cannot break the dialog", async () => {
    const { buildRuntimeErrorMessage } = await loadComposer();

    const { html } = buildRuntimeErrorMessage({
      errorDescription: "<img src=x onerror=alert(1)> failed",
      context,
      language: "fa",
    });

    expect(html).not.toContain("<img");
    expect(parse(html)[2].textContent).toContain(
      "<img src=x onerror=alert(1)> failed",
    );
  });
});

describe("getLanguageDirection", () => {
  afterEach(() => {
    document.body.removeAttribute("dir");
  });

  it("reads the direction from the phrase table", async () => {
    const { getLanguageDirection } = await loadComposer();
    expect(getLanguageDirection("fa")).toBe("rtl");
    expect(getLanguageDirection("en")).toBe("ltr");
  });

  it("falls back to <body dir> when the phrase table is unusable", async () => {
    const { getLanguageDirection } = await loadComposer(false);
    document.body.setAttribute("dir", "rtl");
    expect(getLanguageDirection("fa")).toBe("rtl");
  });
});

describe("formatErrorContextAsText", () => {
  it("saves the same details to the data file that the dialog shows", async () => {
    const { formatErrorContextAsText, errorContextLines } =
      await loadComposer();

    expect(formatErrorContextAsText(context)).toBe(
      "\n" + errorContextLines(context).join("\n") + "\n",
    );
    expect(formatErrorContextAsText(context)).toContain(
      "\nblock: 11, condition: 3, trial: 6",
    );
  });

  it("reports why the context is missing rather than dropping it", async () => {
    const { formatErrorContextAsText } = await loadComposer();

    expect(
      formatErrorContextAsText({
        contextBuildFailed: true,
        contextBuildError: "paramReader is undefined",
      }),
    ).toContain("Context unavailable: paramReader is undefined");
  });
});
