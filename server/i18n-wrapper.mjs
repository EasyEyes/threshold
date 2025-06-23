// Wrapper to load ES6 module with .js extension
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the i18n.js file and extract the phrases object
const i18nPath = join(__dirname, '../components/i18n.js');
const i18nContent = readFileSync(i18nPath, 'utf8');

// Extract the phrases object by parsing the export
// Look for "export const phrases = {" and extract the object
const startMatch = i18nContent.match(/export const phrases = \{/);
if (!startMatch) {
  throw new Error('Could not find phrases export in i18n.js');
}

const startIndex = startMatch.index + startMatch[0].length - 1; // Include the opening brace
let braceCount = 0;
let endIndex = startIndex;

// Find the closing brace by counting braces
for (let i = startIndex; i < i18nContent.length; i++) {
  if (i18nContent[i] === '{') braceCount++;
  if (i18nContent[i] === '}') braceCount--;
  if (braceCount === 0) {
    endIndex = i + 1;
    break;
  }
}

const phrasesString = i18nContent.substring(startIndex, endIndex);
const phrases = eval(`(${phrasesString})`);

export { phrases }; 