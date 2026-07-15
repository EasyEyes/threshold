import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const thresholdRoot = path.resolve(__dirname, "..");
const rustDir = path.join(thresholdRoot, "@rust");
const pkgDir = path.join(rustDir, "pkg");

const isWindows = process.platform === "win32";

const toolCandidates = (name) => {
  const names = isWindows ? [`${name}.exe`, name] : [name];
  const dirs = [];
  const home = os.homedir();
  if (home) {
    dirs.push(path.join(home, ".cargo", "bin"));
  }
  const pathEnv = process.env.PATH ?? process.env.Path ?? "";
  dirs.push(...pathEnv.split(path.delimiter).filter(Boolean));
  const seen = new Set();
  const out = [];
  for (const dir of dirs) {
    for (const file of names) {
      const full = path.join(dir, file);
      if (seen.has(full)) continue;
      seen.add(full);
      if (fs.existsSync(full)) out.push(full);
    }
  }
  return out;
};

const resolveTool = (name) => {
  const found = toolCandidates(name);
  if (found.length > 0) return found[0];
  return name;
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
};

const cargoTargetDir = () => {
  const result = spawnSync(
    cargo,
    ["metadata", "--format-version", "1", "--no-deps"],
    { cwd: rustDir, encoding: "utf8" },
  );
  if (result.status !== 0 || !result.stdout) {
    console.error("Error: cargo metadata failed");
    process.exit(result.status ?? 1);
  }
  const metadata = JSON.parse(result.stdout);
  return metadata.target_directory;
};

const wasmArtifactPath = (targetDir) =>
  path.join(
    targetDir,
    "wasm32-unknown-unknown",
    "release",
    "easyeyes_wasm.wasm",
  );

const cargo = resolveTool("cargo");
const wasmBindgen = resolveTool("wasm-bindgen");

if (!toolCandidates("cargo").length) {
  console.error(
    "Error: cargo not found. Install Rust from https://rustup.rs/, then run:",
  );
  console.error("  rustup target add wasm32-unknown-unknown");
  console.error("  cargo install wasm-bindgen-cli --version 0.2.105");
  process.exit(1);
}

if (!toolCandidates("wasm-bindgen").length) {
  console.error("Error: wasm-bindgen not found. Install with:");
  console.error("  cargo install wasm-bindgen-cli --version 0.2.105");
  process.exit(1);
}

console.log(`Using cargo: ${cargo}`);
console.log(`Using wasm-bindgen: ${wasmBindgen}`);

run(cargo, ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: rustDir,
});

const wasmOut = wasmArtifactPath(cargoTargetDir());
if (!fs.existsSync(wasmOut)) {
  console.error(`Error: expected WASM artifact at ${wasmOut}`);
  process.exit(1);
}

fs.rmSync(pkgDir, { recursive: true, force: true });
fs.mkdirSync(pkgDir, { recursive: true });

run(wasmBindgen, ["--target", "web", "--out-dir", pkgDir, wasmOut]);

// Shrink the artifact with wasm-opt when available (PATH, cargo bin, or the
// wasm-opt npm devDependency). Skipped silently-ish when missing: the build
// still produces a valid, just larger, module.
const wasmOptCandidates = [
  ...toolCandidates("wasm-opt"),
  path.join(
    thresholdRoot,
    "node_modules",
    ".bin",
    isWindows ? "wasm-opt.cmd" : "wasm-opt",
  ),
].filter(
  (p) =>
    fs.existsSync(p) &&
    // On Windows spawnSync can only run .exe directly or .cmd via a shell;
    // skip extensionless POSIX shims (npm puts one on PATH).
    (!isWindows || p.endsWith(".exe") || p.endsWith(".cmd")),
);

const bindgenWasm = path.join(pkgDir, "easyeyes_wasm_bg.wasm");
if (wasmOptCandidates.length > 0) {
  const wasmOpt = wasmOptCandidates[0];
  console.log(`Using wasm-opt: ${wasmOpt}`);
  const before = fs.statSync(bindgenWasm).size;
  // Plain -Oz only: -all would let older binaryen emit experimental
  // encodings that browsers reject ("invalid value type").
  const result = spawnSync(wasmOpt, ["-Oz", bindgenWasm, "-o", bindgenWasm], {
    stdio: "inherit",
    shell: wasmOpt.endsWith(".cmd"),
  });
  if (result.status === 0) {
    const after = fs.statSync(bindgenWasm).size;
    console.log(
      `wasm-opt: ${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(
        2,
      )} MB`,
    );
  } else {
    console.warn("wasm-opt failed; keeping unoptimized module.");
  }
} else {
  console.warn(
    "wasm-opt not found (npm install adds it); skipping size optimization.",
  );
}

console.log(`WASM package written to ${pkgDir}`);
