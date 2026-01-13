#!/usr/bin/env node

import { spawn } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import readline from 'readline';

/**
 * Parse command line arguments for --name or --example flags
 * Pass through other arguments to Vite
 */
function parseArgs(args) {
  const parsed = {};
  const remaining = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        if (key === 'name' || key === 'example') parsed.name = value;
        else remaining.push(arg); // Pass through to Vite
      } else {
        const key = arg.slice(2);
        if (key === 'name' || key === 'example') {
          if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
            parsed.name = args[i + 1];
            i++;
          } else {
            parsed.name = true; // Flag without value
          }
        } else {
          remaining.push(arg); // Pass through to Vite
        }
      }
    } else {
      remaining.push(arg);
    }
  }
  return { parsed, remaining };
}

/**
 * Scan examples directory for built examples with index.html
 */
function scanExamples() {
  const examplesDir = 'examples/generated';
  try {
    const items = readdirSync(examplesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .filter(name => {
        const indexPath = join(examplesDir, name, 'index.html');
        return existsSync(indexPath);
      })
      .sort();
    return items;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('examples/generated directory not found.');
    } else {
      console.error('Error scanning examples:', err.message);
    }
    return [];
  }
}

/**
 * Interactive selection using inquirer (if available) or readline fallback
 */
async function selectExample() {
  const items = scanExamples();

  if (items.length === 0) {
    console.error('No built examples found. Run `npm run examples` first.');
    process.exit(1);
  }

  // Try to use inquirer for better UX
  try {
    const inquirer = await import('inquirer');
    const { selectedExample } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'selectedExample',
        message: 'Select an example to run:',
        choices: items,
        pageSize: Math.min(20, items.length),
      }
    ]);
    return selectedExample;
  } catch (err) {
    // inquirer not available, fall back to readline
    console.log('\nAvailable examples:');
    items.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      const ask = () => {
        rl.question(`Select example (1-${items.length}) or Ctrl+C to exit: `, (answer) => {
          const num = parseInt(answer, 10);
          if (num >= 1 && num <= items.length) {
            rl.close();
            resolve(items[num - 1]);
          } else {
            console.log(`Please enter a number between 1 and ${items.length}`);
            ask();
          }
        });
      };
      ask();
    });
  }
}

/**
 * Validate example directory exists and has index.html
 */
function validateExample(name) {
  const examplePath = join('examples/generated', name);
  const indexPath = join(examplePath, 'index.html');

  if (!existsSync(examplePath)) {
    console.error(`Example '${name}' not found in examples/generated/ directory.`);
    console.error('Available examples:');
    const items = scanExamples();
    if (items.length === 0) {
      console.log('  No built examples found.');
      console.log('  Run `npm run examples` to build examples.');
    } else {
      items.forEach(name => console.log(`  - ${name}`));
    }
    process.exit(1);
  }

  if (!existsSync(indexPath)) {
    console.error(`Example '${name}' missing index.html.`);
    console.error(`Run \`npm run examples ${name}\` to build the example.`);
    process.exit(1);
  }

  return true;
}

/**
 * Run a command and wait for completion
 */
async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...options });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command ${cmd} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { parsed, remaining } = parseArgs(args);

  let exampleName = parsed.name;

  // If no name provided, show interactive selection
  if (!exampleName || exampleName === true) {
    exampleName = await selectExample();
  }

  // Validate example exists
  validateExample(exampleName);

  // Set environment variable for Vite config
  process.env.VITE_EXAMPLE_NAME = exampleName;
  console.log(`Starting example: ${exampleName}`);

  // Run check:rust
  try {
    await runCommand('npm', ['run', 'check:rust']);
  } catch (err) {
    console.error('Failed to run check:rust:', err.message);
    process.exit(1);
  }

  // Start Vite with remaining arguments
  const viteArgs = ['--mode', 'development', ...remaining];
  try {
    await runCommand('npx', ['vite', ...viteArgs]);
  } catch (err) {
    console.error('Vite failed:', err.message);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\nExiting...');
  process.exit(0);
});

// Run main function
main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});