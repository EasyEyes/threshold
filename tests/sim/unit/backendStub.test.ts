/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { startBackendStub } from "../e2e/helpers/backendStub";

describe("backend stub lifecycle", () => {
  test("serves the cached catalogs and stops cleanly", async () => {
    const stub = await startBackendStub("backendStubUnit", 0);
    try {
      const [phrasesResponse, glossaryResponse] = await Promise.all([
        fetch(`${stub.url}/.netlify/functions/phrases`),
        fetch(`${stub.url}/.netlify/functions/glossary`),
      ]);
      expect(phrasesResponse.ok).toBe(true);
      expect(glossaryResponse.ok).toBe(true);
      const phrases = await phrasesResponse.json();
      const glossary = await glossaryResponse.json();
      const expectedPhrases = JSON.parse(
        readFileSync("tests/__cache__/phrases.json", "utf8"),
      );
      const expectedGlossary = JSON.parse(
        readFileSync("tests/__cache__/glossary.json", "utf8"),
      );
      expect(phrases.version).toBe(expectedPhrases.version);
      expect(glossary.version).toBe(expectedGlossary.version);
    } finally {
      stub.stop();
    }
  }, 15_000);
});
