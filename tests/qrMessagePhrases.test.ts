/** @jest-environment jsdom */
import * as fs from "fs";

jest.mock("../components/global", () => ({ status: { terminated: false } }));
jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: (key: string) => key,
}));
jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({}),
}));
jest.mock("../components/compatibilityUI", () => ({
  ...jest.requireActual("../components/compatibilityUI"),
  summarizeKnownDeviceFacts: () => [],
}));

import * as compatibilityCheck from "../components/compatibilityCheck";

test("the calibrated-phone survey uses the defined participation QR phrase", () => {
  const getMessageForQR = (compatibilityCheck as any).getMessageForQR;
  expect(getMessageForQR).toBeDefined();
  const message = getMessageForQR(false, true, true, "en");
  expect(message).toContain("RC_needPhoneSurvey");
  expect(message).toContain("RC_UseQRCodeToParticipate");
  expect(message).not.toContain("RC_needPhoneSurveyParticipate");
});

test("no stale participation-QR phrase reference remains in source", () => {
  const source = fs.readFileSync("components/compatibilityCheck.js", "utf8");
  expect(source).not.toContain("RC_needPhoneSurveyParticipate");
});
