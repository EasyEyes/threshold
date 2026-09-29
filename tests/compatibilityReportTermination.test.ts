/** @jest-environment jsdom */
jest.mock("../components/global", () => ({ status: { terminated: false } }));
jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: (key: string) =>
    key === "EE_LanguageDirection" ? "ltr" : key,
}));
jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({
    _calibrateSound1000HzBool: { name: "_calibrateSound1000HzBool" },
    _calibrateSoundAllHzBool: { name: "_calibrateSoundAllHzBool" },
  }),
}));
jest.mock("../components/compatibilityUI", () => ({
  ...jest.requireActual("../components/compatibilityUI"),
  summarizeKnownDeviceFacts: () => [],
  willCalibrateDistance: () => false,
  willCalibrateScreenSize: () => false,
  getPaperRulerNote: () => "",
}));

import {
  displayCompatibilityMessage,
  hideCompatibilityMessage,
} from "../components/compatibilityCheck";
import { disposeStudyInteractions } from "../components/interaction/termination";

const handlers = { current: [] as Function[] };
const keys = { current: [] as { name: string }[] };
const reader = { read: () => [false] };
const rc = { language: { value: "en" } };
function showReport(
  getConnectionManagerDisplay = async () => {},
  needsKeypad = false,
) {
  return displayCompatibilityMessage(
    [],
    reader,
    rc,
    false,
    true,
    null,
    false,
    false,
    false,
    [],
    { experiment: { addData: jest.fn(), nextEntry: jest.fn() } },
    jest.fn(),
    {},
    function () {},
    handlers,
    keys,
    {},
    {},
    getConnectionManagerDisplay,
    () => {},
    () => needsKeypad,
  );
}
const reportParts =
  "#msg-container, #compatibility-chrome-title, #compatibility-chrome-shield, #compatibility-chrome-language-wrapper, #prolific-policy";

beforeEach(() => {
  document.body.innerHTML = '<div id="root" style="display:flex"></div>';
  document.body.style.overflowX = "auto";
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  handlers.current = [];
  keys.current = [];
});
afterEach(() => {
  hideCompatibilityMessage();
  disposeStudyInteractions();
});

test("Quit on page 2 removes its full UI and keypad handler before debrief", async () => {
  const waiting = showReport();
  const staleProceed = document.getElementById(
    "procced-btn",
  ) as HTMLButtonElement;
  expect(staleProceed).not.toBeNull();
  expect(handlers.current).toHaveLength(1);
  disposeStudyInteractions();
  document.body.insertAdjacentHTML(
    "beforeend",
    '<div id="debrief">Debrief</div>',
  );
  expect(await waiting).toMatchObject({
    proceedButtonClicked: false,
    proceedBool: false,
  });
  expect(document.querySelectorAll(reportParts)).toHaveLength(0);
  expect(handlers.current).toHaveLength(0);
  expect(document.getElementById("root")!.style.display).toBe("flex");
  expect(document.body.style.overflowX).toBe("auto");
  staleProceed.click();
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );
  expect(document.querySelectorAll(reportParts)).toHaveLength(0);
  expect(document.getElementById("root")!.style.display).toBe("flex");
  expect(document.getElementById("debrief")).not.toBeNull();
});

test("normal Proceed retains the existing handoff and hide removes chrome", async () => {
  const waiting = showReport();
  (document.getElementById("procced-btn") as HTMLButtonElement).click();
  expect(await waiting).toMatchObject({
    proceedButtonClicked: true,
    proceedBool: true,
  });
  expect(handlers.current).toHaveLength(0);
  expect(document.getElementById("msg-container")).not.toBeNull();
  hideCompatibilityMessage();
  expect(document.querySelectorAll(reportParts)).toHaveLength(0);
  expect(document.getElementById("root")!.style.display).toBe("");
});

test("Quit still removes the report after Proceed while its caller is awaiting the next step", async () => {
  const waiting = showReport();
  (document.getElementById("procced-btn") as HTMLButtonElement).click();
  await waiting;
  disposeStudyInteractions();
  expect(document.querySelectorAll(reportParts)).toHaveLength(0);
});

test("a delayed keypad connection cannot remount controls after Quit", async () => {
  let connected!: () => void;
  const connection = new Promise<void>((resolve) => {
    connected = resolve;
  });
  const waiting = showReport(() => connection, true);
  expect(document.getElementById("msg-container")).not.toBeNull();
  disposeStudyInteractions();
  expect(await waiting).toMatchObject({ proceedBool: false });
  connected();
  await Promise.resolve();
  await Promise.resolve();
  expect(document.querySelectorAll(reportParts)).toHaveLength(0);
  expect(document.getElementById("procced-btn")).toBeNull();
  expect(handlers.current).toHaveLength(0);
});
