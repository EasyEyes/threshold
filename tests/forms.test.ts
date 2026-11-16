/**
 * @jest-environment jsdom
 *
 * Unit coverage for components/forms.js — consent form rendering (PDF &
 * markdown), payment-info composition, debrief follow-up, and the
 * experiment-ending notice. paramReader/axios/i18n are mocked; the DOM
 * assembly runs for real. `marked` is a page global in production, so it
 * is defined here as a plain transform.
 */

jest.mock("axios", () => ({ get: jest.fn() }));
jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: jest.fn((key: string) => {
    const phrases: Record<string, string> = {
      EE_Yes: "Yes",
      EE_No: "No",
      EE_ConsentTitle: "# Consent",
      EE_LanguageDirection: "ltr",
      EE_BelowConsentReportPayAndDuration:
        "You will be paid ⓊⓊⓊ𝟙𝟙𝟙 for 𝟚𝟚𝟚 minutes.",
      EE_BelowConsentReportPay: "Pay ⓊⓊⓊ𝟙𝟙𝟙.",
      EE_BelowConsentReportDuration: "Takes 𝟚𝟚𝟚 minutes.",
      EE_afterSayingNoToDebrief: "Why not?",
      EE_afterSayingNoToDebriefTextboxPlaceholder: "Tell us",
      EE_askConsentAgain: "Keep your data?",
    };
    return phrases[key] ?? `i18n:${key}`;
  }),
}));
jest.mock("../parameters/paramReader.ts", () => ({
  paramReader: { read: jest.fn() },
}));
jest.mock("../components/global", () => ({
  rc: { language: { value: "en" } },
  status: { consentGiven: false },
}));

import axios from "axios";
import { paramReader } from "../parameters/paramReader.ts";
import { status } from "../components/global";
import { readi18nPhrases } from "../components/readPhrases";
import {
  hideForm,
  showDebriefFollowUp,
  showExperimentEnding,
  showForm,
} from "../components/forms";

const readMock = paramReader.read as unknown as jest.Mock;
const getMock = axios.get as unknown as jest.Mock;
(window as any).marked = { parse: (s: string) => `<p>${s}</p>` };

beforeEach(() => {
  readMock.mockReset();
  getMock.mockReset();
  readMock.mockImplementation(() => [undefined]);
  // Non-consent form by default; individual tests override.
  readMock.mockImplementation((param: string) =>
    param === "_consentForm" ? ["someOther.pdf"] : [undefined],
  );
});

afterEach(() => {
  document.body.innerHTML = "";
  document.body.className = "";
  document.documentElement.className = "";
  status.consentGiven = false;
});

// ---------------------------------------------------------------------------
// PDF & markdown consent forms
// ---------------------------------------------------------------------------

describe("showForm", () => {
  it("resolves true immediately without a form", async () => {
    await expect(showForm(null)).resolves.toBe(true);
    await expect(showForm("")).resolves.toBe(true);
  });

  it("resolves false and renders nothing for a non-string form name", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      await expect(showForm(123 as any)).resolves.toBe(false);
      // flush the task queues so a latent executor throw surfaces as an
      // unhandled rejection
      await new Promise((r) => setTimeout(r, 0));
      expect(unhandled).toEqual([]);
      expect(document.getElementById("form-container")).toBeNull();
      expect(document.getElementById("form-pdf")).toBeNull();
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("renders a PDF form and resolves on Yes/No", async () => {
    const p = showForm("consent.pdf", false);
    const iframe = document.getElementById("form-pdf") as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute("src")).toBe(
      "forms/consent.pdf#toolbar=0&navpanes=0&scrollbar=0",
    );
    expect(document.getElementById("form-yes").textContent).toBe("Yes");
    expect(document.getElementById("form-no").textContent).toBe("No");
    expect(document.getElementById("consent-page-title")).toBeNull(); // no payment info

    document.getElementById("form-no").click();
    await expect(p).resolves.toBe(false);
  });

  it("renders a markdown form fetched over axios", async () => {
    getMock.mockResolvedValue({ data: "Hello **world**" });
    const p = showForm("intro.md", false);
    // macrotask flush: lets the awaited axios.get + render settle
    await new Promise((r) => setTimeout(r, 0));
    expect(getMock).toHaveBeenCalledWith("/forms/intro.md");
    const md = document.getElementById("form-md");
    expect(md.innerHTML).toBe("<p>Hello **world**</p>");
    document.getElementById("form-yes").click();
    await expect(p).resolves.toBe(true);
  });

  it("auto-shows payment info only on the consent form", async () => {
    readMock.mockImplementation((param: string) => {
      switch (param) {
        case "_consentForm":
          return ["consent.pdf"];
        case "_online2PayShow":
          return ["payAndTime"];
        case "_online2PayCurrencyCode":
          return ["EUR"];
        case "_online2PayPerHour":
          return ["12"];
        case "_online2Minutes":
          return ["30"];
        default:
          return [undefined];
      }
    });
    const p = showForm("consent.pdf"); // showPaymentInfo auto-detected
    const payment = document.getElementById("form-payment-info");
    expect(payment).not.toBeNull();
    // 12 €/hour × 30 min = 6.00 EUR; ⓊⓊⓊ stripped, 𝟚𝟚𝟚 → 30
    expect(payment.innerHTML).toContain("6.00");
    expect(payment.innerHTML).toContain("EUR");
    expect(payment.innerHTML).toContain("30 minutes");
    expect(payment.innerHTML).not.toContain("Ⓤ");
    expect(document.getElementById("consent-page-title")).not.toBeNull();
    document.getElementById("form-yes").click();
    await expect(p).resolves.toBe(true);
  });

  it("auto-hides payment info on non-consent forms and on read errors", async () => {
    // not the consent form (default mock: _consentForm = someOther.pdf)
    const p1 = showForm("other.pdf");
    expect(document.getElementById("form-payment-info")).toBeNull();
    expect(document.getElementById("consent-page-title")).toBeNull();
    document.getElementById("form-yes").click();
    await expect(p1).resolves.toBe(true);

    // _consentForm read throws → degrades to no payment info, still renders
    readMock.mockImplementation((param: string) => {
      if (param === "_consentForm") throw new Error("absent");
      return [undefined];
    });
    const p2 = showForm("broken.pdf");
    expect(document.getElementById("form-pdf")).not.toBeNull();
    expect(document.getElementById("form-payment-info")).toBeNull();
    document.getElementById("form-yes").click();
    await expect(p2).resolves.toBe(true);
  });

  it("uses the flat _online2Pay when payPerHour is absent", async () => {
    readMock.mockImplementation((param: string) => {
      switch (param) {
        case "_online2PayShow":
          return ["pay"];
        case "_online2Pay":
          return ["15"];
        default:
          return [undefined];
      }
    });
    const p = showForm("consent.pdf", true);
    const payment = document.getElementById("form-payment-info");
    expect(payment.innerHTML).toContain("15.00");
    expect(payment.innerHTML).toContain("Pay");
    document.getElementById("form-no").click();
    await expect(p).resolves.toBe(false);
  });

  it("shows no payment element when _online2PayShow is none", async () => {
    readMock.mockImplementation((param: string) =>
      param === "_online2PayShow" ? ["none"] : [undefined],
    );
    const p = showForm("consent.pdf", true);
    expect(document.getElementById("form-payment-info")).toBeNull();
    document.getElementById("form-yes").click();
    await expect(p).resolves.toBe(true);
  });

  it("unknown currency codes fall back to the code itself", async () => {
    readMock.mockImplementation((param: string) => {
      switch (param) {
        case "_online2PayShow":
          return ["time"];
        case "_online2PayCurrencyCode":
          return ["XYZ"];
        case "_online2Minutes":
          return ["45"];
        default:
          return [undefined];
      }
    });
    const p = showForm("consent.pdf", true);
    const payment = document.getElementById("form-payment-info");
    expect(payment.innerHTML).toContain("45 minutes");
    document.getElementById("form-yes").click();
    await expect(p).resolves.toBe(true);
  });

  it("an rtl phrase direction marks the title rtl", async () => {
    (readi18nPhrases as jest.Mock).mockImplementationOnce(() => "RTL");
    readMock.mockImplementation((param: string) =>
      param === "_online2PayShow" ? ["none"] : [undefined],
    );
    const p = showForm("consent.pdf", true);
    expect(
      document.getElementById("consent-page-title").classList.contains("rtl"),
    ).toBe(true);
    document.getElementById("form-yes").click();
    await expect(p).resolves.toBe(true);
  });
});

describe("hideForm", () => {
  it("removes every form element", () => {
    const p = showForm("consent.pdf", false);
    expect(document.getElementById("form-container")).not.toBeNull();
    hideForm();
    for (const id of [
      "form-container",
      "form-pdf",
      "form-md",
      "form-input",
      "form-payment-info",
      "consent-page-title",
    ]) {
      expect(document.getElementById(id)).toBeNull();
    }
    // The pending promise is simply left unresolved by design.
    document.getElementById("form-yes")?.click(); // nothing to click anymore
    void p;
  });
});

// ---------------------------------------------------------------------------
// Debrief follow-up
// ---------------------------------------------------------------------------

describe("showDebriefFollowUp", () => {
  it("submits free-text feedback without a consent question", async () => {
    const p = showDebriefFollowUp("en");
    expect(status.consentGiven).toBe(false);
    expect(
      document.querySelectorAll('input[name="consent-again"]').length,
    ).toBe(0);
    (
      document.getElementById(
        "debrief-questions-textarea",
      ) as HTMLTextAreaElement
    ).value = "  too long  ";
    document.querySelector("button.btn-success")!.click();
    await expect(p).resolves.toEqual({
      questions: "too long",
      consent: undefined,
    });
    expect(document.getElementById("debrief-followup-container")).toBeNull();
  });

  it("asks for consent again and gates submission on the radio answer", async () => {
    status.consentGiven = true;
    const p = showDebriefFollowUp("en");
    const yes = document.getElementById("consent-yes") as HTMLInputElement;
    const no = document.getElementById("consent-no") as HTMLInputElement;
    expect(yes).not.toBeNull();

    // Submit starts disabled until a radio is chosen
    const submit = document.querySelector(
      "button.btn-success",
    ) as HTMLButtonElement;
    expect(submit.hasAttribute("disabled")).toBe(true);
    submit.click();
    await Promise.resolve();
    expect(
      document.getElementById("debrief-followup-container"),
    ).not.toBeNull();

    yes.click(); // change event updates the button
    expect(submit.hasAttribute("disabled")).toBe(false);
    (no as any).checked = true;
    submit.click();
    await expect(p).resolves.toEqual({ questions: "", consent: false });
  });
});

// ---------------------------------------------------------------------------
// Experiment ending
// ---------------------------------------------------------------------------

describe("showExperimentEnding", () => {
  it("creates a visible ending notice", () => {
    showExperimentEnding(true);
    const el = document.getElementById("exp-end-text") as HTMLElement;
    expect(el.textContent).toContain("Thank you");
    expect(el.style.visibility).toBe("visible");
  });

  it("reuses an existing #exp-end-text element when newEnding is false", () => {
    const existing = document.createElement("div");
    existing.id = "exp-end-text";
    document.body.appendChild(existing);
    showExperimentEnding(false);
    expect(document.querySelectorAll("#exp-end-text").length).toBe(1);
  });
});
