import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { phrases } from "../components/i18n.js";

function extractPhraseNames(content) {
  // Remove commented out lines
  const withoutComments = content
    .replace(/\/\/.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
  // Parse all calls, allowing for space before open paren, matching ' or ", matching with the param name used
  const regex = /readi18nPhrases\s*\(\s*["']([^"']+)["']/g;
  const matches = [...withoutComments.matchAll(regex)];
  return matches.map((match) => match[1]);
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

function findUndefinedPhrases() {
  const undefinedPhrases = new Set();
  const rootDir = "../../../../";
  const files = getAllJsFiles(existsSync(rootDir) ? rootDir : ".");

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      const phraseNames = extractPhraseNames(content);

      for (const phrase of phraseNames) {
        if (!phrases[phrase]) {
          undefinedPhrases.add(phrase);
        }
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }

  return Array.from(undefinedPhrases);
}

const undefinedPhrases = findUndefinedPhrases();
if (undefinedPhrases.length > 0) {
  console.log(
    "Undefined phrases:",
    undefinedPhrases.join(", "),
    " found in the codebase. Please check for typos, or talk to Denis to add new phrases to the Google Sheet if needed.",
  );
  process.exit(1);
}
console.log("No undefined phrases found.");
