/**
 * RED test: generate_video must load FFmpeg via ESM, not CommonJS require().
 *
 * In the browser (vite dev server and the vite production build) there is no
 * CommonJS `require`, so generate_video crashed with
 * "ReferenceError: require is not defined" at movie-trial time
 * (movie-identify-sim). Desired: a lazy dynamic import() so the heavy
 * FFmpeg.wasm chunk loads only for movie trials.
 *
 * Jest runs under CommonJS, where `require` always exists, so a purely
 * functional test cannot catch this — the source-level invariant below
 * (no bare require() in browser-shipped code) is the RED guard.
 *
 * @jest-environment jsdom
 */

import * as fs from "fs";
import * as path from "path";
import { jest, expect, describe, test, beforeEach } from "@jest/globals";

// ── Mocks ──────────────────────────────────────────────────────────────────

const fakeFFmpeg = {
  load: jest.fn(async () => {}),
  FS: jest.fn((op: string, _name: string) => {
    if (op === "readFile") return new Uint8Array([1, 2, 3]);
    if (op === "readdir") return [".", "..", "out.mp4"];
    return undefined;
  }),
  run: jest.fn(async () => {}),
  exit: jest.fn(async () => {}),
};
const createFFmpeg = jest.fn(() => fakeFFmpeg);

jest.mock("@ffmpeg/ffmpeg", () => ({
  createFFmpeg: (...args: unknown[]) => (createFFmpeg as any)(...args),
}));

jest.mock("../components/global", () => ({
  displayOptions: { window: { _size: [800, 600] } },
  viewingDistanceCm: { current: 40, desired: 40, max: 40 },
}));

jest.mock("../components/utils", () => ({
  logger: jest.fn(),
  xyPxOfDeg: jest.fn(),
  xyDegOfPx: jest.fn(),
  isRectInRect: jest.fn(),
  Rectangle: jest.fn(function (a: number[], b: number[]) {
    return [a, b];
  }),
}));

jest.mock("../components/reading.ts", () => ({
  preprocessRawCorpus: (s: string) => s,
}));

jest.mock("../components/transformColorSpace.js", () => ({
  im_ctrans: jest.fn(),
}));

jest.mock("image-js", () => ({
  Image: jest.fn(function () {
    return { toBuffer: () => new Uint8Array([0]) };
  }),
}));

jest.mock("axios", () => ({
  get: jest.fn(),
  default: { get: jest.fn() },
}));

import {
  generate_video,
  resetFFmpegCache,
} from "../components/imageAndVideoGeneration.js";

const psychoJS: any = { experiment: { addData: jest.fn() } };

beforeEach(() => {
  resetFFmpegCache(); // module-level ffmpeg singleton must not leak across tests
  (window as any).RemoteCalibrator = {
    init: jest.fn(),
    browser: { value: "Chrome" },
  };
  // Codec support is probed via <video>.canPlayType — the actual playback
  // path (threshold.js sets video.src to the blob URL, no MediaSource).
  (window as any).HTMLVideoElement.prototype.canPlayType = jest.fn(
    () => "probably",
  );
  (URL as any).createObjectURL = jest.fn(() => "blob:fake");
  createFFmpeg.mockClear();
  fakeFFmpeg.load.mockClear();
  fakeFFmpeg.run.mockClear();
});

describe("generate_video — FFmpeg loading", () => {
  test("source invariant: no bare CommonJS require() in browser-shipped module", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../components/imageAndVideoGeneration.js"),
      "utf8",
    );
    // Strip comments so a commented-out require doesn't false-positive.
    const noComments = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(noComments).not.toMatch(/\brequire\s*\(/);
  });

  test("loads FFmpeg without CommonJS require (browser/ESM safe)", async () => {
    const bitmap = [[[100]], [[200]]]; // 2×1×1 movie
    const url = await generate_video(bitmap, "1", psychoJS, false);
    expect(createFFmpeg).toHaveBeenCalledTimes(1);
    expect(fakeFFmpeg.load).toHaveBeenCalledTimes(1);
    expect(fakeFFmpeg.run).toHaveBeenCalled();
    expect(url).toBe("blob:fake");
  });

  test("probes codec support via <video> canPlayType, not MediaSource", async () => {
    // Playback is a plain <video src=blobURL> (threshold.js), so the gate
    // must use the <video> probe. MediaSource may be absent entirely.
    delete (window as any).MediaSource;
    const bitmap = [[[100]], [[200]]];
    const url = await generate_video(bitmap, "1", psychoJS, false);
    expect(fakeFFmpeg.run).toHaveBeenCalled();
    expect(url).toBe("blob:fake");
  });

  test("honors window.__FFMPEG_CORE_PATH__ override for the ffmpeg core", async () => {
    // Default is the unpkg CDN. Dev/sim set this hook to the vite-served
    // local @ffmpeg/core so encoding is deterministic and offline-capable.
    (window as any).__FFMPEG_CORE_PATH__ = "/custom/ffmpeg-core.js";
    const bitmap = [[[100]], [[200]]];
    await generate_video(bitmap, "1", psychoJS, false);
    expect(createFFmpeg).toHaveBeenCalledWith(
      expect.objectContaining({
        corePath: "/custom/ffmpeg-core.js",
      }),
    );
    delete (window as any).__FFMPEG_CORE_PATH__;
  });

  test("loads the ffmpeg core ONCE per session, not per trial", async () => {
    // The core is ~24MB; per-trial createFFmpeg()+load() re-fetches it every
    // trial (the trial-2 failure mode). Desired: a singleton — createFFmpeg
    // and load run once, exit is NOT called between trials.
    const bitmap = [[[100]], [[200]]];
    await generate_video(bitmap, "1", psychoJS, false);
    await generate_video(bitmap, "1", psychoJS, false);
    expect(createFFmpeg).toHaveBeenCalledTimes(1);
    expect(fakeFFmpeg.load).toHaveBeenCalledTimes(1);
    expect(fakeFFmpeg.exit).not.toHaveBeenCalled();
  });

  test("defaults to the local vite-served core on localhost", async () => {
    // jsdom runs at http://localhost — same as `npm start` dev. Local dev
    // must not depend on the unpkg CDN.
    const bitmap = [[[100]], [[200]]];
    await generate_video(bitmap, "1", psychoJS, false);
    expect(createFFmpeg).toHaveBeenCalledWith(
      expect.objectContaining({
        corePath: "/node_modules/@ffmpeg/core/dist/ffmpeg-core.js",
      }),
    );
  });

  test("no supported codec: rejects with a clear actionable error", async () => {
    // Browser supports neither hvc1 nor avc1.6e0033 → no ffmpeg.run → no
    // out.mp4. Production symptom was the cryptic ffmpeg.wasm FS error
    // "ffmpeg.FS('readFile', 'out.mp4') error" ending the study. Desired: a
    // clear error naming the codec problem.
    (window as any).HTMLVideoElement.prototype.canPlayType = jest.fn(() => "");
    fakeFFmpeg.FS.mockImplementation((op: string) => {
      if (op === "readdir") return [".", ".."]; // no out.mp4
      if (op === "readFile")
        throw new Error(
          "ffmpeg.FS('readFile', 'out.mp4') error. Check if the path exists",
        );
      return undefined;
    });
    const bitmap = [[[100]], [[200]]];
    await expect(generate_video(bitmap, "1", psychoJS, false)).rejects.toThrow(
      /codec|hvc1|avc1/i,
    );
    expect(fakeFFmpeg.run).not.toHaveBeenCalled();
  });

  test("codec supported but encode produced nothing: distinct encode-failure error", async () => {
    // canPlayType says "probably" (so ffmpeg.run executes), but out.mp4 is
    // missing — e.g. wasm OOM on a later trial. Must NOT blame codecs.
    fakeFFmpeg.FS.mockImplementation((op: string) => {
      if (op === "readdir") return [".", ".."]; // no out.mp4
      if (op === "readFile")
        throw new Error(
          "ffmpeg.FS('readFile', 'out.mp4') error. Check if the path exists",
        );
      return undefined;
    });
    const bitmap = [[[100]], [[200]]];
    await expect(generate_video(bitmap, "1", psychoJS, false)).rejects.toThrow(
      /failed to encode/i,
    );
    expect(fakeFFmpeg.run).toHaveBeenCalled();
  });
});
