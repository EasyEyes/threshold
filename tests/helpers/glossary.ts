/**
 * Test helper: load the real EasyEyes glossary, cached to disk.
 *
 * On first run, fetches from https://easyeyes.app/.netlify/functions/glossary
 * and writes the result to tests/__cache__/glossary.json. Subsequent runs use
 * the cache. The cache file is gitignored.
 *
 * To force a refresh (e.g. after a glossary update), delete the cache file.
 */

import * as fs from "fs";
import * as path from "path";
import { initGlossary } from "../../parameters/glossaryRegistry";
import type { GlossaryData } from "../../../source/components/types";

const CACHE_DIR = path.resolve(__dirname, "../__cache__");
const CACHE_FILE = path.join(CACHE_DIR, "glossary.json");
const GLOSSARY_URL = "https://easyeyes.app/.netlify/functions/glossary";

async function fetchGlossary(): Promise<GlossaryData> {
  const response = await fetch(GLOSSARY_URL);
  if (!response.ok)
    throw new Error(`Glossary fetch failed: HTTP ${response.status}`);
  const data = (await response.json()) as GlossaryData;
  if (!data || !data.glossary || !data.version) {
    throw new Error("Glossary response missing required fields");
  }
  return data;
}

function readCache(): GlossaryData | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    return JSON.parse(raw) as GlossaryData;
  } catch {
    return null;
  }
}

function writeCache(data: GlossaryData): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
}

let loadPromise: Promise<GlossaryData> | null = null;

/**
 * Load the real glossary (from cache or live API) and call initGlossary().
 * Idempotent — subsequent calls return the cached promise.
 */
export async function loadGlossaryForTests(): Promise<GlossaryData> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const cached = readCache();
    if (cached) {
      initGlossary(cached);
      return cached;
    }

    const live = await fetchGlossary();
    writeCache(live);
    initGlossary(live);
    return live;
  })();

  return loadPromise;
}
