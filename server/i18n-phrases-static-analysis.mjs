import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { phrases } from "./i18n-wrapper.mjs";

/**
 * i18n Phrases Static Analysis Tool
 * 
 * This script searches for i18n phrase usage across:
 * 1. Local files in the current repository
 * 2. Remote EasyEyes GitHub repositories (no authentication required)
 * 
 * Commands:
 * - undefined (default): Find phrases used in code but not defined
 * - unused: Find phrases defined but not used in code
 * - help: Show usage information
 */

const ROOT_DIR = "../../../../";
const SEARCH_DIR = existsSync(ROOT_DIR) ? ROOT_DIR : ".";

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

// Log helpers
const logSuccess = (message) => console.log(`\x1b[32m✅ ${message}\x1b[0m`);
const logError = (message) => console.log(`\x1b[31m❌ ${message}\x1b[0m`);
const logInfo = (...message) => console.log("\x1b[34m", ...message, "\x1b[0m");

class PhraseAnalyzer {
  constructor() {
    this.usedPhrases = new Set();
    this.definedPhrases = Object.keys(phrases);
    this.rateLimitDelay = 100; // ms between API calls
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

  extractPhraseNames(content) {
    // Remove commented out lines
    const withoutComments = content
      .replace(/\/\/.*$/gm, "") // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
    
    const phraseNames = new Set();
    
    // First collect phrase substrings (EE_, RC_, T_ prefixes)
    const phraseSubstrings = this.findPhraseSubstrings(content);
    phraseSubstrings.forEach(phrase => phraseNames.add(phrase));
    
    // Extract proper i18n calls: readi18nPhrases('phrase-name')
    const properCallsRegex = /readi18nPhrases\s*\(\s*["']([^"']+)["']/g;
    const properMatches = [...withoutComments.matchAll(properCallsRegex)];
    properMatches.forEach(match => phraseNames.add(match[1]));
    
    // Extract improper direct phrase access: phrases['phrase-name'] or phrases["phrase-name"]
    const directAccessRegex = /phrases\s*\[\s*["']([^"']+)["']\s*\]/g;
    const directMatches = [...withoutComments.matchAll(directAccessRegex)];
    directMatches.forEach(match => phraseNames.add(match[1]));
    
    // Extract template literal access: phrases[`phrase-name`]
    const templateLiteralRegex = /phrases\s*\[\s*`([^`]+)`\s*\]/g;
    const templateMatches = [...withoutComments.matchAll(templateLiteralRegex)];
    templateMatches.forEach(match => phraseNames.add(match[1]));
    
    return Array.from(phraseNames);
  }

  getAllJsFiles(dir, fileList = []) {
    const files = readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const path = join(dir, file.name);

      if (file.isDirectory()) {
        // Skip node_modules and psychojs directories
        if (file.name === "node_modules" || file.name === "psychojs") continue;
        this.getAllJsFiles(path, fileList);
      } else if (file.name.endsWith(".js") || file.name.endsWith(".ts")) {
        fileList.push(path);
      }
    }

    return fileList;
  }

  shouldSkipFile(filePath) {
    return filePath.includes('i18n-wrapper.mjs') || 
           filePath.includes('i18n.js') ||
           filePath.includes('node_modules/') ||
           filePath.includes('psychojs/');
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
      const jsFiles = data.tree
        .filter(item => 
          item.type === 'blob' && 
          (item.path.endsWith('.js') || item.path.endsWith('.ts')) &&
          !item.path.includes('node_modules/') &&
          !item.path.includes('.min.js') &&
          !item.path.includes('psychojs/') &&
          !item.path.startsWith('test/') &&
          !item.path.startsWith('tests/') &&
          !item.path.includes('__tests__/') &&
          !item.path.includes('.test.') &&
          !item.path.includes('.spec.')
        )
        .map(item => item.path);
        
      return jsFiles;
    } catch (error) {
      console.error(`Error fetching tree for ${repo}:`, error.message);
      return [];
    }
  }

  async analyzeRepoFiles(repo, processContent) {
    
    const filePaths = await this.fetchRepoTree(repo);
    
    if (filePaths.length === 0) {
      logInfo(`No JavaScript/TypeScript files found in ${repo}`);
      return 0;
    }
    
    let totalPhrases = 0;
    let processedFiles = 0;
    const batchSize = 10; // Process files in batches to avoid overwhelming the API
    
    // Process files in batches
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (filePath) => {
        try {
          await this.sleep(this.rateLimitDelay); // Rate limiting
          
          const rawUrl = `https://raw.githubusercontent.com/EasyEyes/${repo}/main/${filePath}`;
          const response = await this.fetchWithRetry(rawUrl);
          
          if (response) {
            const content = await response.text();
            const phrases = processContent(content);
            
            // if (phrases > 0) {
            //   logInfo(`${filePath}: found ${phrases} phrase references`);
            // }
            
            return phrases;
          }
          return 0;
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error.message);
          return 0;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      const batchTotal = batchResults
        .filter(result => result.status === 'fulfilled')
        .reduce((sum, result) => sum + result.value, 0);
      
      totalPhrases += batchTotal;
      processedFiles += batch.length;
      
      // Small delay between batches
      if (i + batchSize < filePaths.length) {
        await this.sleep(200);
      }
    }
    
    logSuccess(`Completed ${repo}: ${totalPhrases} phrase references from ${processedFiles} files`);
    return totalPhrases;
  }

  async analyzeAllLocalFiles(processContent) {
    const localFiles = this.getAllJsFiles(SEARCH_DIR);
    const relevantFiles = localFiles.filter(file => !this.shouldSkipFile(file));
    
    // logInfo(`Analyzing ${relevantFiles.length} local JavaScript/TypeScript files...`);
    
    let processedCount = 0;
    for (const file of relevantFiles) {
      try {
        const content = readFileSync(file, "utf8");
        processContent(content);
        processedCount++;
        
        // Log progress every n files or at the end
        const updateInterval = 100;
        if (processedCount % updateInterval === 0 || processedCount === relevantFiles.length) {
          logInfo(`  Processed ${processedCount}/${relevantFiles.length} local files`);
        }
      } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
      }
    }
    
    logSuccess(`Completed analysis of ${processedCount} local files`);
  }

  async analyzeAllRepositories(processContent) {
    logInfo(`\nAnalyzing ${EASYEYES_REPOS.length} remote GitHub repositories ...`);
    
    const repoPromises = EASYEYES_REPOS.map(async (repo) => {
      // logInfo(`Downloading and searching repository: ${repo} ...`);
      const itemsFound = await this.analyzeRepoFiles(repo, processContent);
      return itemsFound;
    });
    
    const results = await Promise.allSettled(repoPromises);
    const totalItems = results
      .filter(result => result.status === 'fulfilled')
      .reduce((sum, result) => sum + result.value, 0);
    
    const successfulRepos = results.filter(result => result.status === 'fulfilled').length;
    logSuccess(`Completed analysis of ${successfulRepos}/${EASYEYES_REPOS.length} repositories`);
    
    return totalItems;
  }

  async collectAllPhraseUsages() {
    const usedInCode = new Set();
    const usedInComments = new Set();
    const allUsedPhrases = new Set();

    // Process content function for comprehensive analysis
    const processContent = (content) => {
      // For findUndefined: collect all phrase names from i18n calls
      const phraseNames = this.extractPhraseNames(content);
      phraseNames.forEach(phrase => allUsedPhrases.add(phrase));

      // For findUnused: categorize phrase usage
      this.categorizePhrasesInContent(content, usedInCode, usedInComments);
      
      return phraseNames.length;
    };

    // Analyze local files
    await this.analyzeAllLocalFiles(processContent);
    
    // Analyze remote repositories
    const totalRemotePhrases = await this.analyzeAllRepositories(processContent);
    
    return {
      allUsedPhrases,
      usedInCode,
      usedInComments,
      totalRemotePhrases
    };
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

  async findUndefined() {
    const { allUsedPhrases, totalRemotePhrases } = await this.collectAllPhraseUsages();
    logInfo(`\n📈 Summary: Found ${allUsedPhrases.size} phrases used in Website, ${totalRemotePhrases} phrases from across ${EASYEYES_REPOS.length} GitHub repositories`);
    
    return Array.from(allUsedPhrases).filter(phrase => !phrases[phrase]);
  }

  async findUnused() {
    const { usedInCode, usedInComments } = await this.collectAllPhraseUsages();
    
    logInfo(`\n📈 Summary: ${usedInCode.size} phrases found in active code, ${usedInComments.size} only in comments`);
    
    const completelyUnused = this.definedPhrases.filter(phrase => 
      !usedInCode.has(phrase) && !usedInComments.has(phrase)
    );
    const onlyInComments = Array.from(usedInComments);
    
    return { completelyUnused, onlyInComments };
  }
}

// Command handlers
async function checkUndefined() {
  logInfo("🔍 Checking for undefined phrases used in code...\n");
  
  const analyzer = new PhraseAnalyzer();
  const undefinedPhrases = await analyzer.findUndefined();
  
  // logInfo("\n📊 Analysis Results:");
  // if (undefinedPhrases.length > 0) {
  //   logError(`UNDEFINED: ${undefinedPhrases.join(", ")}`);
  //   process.exit(1);
  // }
  
  // logSuccess("UNDEFINED: All phrases are defined");
}

async function checkUnused() {
  logInfo("🔍 Checking for unused phrases defined in Google sheet...\n");
  
  const analyzer = new PhraseAnalyzer();
  const { completelyUnused, onlyInComments } = await analyzer.findUnused();
  
  logInfo("\n📊 Analysis Results:");
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
  
  if (hasIssues) {
    // process.exit(1);
  } else {
    logSuccess("UNUSED: All phrases are used in code");
  }
}

function showHelp() {
  const helpMessage = `
Usage: node i18n-phrases-static-analysis.mjs [command]

Commands:
  undefined - Find undefined phrases used in code (default)
  unused    - Find unused phrases defined in Google sheet
  help      - Show this help message

Note: This script comprehensively searches through ALL JavaScript and TypeScript 
files in the following EasyEyes GitHub repositories:
${EASYEYES_REPOS.join(', ')}

Features:
- Uses GitHub API to fetch complete file trees
- Processes files in batches with rate limiting
- Excludes test files, build artifacts, and node_modules
- No authentication required - uses public GitHub APIs
  `;
  logInfo(helpMessage);
}

// Main execution
async function main() {
  const command = process.argv[2] || 'undefined';
  
  const commands = {
    undefined: checkUndefined,
    unused: checkUnused,
    help: showHelp,
    '--help': showHelp,
    '-h': showHelp
  };
  
  const handler = commands[command];
  
  if (!handler) {
    logError(`Unknown command: ${command}`);
    logInfo("Use 'undefined' (default), 'unused', or 'help'");
    process.exit(1);
  }
  
  await handler();
}

main().catch(console.error);
