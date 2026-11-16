/** @jest-environment jsdom */

const mockShowValidationMessage = jest.fn();

jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: {
    fire: jest.fn(() => {
      document.body.innerHTML = `
        <input id="textInput" />
        <input id="fileInput" type="file" />
        <span id="labelFile"></span>
        <button id="okaybtn"></button>
      `;
      return Promise.resolve({ isConfirmed: false });
    }),
    showValidationMessage: mockShowValidationMessage,
    resetValidationMessage: jest.fn(),
    clickConfirm: jest.fn(),
  },
}));
jest.mock("../components/readPhrases", () => ({
  readi18nPhrases: (key: string) => key,
}));
jest.mock("../components/global", () => ({
  localStorageKey: "test-id",
  thisExperimentInfo: {},
}));
jest.mock("../components/externalServices.ts", () => ({
  isProlificExperiment: jest.fn(),
}));
jest.mock("../components/saveFile.js", () => ({
  downloadTextFile: jest.fn(),
}));

import Swal from "sweetalert2";
import { checkCrossSessionId } from "../components/crossSession";

class InvalidFileReader {
  onload: ((event: { target: { result: string } }) => void) | null = null;
  readAsText() {
    this.onload?.({ target: { result: "not an EasyEyes ID file" } });
  }
}

test("a malformed ID file offers the existing upload-or-valid-ID guidance", () => {
  (globalThis as any).FileReader = InvalidFileReader;
  localStorage.clear();
  mockShowValidationMessage.mockClear();
  const callback = jest.fn();

  void checkCrossSessionId(callback, "en");
  const input = document.getElementById("fileInput") as HTMLInputElement;
  Object.defineProperty(input, "files", {
    value: [new File(["bad"], "bad.txt", { type: "text/plain" })],
  });
  (input as any).onchange();

  expect(mockShowValidationMessage).toHaveBeenCalledTimes(1);
  expect(mockShowValidationMessage).toHaveBeenCalledWith(
    "EE_ID_uploadOrValidID",
  );
  expect(mockShowValidationMessage).not.toHaveBeenCalledWith(
    "EE_ID_invalidFile",
  );
  expect(callback).not.toHaveBeenCalled();
  expect(Swal.fire).toHaveBeenCalledTimes(1);
});
