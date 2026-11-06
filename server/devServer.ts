import { execSync, spawn, type ChildProcess } from "child_process";
import { closeSync, openSync } from "fs";
import * as http from "http";

export interface DevServerOptions {
  port: number;
  experimentName?: string;
  cwd?: string;
  logFile?: string;
  strictPort?: boolean;
  development?: boolean;
}

export function pollUrl(
  url: string,
  intervalMs: number,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 400) resolve();
          else retry();
          res.resume();
        })
        .on("error", retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs)
        reject(new Error(`Timeout waiting for ${url}`));
      else setTimeout(check, intervalMs);
    };
    check();
  });
}

function killGroup(pid: number, sig: NodeJS.Signals): void {
  try {
    process.kill(-pid, sig);
  } catch {
    try {
      process.kill(pid, sig);
    } catch {}
  }
}

function groupAlive(pid: number): boolean {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Kill a detached server's whole group, escalating if SIGTERM is ignored. */
export async function killProcessTree(
  pid: number,
  { graceMs = 1500 }: { graceMs?: number } = {},
): Promise<void> {
  if (!groupAlive(pid)) return;
  killGroup(pid, "SIGTERM");
  const start = Date.now();
  while (groupAlive(pid) && Date.now() - start < graceMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (groupAlive(pid)) {
    killGroup(pid, "SIGKILL");
    const killStart = Date.now();
    while (groupAlive(pid) && Date.now() - killStart < 1000) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

function killProcessTreeSync(pid: number): void {
  killGroup(pid, "SIGKILL");
}

export function killPortOccupants(port: number): void {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, {
      shell: "zsh",
    });
  } catch {}
}

const activeServerPids = new Set<number>();
const logFds = new Map<number, number>();
let globalCleanupInstalled = false;

function installGlobalCleanup(): void {
  if (globalCleanupInstalled) return;
  globalCleanupInstalled = true;
  const killAllSync = () => {
    for (const pid of activeServerPids) killProcessTreeSync(pid);
  };
  process.on("exit", killAllSync);
  process.on("SIGINT", () => {
    killAllSync();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    killAllSync();
    process.exit(143);
  });
}

/** Spawn a detached example/Vite server and register its process group. */
export function spawnDevServer({
  port,
  experimentName,
  cwd = process.cwd(),
  logFile,
  strictPort = false,
  development = false,
}: DevServerOptions): ChildProcess {
  killPortOccupants(port);
  const logFd = logFile ? openSync(logFile, "a") : undefined;
  const server = experimentName
    ? spawn(
        "npm",
        ["start", "--", `--name=${experimentName}`, `--port=${port}`],
        {
          stdio: ["ignore", logFd ?? "ignore", logFd ?? "ignore"],
          detached: true,
          cwd,
          env: { ...process.env, VITE_NO_OPEN: "1" },
        },
      )
    : spawn(
        "npx",
        [
          "vite",
          ...(development ? ["--mode", "development"] : []),
          "--port",
          String(port),
          ...(strictPort ? ["--strictPort"] : []),
        ],
        {
          stdio: ["ignore", logFd ?? "ignore", logFd ?? "pipe"],
          detached: true,
          cwd,
          env: { ...process.env, VITE_NO_OPEN: "1" },
        },
      );
  installGlobalCleanup();
  if (server.pid) {
    activeServerPids.add(server.pid);
    if (logFd !== undefined) logFds.set(server.pid, logFd);
  } else if (logFd !== undefined) {
    closeSync(logFd);
  }
  return server;
}

/** Stop a server group and guarantee its port is released. */
export async function stopDevServer(
  server: ChildProcess | undefined,
  port: number,
): Promise<void> {
  if (server?.pid) {
    await killProcessTree(server.pid);
    activeServerPids.delete(server.pid);
    const logFd = logFds.get(server.pid);
    if (logFd !== undefined) closeSync(logFd);
    logFds.delete(server.pid);
  }
  killPortOccupants(port);
}
