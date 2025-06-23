import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { phrases } from "./i18n-wrapper.mjs";

const ROOT_DIR = "../../../../";
const SEARCH_DIR = existsSync(ROOT_DIR) ? ROOT_DIR : ".";

// Log helpers
const logSuccess = (message) => console.log(`✅ ${message}`);
const logError = (message) => console.log(`❌ ${message}`);
const logInfo = (message) => console.log(message);

function extractPhraseNames(content) {
  // Remove commented out lines
  const withoutComments = content
    .replace(/\/\/.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
  
  const phraseNames = new Set();
  
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

function getAllJsFiles(dir, fileList = []) {
  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const path = join(dir, file.name);

    if (file.isDirectory()) {
      // Skip node_modules and psychojs directories
      if (file.name === "node_modules" || file.name === "psychojs") continue;
      getAllJsFiles(path, fileList);
    } else if (file.name.endsWith(".js") || file.name.endsWith(".ts")) {
      fileList.push(path);
    }
  }

  return fileList;
}

function getAllUsedPhrases() {
  const usedPhrases = new Set();
  const files = getAllJsFiles(SEARCH_DIR);

  for (const file of files) {
    // Skip the i18n wrapper file where phrases are defined
    if (file.includes('i18n-wrapper.mjs') || file.includes('i18n.js')) continue;
    
    try {
      const content = readFileSync(file, "utf8");
      const phraseNames = extractPhraseNames(content);

      for (const phrase of phraseNames) {
        usedPhrases.add(phrase);
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }

  return usedPhrases;
}

function findUndefinedPhrases() {
  const usedPhrases = getAllUsedPhrases();
  const undefinedPhrases = [];

  for (const phrase of usedPhrases) {
    if (!phrases[phrase]) {
      undefinedPhrases.push(phrase);
    }
  }

  return undefinedPhrases;
}

function findUnusedPhrases() {
  const definedPhrases = Object.keys(phrases);
  const usedInCode = new Set();
  const usedInComments = new Set();
  const files = getAllJsFiles(SEARCH_DIR);
  
  for (const file of files) {
    // Skip the i18n wrapper files where phrases are defined
    if (file.includes('i18n-wrapper.mjs') || file.includes('i18n.js')) continue;
    
    try {
      const content = readFileSync(file, "utf8");
      const withoutComments = content
        .replace(/\/\/.*$/gm, "") // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
      
      for (const phrase of definedPhrases) {
        // Check if phrase appears in actual code (without comments)
        if (withoutComments.includes(phrase)) {
          usedInCode.add(phrase);
        }
        // Check if phrase appears in full content (including comments)
        else if (content.includes(phrase)) {
          usedInComments.add(phrase);
        }
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }
  
  const completelyUnused = definedPhrases.filter(phrase => 
    !usedInCode.has(phrase) && !usedInComments.has(phrase)
  );
  const onlyInComments = Array.from(usedInComments);
  
  return {
    completelyUnused,
    onlyInComments
  };
}

function main() {
  const command = process.argv[2];
  const checkUndefined = () => {
    const undefinedPhrases = findUndefinedPhrases();
    if (undefinedPhrases.length > 0) {
      logError(`UNDEFINED: ${undefinedPhrases.join(", ")}`);
      process.exit(1);
    }
    logSuccess("UNDEFINED: All phrases are defined");
    return;
  } ;
  const checkUnused = () => {
    const { completelyUnused, onlyInComments } = findUnusedPhrases();
    
    let hasIssues = false;
    
    if (completelyUnused.length > 0) {
      logError(`COMPLETELY UNUSED: ${completelyUnused.join(", ")}`);
      hasIssues = true;
    }
    
    if (onlyInComments.length > 0) {
      logError(`ONLY IN COMMENTS: ${onlyInComments.join(", ")}`);
      hasIssues = true;
    }
    
    if (hasIssues) {
      process.exit(1);
    } else {
      logSuccess("UNUSED: All phrases are used in code");
    }
  };
  const reportHelp = () => {
    const helpMessage = `
      Usage: node i18n-phrases-static-analysis.mjs [command]
      Commands:
        undefined - Find undefined phrases used in code (default)
        unused    - Find unused phrases defined in Google sheet
        help      - Show this help message
    `;
    logInfo(helpMessage);
  };
  const reportUnknownCommand = (command) => {
    logError(`Unknown command: ${command}`);
    logInfo("Use 'undefined' (default), 'unused', or 'help'");
    process.exit(1);
  };


  switch (command) {
    case undefined:
    case "undefined":
      return checkUndefined();
    case "unused":
      return checkUnused();
    case "--help":
    case "-h":
      return reportHelp();
    default:
      return reportUnknownCommand(command);
  }
}

main();
