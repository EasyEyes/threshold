import { spawn, type ChildProcess } from "child_process";
import { resolve } from "path";
import { readFileSync } from "fs";

const ADDONS_DIR = resolve(__dirname, "../addons");

const PROXY_PORT = 8080;

export class MitmProxy {
  private proc: ChildProcess | null = null;
  readonly port: number;

  constructor(port = PROXY_PORT) {
    this.port = port;
  }

  start(addon: string): Promise<void> {
    return new Promise((res, rej) => {
      const addonPath = resolve(ADDONS_DIR, addon);
      // No -q so that "proxy listening at" appears on stderr for readiness detection.
      this.proc = spawn(
        "mitmdump",
        ["-p", String(this.port), "-s", addonPath],
        { stdio: ["ignore", "pipe", "pipe"] },
      );

      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          res();
        }
      };

      const check = (chunk: Buffer) => {
        if (chunk.toString().includes("proxy listening at")) done();
      };

      this.proc.stdout?.on("data", check);
      this.proc.stderr?.on("data", check);
      this.proc.on("error", rej);

      // Fallback: proxy is usually ready in under 2 s
      setTimeout(done, 3_000);
    });
  }

  stop(): Promise<void> {
    return new Promise((res) => {
      if (!this.proc) return res();
      this.proc.on("exit", () => res());
      this.proc.kill("SIGTERM");
      this.proc = null;
    });
  }

  get proxyUrl(): string {
    return `http://localhost:${this.port}`;
  }
}

// Shared: read the bundle once and build page HTML.
const FIXTURE_DIR = resolve(__dirname, "../fixture");

let _bundle: string | null = null;
function bundle(): string {
  if (!_bundle) _bundle = readFileSync(resolve(FIXTURE_DIR, "harness.bundle.js"), "utf8");
  return _bundle;
}

/** Return self-contained page HTML with FIXTURE_URL injected. */
export function fixtureHtml(stubUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <p id="status"></p>
  <p id="result"></p>
  <script>window.FIXTURE_URL = ${JSON.stringify(stubUrl)};</script>
  <script>${bundle()}</script>
</body>
</html>`;
}
