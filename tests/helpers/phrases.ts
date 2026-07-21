/**
 * Test helper: load the real EasyEyes phrases, cached to disk.
 * Mirrors helpers/glossary.ts. Cache file is gitignored.
 */

import * as fs from "fs";
import * as path from "path";
import { initPhrases } from "../../parameters/phrasesRegistry";

const CACHE_DIR = path.resolve(__dirname, "../__cache__");
const CACHE_FILE = path.join(CACHE_DIR, "phrases.json");
const PHRASES_URL = "https://easyeyes.app/.netlify/functions/phrases";

let loadPromise: Promise<unknown> | null = null;

/**
 * Load the real phrases (from cache or live API) and call initPhrases().
 * Idempotent — subsequent calls return the cached promise.
 */
export async function loadPhrasesForTests(): Promise<unknown> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = fs.readFileSync(CACHE_FILE, "utf8");
      const data = JSON.parse(raw);
      initPhrases(data);
      return data;
    } catch {
      const response = await fetch(PHRASES_URL);
      if (!response.ok)
        throw new Error(`Phrases fetch failed: HTTP ${response.status}`);
      const data = await response.json();
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
      initPhrases(data);
      return data;
    }
  })();

  return loadPromise;
}
