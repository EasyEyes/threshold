import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * i18n Phrases Static Analysis Tool
 *
 * This script searches for i18n phrase usage across:
 * 1. Git staged files (default — fast, for pre-commit use)
 * 2. Local threshold repo + remote EasyEyes GitHub repos (with --full)
 *
 * Commands:
 * - undefined (default): Find phrases used in code but not defined
 * - unused: Find phrases defined but not used in code
 * - help: Show usage information
 *
 * Flags:
 * - --full: Scan all local files and remote repos (slow; for CI or manual audit)
 * - --root <dir>: Scan recursively from <dir> instead of staged files / LOCAL_REPOS
 */

// EasyEyes GitHub organization repositories
const EASYEYES_REPOS = [
  'Easyeyes-Analyzer',
  'python-flask-server',
  'speaker-calibration',
  'remote-calibrator',
  'compatibility-check',
  'psychojs',
  'virtual-keypad'
];

// Local repos to scan in --full mode, relative to threshold/ (CWD when npm runs)
const LOCAL_REPOS = [
  { dir: ".",      label: "threshold/",  stripPrefix: "",      skipDirs: [] },
  { dir: "../",    label: "experiment/", stripPrefix: "../",   skipDirs: ["threshold"] },
  { dir: "../../", label: "website/",    stripPrefix: "../../", skipDirs: ["docs"] },
];

/** Basenames skipped when collecting phrase usages (definitions / glossary text, not app UI). */
const PHRASE_SCAN_IGNORE_FILENAMES = ["glossary.ts", "glossary-full.ts"];

function isPhraseScanIgnoredPath(filePath) {
  const base = filePath.split(/[/\\]/).pop();
  return PHRASE_SCAN_IGNORE_FILENAMES.includes(base);
}

// Log helpers
const logSuccess = (message) => console.log(`\x1b[32m✅ ${message}\x1b[0m`);
const logError = (message) => console.log(`\x1b[31m❌ ${message}\x1b[0m`);

class PhraseAnalyzer {
  constructor(phrases) {
    this.phrases = phrases;
    this.definedPhrases = Object.keys(phrases);
    this.rateLimitDelay = 100; // ms between API calls
  }

  async getStagedFiles() {
    try {
      const { execSync } = await import('child_process');
      const out = execSync('git diff --cached --name-only', { stdio: ['pipe','pipe','pipe'] }).toString().trim();
      return out ? out.split('\n').filter(f => /\.(js|ts)$/.test(f)) : [];
    } catch {
      return null; // fall back to full local scan
    }
  }

  /**
   * Find all substrings in content that match phrase names or their prefixes
   * @param {string} content - The content to search in
   * @returns {string[]} - Array of matching phrase substrings found in content
   */
  findPhraseSubstrings(content) {
    // Remove commented out lines for cleaner analysis
    const withoutComments = content
      .replace(/\/\/.*$/gm, "") // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

    const targetPrefixes = ["EE_", "RC_", "T_"];
    const foundWords = new Set();

    // Split content into words and find those starting with target prefixes
    const words = withoutComments.split(/\W+/);

    words.forEach(word => {
      if (targetPrefixes.some(prefix => word.startsWith(prefix) && word !== prefix)) {
        foundWords.add(word);
      }
    });

    return Array.from(foundWords);
  }

  /**
   * Extract phrase names with file+line location info
   * @param {string} content - File content
   * @param {string} filePath - File path for location reporting
   * @returns {{phrase: string, file: string, line: number}[]}
   */
  extractPhraseLocations(content, filePath) {
    const withoutComments = content
      .replace(/\/\/.*$/gm, "") // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

    const lines = content.split('\n');
    const results = [];
    const seen = new Set();

    const addPhrase = (phrase) => {
      if (seen.has(phrase)) return;
      seen.add(phrase);
      const lineIdx = lines.findIndex(line =>
        !line.trim().startsWith('//') && line.includes(phrase)
      );
      results.push({ phrase, file: filePath, line: lineIdx >= 0 ? lineIdx + 1 : 0 });
    };

    // Phrase substrings (EE_, RC_, T_ prefixes)
    this.findPhraseSubstrings(content).forEach(addPhrase);

    // Extract proper i18n calls: readi18nPhrases('phrase-name')
    [...withoutComments.matchAll(/readi18nPhrases\s*\(\s*["']([^"']+)["']/g)].forEach(m => addPhrase(m[1]));

    // Extract improper direct phrase access: phrases['phrase-name'] or phrases["phrase-name"]
    [...withoutComments.matchAll(/phrases\s*\[\s*["']([^"']+)["']\s*\]/g)].forEach(m => addPhrase(m[1]));

    // Extract template literal access: phrases[`phrase-name`]
    [...withoutComments.matchAll(/phrases\s*\[\s*`([^`]+)`\s*\]/g)].forEach(m => addPhrase(m[1]));

    return results;
  }

  extractPhraseNames(content) {
    return this.extractPhraseLocations(content, '').map(loc => loc.phrase);
  }

  getAllJsFiles(dir, fileList = [], skipDirs = []) {
    const skipDirNames = new Set(["node_modules", "psychojs", "dist", ".netlify", "functions-serve", ...skipDirs]);
    const files = readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const path = join(dir, file.name);

      if (file.isDirectory()) {
        if (skipDirNames.has(file.name)) continue;
        this.getAllJsFiles(path, fileList, skipDirs);
      } else if ((file.name.endsWith(".js") || file.name.endsWith(".ts")) && !file.name.includes(".min.")) {
        fileList.push(path);
      }
    }

    return fileList;
  }

  shouldSkipFile(filePath) {
    return isPhraseScanIgnoredPath(filePath) ||
           filePath.includes('i18n-wrapper.mjs') ||
           filePath.includes('i18n.js') ||
           filePath.includes('i18n-phrases-static-analysis') ||
           filePath.includes('node_modules/') ||
           filePath.includes('psychojs/') ||
           filePath.includes('/dist/') ||
           filePath.includes('/.netlify/');
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return response;
        }
        if (response.status === 404) {
          return null; // File doesn't exist
        }
        if (response.status === 403 || response.status === 429) {
          // Rate limited, wait longer
          await this.sleep(1000 * (i + 1));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(500 * (i + 1));
      }
    }
  }

  async fetchRepoTree(repo) {
    const treeUrl = `https://api.github.com/repos/EasyEyes/${repo}/git/trees/main?recursive=1`;

    try {
      const response = await this.fetchWithRetry(treeUrl);
      if (!response) return [];

      const data = await response.json();

      // Filter for JavaScript and TypeScript files, excluding common directories to skip
      return data.tree
        .filter(item =>
          item.type === 'blob' &&
          (item.path.endsWith('.js') || item.path.endsWith('.ts')) &&
          !isPhraseScanIgnoredPath(item.path) &&
          !item.path.includes('node_modules/') &&
          !item.path.includes('.min.js') &&
          !item.path.includes('i18n.js') &&
          !item.path.includes('psychojs/') &&
          !item.path.startsWith('test/') &&
          !item.path.startsWith('tests/') &&
          !item.path.includes('__tests__/') &&
          !item.path.includes('.test.') &&
          !item.path.includes('.spec.')
        )
        .map(item => item.path);
    } catch (error) {
      console.error(`Error fetching tree for ${repo}:`, error.message);
      return [];
    }
  }

  analyzeLocalFiles(filePaths, processContent) {
    for (const file of filePaths) {
      try {
        const content = readFileSync(file, "utf8");
        processContent(content, file);
      } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
      }
    }
  }

  async processOneRepo(repo, processContent) {
    const filePaths = await this.fetchRepoTree(repo);
    const batchSize = 10;

    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(async (filePath) => {
        try {
          await this.sleep(this.rateLimitDelay);
          const rawUrl = `https://raw.githubusercontent.com/EasyEyes/${repo}/main/${filePath}`;
          const response = await this.fetchWithRetry(rawUrl);
          if (response) {
            const content = await response.text();
            processContent(content, `${repo}/${filePath}`);
          }
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error.message);
        }
      }));
      if (i + batchSize < filePaths.length) await this.sleep(200);
    }
  }

  async analyzeAllRepositories(processContent) {
    await Promise.allSettled(EASYEYES_REPOS.map(repo => this.processOneRepo(repo, processContent)));
  }

  gatherLocalLocs(dir, skipDirs = []) {
    const locs = [], seen = new Set();
    const files = this.getAllJsFiles(dir, [], skipDirs).filter(f => !this.shouldSkipFile(f));
    this.analyzeLocalFiles(files, (content, filePath) => {
      this.extractPhraseLocations(content, filePath).forEach(loc => {
        if (!seen.has(loc.phrase)) { seen.add(loc.phrase); locs.push(loc); }
      });
    });
    return locs;
  }

  async gatherRepoLocs(repo) {
    const locs = [], seen = new Set();
    await this.processOneRepo(repo, (content, filePath) => {
      this.extractPhraseLocations(content, filePath).forEach(loc => {
        if (!seen.has(loc.phrase)) { seen.add(loc.phrase); locs.push(loc); }
      });
    });
    return locs;
  }

  async gatherStagedLocs() {
    const staged = await this.getStagedFiles();
    const files = staged !== null
      ? staged.filter(f => !this.shouldSkipFile(f))
      : this.getAllJsFiles(".").filter(f => !this.shouldSkipFile(f));
    const locs = [], seen = new Set();
    this.analyzeLocalFiles(files, (content, filePath) => {
      this.extractPhraseLocations(content, filePath).forEach(loc => {
        if (!seen.has(loc.phrase)) { seen.add(loc.phrase); locs.push(loc); }
      });
    });
    return locs;
  }

  categorizePhrasesInContent(content, usedInCode, usedInComments) {
    const withoutComments = content
      .replace(/\/\/.*$/gm, "") // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

    for (const phrase of this.definedPhrases) {
      // Check if phrase appears in actual code (without comments)
      if (withoutComments.includes(phrase)) {
        usedInCode.add(phrase);
      }
      // Check if phrase appears in full content (including comments)
      else if (content.includes(phrase)) {
        usedInComments.add(phrase);
      }
    }
  }

  async findUnused() {
    const usedInCode = new Set();
    const usedInComments = new Set();

    const processContent = (content) => {
      this.categorizePhrasesInContent(content, usedInCode, usedInComments);
    };

    const localFiles = this.getAllJsFiles(".");
    this.analyzeLocalFiles(localFiles.filter(f => !this.shouldSkipFile(f)), processContent);
    await this.analyzeAllRepositories(processContent);

    return {
      completelyUnused: this.definedPhrases.filter(p => !usedInCode.has(p) && !usedInComments.has(p)),
      onlyInComments: Array.from(usedInComments)
    };
  }
}

// Command handlers
async function checkUndefined(phrases, full = false, rootDir = null) {
  const analyzer = new PhraseAnalyzer(phrases);
  const globalSeen = new Set();
  let totalUndefined = 0;

  const filterNew = (locs) => {
    const undef = [];
    for (const loc of locs) {
      if (globalSeen.has(loc.phrase)) continue;
      globalSeen.add(loc.phrase);
      if (!phrases[loc.phrase]) undef.push(loc);
    }
    return undef;
  };

  const printGroup = (label, undef, { color = '\x1b[1;32m', stripPrefix = '' } = {}) => {
    if (undef.length === 0) return;
    totalUndefined += undef.length;
    console.log(`\n${color}  ${label}\x1b[0m`);
    undef.forEach(({ phrase, file, line }) => {
      const displayFile = stripPrefix && file.startsWith(stripPrefix) ? file.slice(stripPrefix.length) : file;
      const loc = line ? `${displayFile}:${line}` : displayFile;
      console.log(`    ${phrase.padEnd(32)} \x1b[2m${loc}\x1b[0m`);
    });
  };

  if (rootDir) {
    const label = rootDir === '.' ? process.cwd() : rootDir;
    printGroup(label, filterNew(analyzer.gatherLocalLocs(rootDir)));
  } else if (full) {
    for (const { dir, label, stripPrefix, skipDirs } of LOCAL_REPOS) {
      printGroup(label, filterNew(analyzer.gatherLocalLocs(dir, skipDirs)), { color: '\x1b[1;32m', stripPrefix });
    }
    for (const repo of EASYEYES_REPOS) {
      process.stdout.write(`\x1b[34m  ↳ checking ${repo}...\x1b[0m\r`);
      const repoLocs = await analyzer.gatherRepoLocs(repo);
      process.stdout.write('\x1b[2K'); // clear "checking..." line
      printGroup(repo, filterNew(repoLocs), { color: '\x1b[1;34m', stripPrefix: `${repo}/` });
    }
  } else {
    printGroup("staged", filterNew(await analyzer.gatherStagedLocs()), { color: '\x1b[1;32m' });
  }

  if (totalUndefined > 0) {
    console.log();
    logError(`${totalUndefined} undefined phrase${totalUndefined !== 1 ? 's' : ''} detected.`);
    process.exit(1);
  } else {
    logSuccess("No undefined phrases found.");
  }
}

async function checkUnused(phrases) {
  const analyzer = new PhraseAnalyzer(phrases);
  const { completelyUnused, onlyInComments } = await analyzer.findUnused();

  let hasIssues = false;

  if (completelyUnused.length > 0) {
    logError(`COMPLETELY UNUSED: `);
    completelyUnused.forEach(phrase => logError(`  ${phrase}`));
    hasIssues = true;
    console.log("\n");
  }

  if (onlyInComments.length > 0) {
    logError(`ONLY IN COMMENTS: `);
    onlyInComments.forEach(phrase => logError(`  ${phrase}`));
    hasIssues = true;
    console.log("\n");
  }

  if (!hasIssues) {
    logSuccess("UNUSED: All phrases are used in code");
  }
}

function showHelp() {
  console.log(`
Usage: node i18n-phrases-static-analysis.mjs [command] [--full] [--root <dir>]

Commands:
  undefined - Find undefined phrases used in code (default)
  unused    - Find unused phrases defined in Google sheet
  help      - Show usage information

Flags:
  --full       Scan all local files and remote repos (default is staged files only)
  --root <dir> Scan recursively from <dir> (overrides staged/full modes for local scan)

Note: With --full, searches through ALL JavaScript and TypeScript files in:
  - Local threshold repository
  - Remote EasyEyes GitHub repositories: ${EASYEYES_REPOS.join(', ')}
  `);
}

// Main execution
async function main() {
  const command = process.argv[2] || 'undefined';
  const full = process.argv.includes('--full');
  const rootIdx = process.argv.indexOf('--root');
  const rootDir = rootIdx !== -1 && process.argv[rootIdx + 1] ? process.argv[rootIdx + 1] : null;

  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  // Load phrases dynamically so we can handle missing i18n.js gracefully
  let phrases;
  try {
    const module = await import('./i18n-wrapper.mjs');
    phrases = module.phrases;
  } catch (err) {
    console.warn(`⚠️  Could not load i18n phrases: ${err.message}`);
    process.exit(0);
  }

  if (command === 'undefined') {
    await checkUndefined(phrases, full, rootDir);
  } else if (command === 'unused') {
    await checkUnused(phrases);
  } else {
    logError(`Unknown command: ${command}`);
    console.log("Use 'undefined' (default), 'unused', or 'help'");
    process.exit(1);
  }
}

main().catch(err => {
  console.warn(`⚠️  Unexpected error in phrase analysis: ${err.message}`);
  process.exit(0);
});
