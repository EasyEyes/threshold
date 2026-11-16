/**
 * @jest-environment jsdom
 *
 * Unit coverage for components/compatibilityCheckHelpers.js — phone-model
 * database lookups, QR-skip UI construction, autocomplete suggestions, and
 * the markdown/asterisk formatting helpers. Firebase, Swal, and the heavy
 * compatibilityCheck module are mocked; everything else runs for real.
 */

jest.mock("../components/compatibilityCheck", () => ({
  getInstructionText: jest.fn(
    (...args: unknown[]) => `instructions:${JSON.stringify(args)}`,
  ),
  getPreferredModelNumberAndName: jest.fn(() => ({
    preferredModelNumber: "A1234",
    preferredModelName: "Phone 15",
  })),
}));
jest.mock("../components/firebase/firebase.js", () => ({ db: { id: "db" } }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, name) => ({ db, name })),
  query: jest.fn((c, ...preds) => ({ c, preds })),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  getDocs: jest.fn(),
}));
jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: { fire: jest.fn(), close: jest.fn() },
}));
jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: jest.fn((key: string) =>
    key === "RC_skipQR_Explanation"
      ? "Scan with your phone [[LLL]] or visit [[xxx]]"
      : `i18n:${key}`,
  ),
}));
jest.mock("../components/fontSizeUtils.ts", () => ({
  getOptimalSharedFontSize: jest.fn(),
}));

import Swal from "sweetalert2";
import { collection, getDocs } from "firebase/firestore";
import { getOptimalSharedFontSize } from "../components/fontSizeUtils.ts";
import { readi18nPhrases } from "../components/readPhrases.js";
import {
  addQRSkipButtons,
  convertAsterisksToList,
  fetchAllPhoneModels,
  formatLineBreak,
  getAutoCompleteSuggestionElements,
  matchPhoneModelInDatabase,
  AllBrands,
  AllModelNames,
  AllModelNumbers,
  PhoneModelsInDatabase,
} from "../components/compatibilityCheckHelpers";

const getDocsMock = getDocs as unknown as jest.Mock;

const snapshotOf = (docs: any[], size = docs.length) => ({
  size,
  forEach: (cb: (d: any) => void) => docs.forEach(cb),
});

const resetModuleArrays = () => {
  PhoneModelsInDatabase.length = 0;
  AllBrands.length = 0;
  AllModelNames.length = 0;
  AllModelNumbers.length = 0;
};

const galaxy = {
  Brand: "Samsung",
  "Model Name": "S21",
  "Model Numbers": ["SM-G991"],
  "Smaller Size (Pixels)": 1080,
  "Bigger Size (Pixels)": 2400,
};

beforeEach(() => {
  resetModuleArrays();
  getDocsMock.mockReset();
});

// ---------------------------------------------------------------------------
// Pure string formatting
// ---------------------------------------------------------------------------

describe("formatLineBreak", () => {
  it("turns newlines into <br> and [[LLL]] into a check-connection link", () => {
    const out = formatLineBreak(
      "Scan this\n\n[[LLL]] if stuck.",
      "Check your connection",
    );
    expect(out).toBe(
      'Scan this<br><br><a href="#" id="check-connection">Check your connection</a> if stuck.',
    );
  });
});

describe("convertAsterisksToList", () => {
  it("wraps bullet lines in <li> and opens a <ul>", () => {
    const out = convertAsterisksToList("* one<br>* two<br>");
    expect(out).toContain("<li>one</li>");
    expect(out).toContain("<li>two</li>");
    expect(out).toContain('<ul style="padding-left:40px"><br><li>');
  });

  it("closes the list when a numbered step follows", () => {
    const out = convertAsterisksToList("* one<br>* two<br>6. next step");
    expect(out).toMatch(/<\/li><\/ul>6\. next step/);
  });

  it("strips a trailing empty list item", () => {
    const out = convertAsterisksToList("hello<br>");
    expect(out).not.toContain("<li>");
  });

  it("leaves content without bullets untouched apart from list markers", () => {
    expect(convertAsterisksToList("no bullets")).toBe("no bullets");
  });
});

// ---------------------------------------------------------------------------
// Firestore phone-model library
// ---------------------------------------------------------------------------

describe("fetchAllPhoneModels", () => {
  it("collects models, brands, names, and numbers without duplicates", async () => {
    getDocsMock.mockResolvedValue(
      snapshotOf([
        { data: () => galaxy },
        { data: () => ({ ...galaxy, "Model Name": "S21" }) }, // dup name+number
        {
          data: () => ({
            Brand: "Google",
            "Model Name": "Pixel 8",
            "Model Numbers": ["GP8", "GP8a"],
          }),
        },
      ]),
    );
    await fetchAllPhoneModels();
    expect(PhoneModelsInDatabase).toHaveLength(3);
    expect(AllBrands).toEqual(["Samsung", "Google"]);
    expect(AllModelNames).toEqual(["S21", "Pixel 8"]);
    expect(AllModelNumbers).toEqual(["SM-G991", "GP8", "GP8a"]);
    expect(collection).toHaveBeenCalledWith(expect.anything(), "PhoneModels");
  });
});

describe("matchPhoneModelInDatabase", () => {
  beforeEach(() => {
    AllModelNames.push("S21");
    AllModelNumbers.push("SM-G991");
    PhoneModelsInDatabase.push(galaxy);
  });

  it("fully matches a known, profiled model (name+number+pixels+library)", async () => {
    getDocsMock.mockResolvedValue(snapshotOf([{}], 1));
    const r = await matchPhoneModelInDatabase(
      "Samsung",
      "s21",
      "SM-G991",
      1080,
      2400,
    );
    expect(r).toMatchObject({
      phoneModelNameKnownBool: true,
      phoneModelNumberKnownBool: true,
      phoneModelPixelsKnownBool: true,
      phoneModelNameAndNumberAgreeBool: true,
      phoneModelNumberAndPixelsAgreeBool: true,
      phoneModelKnownBool: true,
      phoneModelNameInLibraryBool: true,
      phoneModelProfiledBool: true,
    });
    // microphone lookup keys on model number + lowercased brand without spaces
    const q = (getDocsMock.mock.calls[0][0] as any).preds;
    expect(q).toContainEqual({ field: "ID", op: "==", value: "SM-G991" });
    expect(q).toContainEqual({
      field: "lowercaseOEM",
      op: "==",
      value: "samsung",
    });
  });

  it("pixels mismatch downgrades the match", async () => {
    getDocsMock.mockResolvedValue(snapshotOf([{}], 1));
    const r = await matchPhoneModelInDatabase(
      "Samsung",
      "S21",
      "SM-G991",
      999,
      2400,
    );
    expect(r.phoneModelPixelsKnownBool).toBe(false);
    expect(r.phoneModelNumberAndPixelsAgreeBool).toBe(false);
    expect(r.phoneModelKnownBool).toBe(false);
    expect(r.phoneModelProfiledBool).toBe(false);
  });

  it("absent microphone library entry blocks library/profiled flags", async () => {
    getDocsMock.mockResolvedValue(snapshotOf([], 0));
    const r = await matchPhoneModelInDatabase(
      "Samsung",
      "S21",
      "SM-G991",
      1080,
      2400,
    );
    expect(r.phoneModelKnownBool).toBe(true);
    expect(r.phoneModelNameInLibraryBool).toBe(false);
    expect(r.phoneModelProfiledBool).toBe(false);
  });

  it("unknown model reports all-false", async () => {
    getDocsMock.mockResolvedValue(snapshotOf([], 0));
    const r = await matchPhoneModelInDatabase(
      "Nokia",
      "3310",
      "NM-3310",
      84,
      48,
    );
    expect(Object.values(r).every((v) => v === false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// QR skip buttons
// ---------------------------------------------------------------------------

describe("addQRSkipButtons", () => {
  const makeQRElem = () => {
    const img = document.createElement("img");
    img.id = "qr";
    return img;
  };

  afterEach(() => {
    document.body.innerHTML = "";
    (getOptimalSharedFontSize as jest.Mock).mockClear();
  });

  it("builds three columns: QR, explanation with link, buttons", async () => {
    const qr = makeQRElem();
    const { qrContainer, cantReadButton, explanation } = addQRSkipButtons(
      "en",
      qr,
      "EASY-EYES-X",
      true,
    );
    expect(qrContainer.id).toBe("skipQRContainer");
    expect(qrContainer.contains(qr)).toBe(true);
    expect(explanation.id).toBe("skipQRExplanation");
    expect(explanation.innerHTML).toContain("<b>EASY-EYES-X</b>");
    expect(cantReadButton.id).toBe("cantReadButton");
    expect(qrContainer.querySelectorAll("button").length).toBe(3);
    expect(qrContainer.querySelector("#preferNotToReadButton")).not.toBeNull();
    expect(qrContainer.querySelector("#noSmartphoneButton")).not.toBeNull();
    // shared font sizing is requested after layout
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(getOptimalSharedFontSize).toHaveBeenCalled();
  });

  it("omits the prefer-not button when the phone survey is not needed", () => {
    const { qrContainer, preferNotToReadButton } = addQRSkipButtons(
      "en",
      makeQRElem(),
      "[]",
      false,
    );
    expect(qrContainer.querySelector("#preferNotToReadButton")).toBeNull();
    expect(preferNotToReadButton).toBeDefined();
    expect(qrContainer.querySelectorAll("button").length).toBe(2);
  });

  it("the check-connection link opens a Swal popup", () => {
    const { explanation } = addQRSkipButtons("en", makeQRElem(), "[]", false);
    document.body.appendChild(document.createElement("div"));
    const link = explanation.querySelector("a#check-connection") as HTMLElement;
    expect(link).not.toBeNull();
    link.click();
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    const html = (Swal.fire as jest.Mock).mock.calls[0][0].html as string;
    expect(html).toContain("i18n:RC_NeedInternetConnectedPhone");
    expect(html).toContain("i18n:EE_ok");
  });

  it("degrades gracefully when the phrase lacks the [[LLL]] marker", () => {
    // A phrase edit that drops the marker must not crash the QR panel —
    // the explanation renders as plain text, without the link.
    (readi18nPhrases as unknown as jest.Mock).mockImplementationOnce(
      () => "Plain explanation without a marker",
    );
    const { qrContainer, explanation } = addQRSkipButtons(
      "en",
      makeQRElem(),
      "[]",
      false,
    );
    expect(qrContainer.id).toBe("skipQRContainer");
    expect(explanation.textContent).toContain("Plain explanation");
    expect(explanation.querySelector("a#check-connection")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Autocomplete suggestions
// ---------------------------------------------------------------------------

describe("getAutoCompleteSuggestionElements", () => {
  const setup = (opts: { showSuggestionBool?: boolean } = {}) => {
    AllBrands.push("Apple", "Samsung");
    const p = document.createElement("p");
    const img = document.createElement("img");
    const input = document.createElement("input");
    const modelNameInput = document.createElement("input");
    const modelNumberInput = document.createElement("input");
    const container = getAutoCompleteSuggestionElements(
      "Brand",
      ["Apple", "Samsung", "Google"],
      input,
      "a1234",
      {},
      "en",
      true,
      p,
      img,
      modelNameInput,
      modelNumberInput,
      opts.showSuggestionBool ?? true,
    );
    return { p, img, input, modelNameInput, modelNumberInput, container };
  };

  afterEach(() => {
    document.body.innerHTML = "";
  });

  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event("input"));
  };

  it("lists matching brands with the typed part highlighted", () => {
    const { input, container } = setup();
    type(input, "Sam");
    const items = container.querySelectorAll(".autocomplete-item");
    expect(items.length).toBe(1);
    expect(items[0].innerHTML).toBe('<span class="highlight">Sam</span>sung');
  });

  it("shows a not-recognized notice when nothing matches", () => {
    const { input, container } = setup();
    type(input, "zzz");
    expect(container.querySelectorAll(".autocomplete-item").length).toBe(1);
    expect(container.textContent).toContain("i18n:EE_notRecognized");
  });

  it("clears suggestions when the input is emptied", () => {
    const { input, container } = setup();
    type(input, "Sam");
    type(input, "");
    expect(container.innerHTML).toBe("");
  });

  it("suppresses suggestions when showSuggestionBool is false", () => {
    const { input, container } = setup({ showSuggestionBool: false });
    type(input, "Sam");
    expect(container.innerHTML).toBe("");
  });

  it("Apple brand shows the image and iOS-model placeholders", () => {
    const {
      getPreferredModelNumberAndName,
    } = require("../components/compatibilityCheck");
    const { input, img, modelNumberInput, modelNameInput, p } = setup();
    type(input, "Apple");
    expect(img.style.display).toBe("block");
    expect(getPreferredModelNumberAndName).toHaveBeenCalledWith(
      "Apple",
      "iOS",
      "en",
    );
    expect(modelNumberInput.placeholder).toBe("A1234");
    expect(modelNameInput.placeholder).toBe("Phone 15");
    expect(p.innerHTML.length).toBeGreaterThan(0);
  });

  it("a non-Apple known brand hides the image and sets placeholders", () => {
    const {
      getPreferredModelNumberAndName,
    } = require("../components/compatibilityCheck");
    const { input, img, modelNumberInput } = setup();
    type(input, "Samsung");
    expect(img.style.display).toBe("none");
    expect(getPreferredModelNumberAndName).toHaveBeenCalledWith(
      "Samsung",
      "",
      "en",
    );
    expect(modelNumberInput.placeholder).toBe("A1234");
  });

  it("an unrecognized brand input still updates the instruction text", () => {
    const { getInstructionText } = require("../components/compatibilityCheck");
    const { input, p, img } = setup();
    type(input, "Sam"); // not (yet) a complete brand
    expect(img.style.display).toBe("none");
    expect(getInstructionText).toHaveBeenCalled();
    expect(p.innerHTML.length).toBeGreaterThan(0);
  });

  it("clicking a suggestion fills the input and clears the list", () => {
    const { input, container } = setup();
    type(input, "Sam");
    (container.querySelector(".autocomplete-item") as HTMLElement).click();
    expect(input.value).toBe("Samsung");
    expect(container.innerHTML).toBe("");
  });

  it("clicking outside the autocomplete clears the suggestions", () => {
    const { input, container } = setup();
    type(input, "Sam");
    expect(container.children.length).toBe(1);
    document.body.appendChild(container);
    document.body.click();
    expect(container.innerHTML).toBe("");
  });
});
