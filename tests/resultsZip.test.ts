import JSZip from "jszip";
import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { generateResultsZip } from "../preprocess/resultsZip";
import {
  parseSessionDate,
  sessionDateToZipDate,
} from "../preprocess/sessionDate";

const filename = "P_2026-08-12_15h19.01.041 UTC-4.csv";
const instant = new Date("2026-08-12T19:19:01.041Z");
const csv = "trial,response\n1,é\n";

const fields = (bytes: Uint8Array, offset: number, length: number) => {
  const result = new Map<number, DataView>();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = offset + length;
  while (offset < end) {
    const id = view.getUint16(offset, true);
    const size = view.getUint16(offset + 2, true);
    expect(offset + 4 + size).toBeLessThanOrEqual(end);
    expect(result.has(id)).toBe(false);
    result.set(
      id,
      new DataView(bytes.buffer, bytes.byteOffset + offset + 4, size),
    );
    offset += 4 + size;
  }
  expect(offset).toBe(end);
  return result;
};

const headers = (bytes: Uint8Array, name: string) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22; // Fixtures have no archive comment.
  let cursor = view.getUint32(end + 16, true);
  for (let i = 0; i < view.getUint16(end + 10, true); i++) {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    if (
      new TextDecoder().decode(
        bytes.subarray(cursor + 46, cursor + 46 + nameLength),
      ) === name
    ) {
      const local = view.getUint32(cursor + 42, true);
      expect(view.getUint32(local, true)).toBe(0x04034b50);
      return [
        fields(bytes, cursor + 46 + nameLength, extraLength),
        fields(
          bytes,
          local + 30 + view.getUint16(local + 26, true),
          view.getUint16(local + 28, true),
        ),
      ];
    }
    cursor += 46 + nameLength + extraLength + view.getUint16(cursor + 32, true);
  }
  throw new Error(`Missing ZIP entry ${name}`);
};

const expectSessionFields = (bytes: Uint8Array, name: string) => {
  const ticks = BigInt(instant.getTime()) * 10000n + 116444736000000000n;
  for (const header of headers(bytes, name)) {
    const ntfs = header.get(0x000a)!;
    expect(ntfs.getUint16(4, true)).toBe(1);
    expect(ntfs.getUint16(6, true)).toBe(24);
    for (const offset of [8, 16, 24]) {
      expect(ntfs.getBigUint64(offset, true)).toBe(ticks);
    }
    expect(header.get(0x5455)!.getUint32(1, true)).toBe(
      Math.floor(instant.getTime() / 1000),
    );
    expect(header.get(0x5855)!.getUint32(4, true)).toBe(
      Math.floor(instant.getTime() / 1000),
    );
  }
};

test.each(["STORE", "DEFLATE"] as const)(
  "preserves contents, names and offsets with %s compression",
  async (compression) => {
    const zip = Object.assign(new JSZip(), {
      comment: "Results archive comment",
    });
    const session = parseSessionDate(filename)!;
    zip.file(filename, csv, {
      date: sessionDateToZipDate(session),
      compression,
    });
    // Database exports use names without a date; they still receive UTC metadata.
    zip.file("session123-study.csv", csv, {
      compression,
      comment: "session comment",
    });
    zip.file("nested/é.csv", csv, { compression });
    zip.file("unrelated.csv", "other");
    const bytes = new Uint8Array(
      await (
        await generateResultsZip(
          zip,
          new Map([
            [filename, instant],
            ["session123-study.csv", instant],
            ["nested/é.csv", instant],
          ]),
        )
      ).arrayBuffer(),
    );
    const restored = await JSZip.loadAsync(bytes, { checkCRC32: true });
    expect((restored as JSZip & { comment: string }).comment).toBe(zip.comment);
    for (const name of [filename, "session123-study.csv", "nested/é.csv"]) {
      expect(await restored.file(name)!.async("string")).toBe(csv);
    }
    expect(restored.file("session123-study.csv")!.comment).toBe(
      "session comment",
    );
    expect(await restored.file("unrelated.csv")!.async("string")).toBe("other");
    expect(restored.files["nested/"].dir).toBe(true);
  },
);

test("writes exact UTC creation and modification times into both headers", async () => {
  const zip = new JSZip().file(filename, csv).file("session123-study.csv", csv);
  const dates = new Map([
    [filename, instant],
    ["session123-study.csv", instant],
  ]);
  const bytes = new Uint8Array(
    await (await generateResultsZip(zip, dates)).arrayBuffer(),
  );
  expectSessionFields(bytes, filename);
  expectSessionFields(bytes, "session123-study.csv");
});

test("leaves legacy and unrelated entries without fabricated UTC metadata", async () => {
  const legacy = "P_2022-06-03_16h52.47.629.csv";
  const zip = new JSZip().file(legacy, csv).file("demographics.csv", "other");
  const bytes = new Uint8Array(
    await (await generateResultsZip(zip, new Map())).arrayBuffer(),
  );
  for (const name of [legacy, "demographics.csv"])
    for (const header of headers(bytes, name))
      expect(header.has(0x000a)).toBe(false);
});

test("generates a readable empty archive", async () => {
  const blob = await generateResultsZip(new JSZip(), new Map());
  expect(
    Object.keys((await JSZip.loadAsync(await blob.arrayBuffer())).files),
  ).toEqual([]);
});

// Each producer runs in a real process with TZ set at startup. Changing
// process.env.TZ inside Jest does not reliably change Date's local timezone.
const generateInZone = (tz: string): Buffer => {
  const script = `
    const ts = require(${JSON.stringify(require.resolve("typescript"))});
    require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(
      require('fs').readFileSync(file, 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }
    ).outputText, file);
    const JSZip = require(${JSON.stringify(require.resolve("jszip"))});
    const { generateResultsZip } = require(${JSON.stringify(
      resolve(__dirname, "../preprocess/resultsZip.ts"),
    )});
    const { parseSessionDate, sessionDateToZipDate } = require(${JSON.stringify(
      resolve(__dirname, "../preprocess/sessionDate.ts"),
    )});
    const session = parseSessionDate(${JSON.stringify(filename)});
    const zip = new JSZip().file(${JSON.stringify(filename)}, ${JSON.stringify(
      csv,
    )}, { date: sessionDateToZipDate(session) });
    generateResultsZip(zip, new Map([[${JSON.stringify(
      filename,
    )}, session.date]]))
      .then(blob => blob.arrayBuffer()).then(bytes => process.stdout.write(Buffer.from(bytes)));
  `;
  return execFileSync(process.execPath, ["-e", script], {
    env: { ...process.env, TZ: tz },
  });
};

test.each(["UTC", "America/New_York", "Asia/Dubai", "Asia/Kolkata"])(
  "preserves UTC metadata when downloaded in %s",
  (tz) => {
    expectSessionFields(generateInZone(tz), filename);
  },
);

const macTest = process.platform === "darwin" ? test : test.skip;
macTest.each([
  ["ditto", "Asia/Kolkata"],
  ["ditto", "America/New_York"],
  ["unzip", "Asia/Kolkata"],
  ["unzip", "America/New_York"],
  ["bsdtar", "Asia/Kolkata"],
  ["bsdtar", "America/New_York"],
])("%s restores both filesystem dates when extracted in %s", (tool, tz) => {
  const root = mkdtempSync(join(tmpdir(), "easyeyes-results-dates-"));
  try {
    const archive = join(root, "results.zip");
    writeFileSync(archive, generateInZone("Asia/Dubai"));
    const args =
      tool === "ditto"
        ? ["-x", "-k", archive, root]
        : tool === "unzip"
        ? ["-q", archive]
        : ["-xf", archive];
    execFileSync(`/usr/bin/${tool}`, args, {
      cwd: root,
      env: { ...process.env, TZ: tz },
    });
    const path = join(root, filename);
    expect(readFileSync(path, "utf8")).toBe(csv);
    const stats = statSync(path);
    // These macOS tools discard subsecond precision; the ZIP keeps it in NTFS fields.
    expect(Math.floor(stats.mtimeMs / 1000)).toBe(
      Math.floor(instant.getTime() / 1000),
    );
    expect(Math.floor(stats.birthtimeMs / 1000)).toBe(
      Math.floor(instant.getTime() / 1000),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
