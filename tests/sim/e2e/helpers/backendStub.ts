import { spawn } from "node:child_process";
import { simE2EPort, type SimE2ESuite } from "./ports";

export interface BackendStub {
  url: string;
  stop: () => void;
}

/** Start the cached phrases/glossary backend and wait until it answers. */
export const startBackendStub = async (
  suite: SimE2ESuite,
  offset = 1,
): Promise<BackendStub> => {
  const port = simE2EPort(suite, offset);
  const child = spawn(
    "node",
    ["tests/sim/e2e/helpers/backendStubServer.mjs", String(port)],
    { cwd: process.cwd(), detached: true, stdio: "ignore" },
  );
  const stop = () => {
    try {
      if (child.pid) process.kill(-child.pid, "SIGKILL");
    } catch {}
  };

  try {
    for (let i = 0; i < 30; i++) {
      try {
        const response = await fetch(
          `${url(port)}/.netlify/functions/phrases?pinned=x/y`,
        );
        if (response.ok) return { url: url(port), stop };
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Backend stub did not start on port ${port}`);
  } catch (error) {
    stop();
    throw error;
  }
};

const url = (port: number) => `http://localhost:${port}`;
