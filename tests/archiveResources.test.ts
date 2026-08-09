/**
 * buildArchiveResources: the *.export.zip archive acts as the resource
 * folder for compile-time validation, replacing the EasyEyesResources repo.
 * @jest-environment node
 */
import JSZip from "jszip";
import { buildArchiveResources } from "../preprocess/archiveResources";
import { createFontDataCache, FontFile } from "../preprocess/fontDataCache";

async function makeArchive(
  files: Record<string, string | Uint8Array>,
): Promise<File> {
  const zip = new JSZip();
  for (const [path, contents] of Object.entries(files)) {
    zip.file(path, contents);
  }
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buffer], "study.export.zip");
}

const fromBase64 = (data: string): string =>
  Buffer.from(data, "base64").toString("utf8");

describe("buildArchiveResources — classification", () => {
  it("classifies a flat export archive into resource-type name lists", async () => {
    const archive = await makeArchive({
      "study.xlsx": "the experiment table",
      "Sloan.woff2": "font bytes",
      "consent.pdf": "form bytes",
      "corpus.txt": "Reading corpus text.",
      "mySounds.zip": "inner zip bytes",
      "photo.png": "image bytes",
      "helper.js": "code",
      "speaker.gainVTime.xlsx": "impulse",
      "speaker.gainVFreq.csv": "frequency",
      "words.targetSoundList.xlsx": "list",
      "DenisLanguage.phrases.xlsx": "phrases",
    });

    const resources = await buildArchiveResources(archive);

    expect(resources.fonts).toEqual(["Sloan.woff2"]);
    expect(resources.forms).toEqual(["consent.pdf"]);
    expect(resources.texts).toEqual(["corpus.txt"]);
    expect(resources.folders).toEqual(["mySounds.zip"]);
    expect(resources.images).toEqual(["photo.png"]);
    expect(resources.code).toEqual(["helper.js"]);
    expect(resources.impulseResponses).toEqual(["speaker.gainVTime.xlsx"]);
    expect(resources.frequencyResponses).toEqual(["speaker.gainVFreq.csv"]);
    expect(resources.targetSoundLists).toEqual(["words.targetSoundList.xlsx"]);
    // The experiment table itself is not a resource
    const allNames = [
      ...resources.fonts,
      ...resources.forms,
      ...resources.texts,
      ...resources.folders,
      ...resources.images,
      ...resources.code,
      ...resources.impulseResponses,
      ...resources.frequencyResponses,
      ...resources.targetSoundLists,
    ];
    expect(allNames).not.toContain("study.xlsx");
    // Phrase files become File objects, like the web compiler's phrases
    expect(resources.phrases).toHaveLength(1);
    expect(resources.phrases[0].name).toBe("DenisLanguage.phrases.xlsx");
    // Corpus contents are read for the reading-length checks
    expect(resources.textContents).toEqual({
      "corpus.txt": "Reading corpus text.",
    });
  });

  it("handles a re-zipped archive wrapped in a directory with junk entries", async () => {
    const archive = await makeArchive({
      "study.export/study.xlsx": "table",
      "study.export/Sloan.woff2": "font bytes",
      "study.export/corpus.txt": "text",
      "__MACOSX/study.export/._Sloan.woff2": "junk",
      "study.export/.DS_Store": "junk",
    });

    const resources = await buildArchiveResources(archive);

    expect(resources.fonts).toEqual(["Sloan.woff2"]);
    expect(resources.texts).toEqual(["corpus.txt"]);
    expect(resources.textContents["corpus.txt"]).toBe("text");
  });
});

describe("buildArchiveResources — localFetchers", () => {
  it("returns {name, file: base64} for impulse/frequency/targetSoundList files, skipping absent names", async () => {
    const archive = await makeArchive({
      "speaker.gainVTime.xlsx": "impulse content",
    });
    const { localFetchers } = await buildArchiveResources(archive);

    const files = await localFetchers.getImpulseResponseFiles([
      "speaker.gainVTime.xlsx",
      "missing.gainVTime.xlsx",
    ]);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("speaker.gainVTime.xlsx");
    expect(fromBase64(files[0].file)).toBe("impulse content");
  });

  it("returns font bytes as ArrayBuffers for the font validators", async () => {
    const archive = await makeArchive({ "Sloan.woff2": "font bytes" });
    const { localFetchers } = await buildArchiveResources(archive);

    const fonts = await localFetchers.getFontFiles([
      "Sloan.woff2",
      "missing.woff2",
    ]);
    expect(fonts).toHaveLength(1);
    expect(Buffer.from(fonts[0].data).toString("utf8")).toBe("font bytes");
  });

  it("attaches base64 folder zips to image folder objects, undefined when absent", async () => {
    const archive = await makeArchive({ "myImages.zip": "inner zip" });
    const { localFetchers } = await buildArchiveResources(archive);

    const [present, absent] = await localFetchers.getImageFiles([
      { targetImageFolder: "myImages", conditionTrials: "3" },
      { targetImageFolder: "notThere", conditionTrials: "3" },
    ]);
    expect(fromBase64(present.file)).toBe("inner zip");
    expect(present.conditionTrials).toBe("3");
    expect(absent.file).toBeUndefined();
  });

  it("builds folder-structure file objects from bundled folder zips", async () => {
    const archive = await makeArchive({ "myFolder.zip": "inner zip" });
    const { localFetchers } = await buildArchiveResources(archive);

    // targetKind "image" has no sound-structure rules, so no errors; the
    // point here is the {name, file, targetKind, parameter} shape.
    const { errors, files } = await localFetchers.getFolderStructureFiles([
      { targetSoundFolder: "myFolder", targetKind: "image" },
      { targetSoundFolder: "absentFolder", targetKind: "image" },
    ]);
    expect(errors).toEqual([]);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      name: { name: "myFolder", targetKind: "image" },
      targetKind: "image",
      parameter: "targetSoundFolder",
    });
    expect(fromBase64(files[0].file)).toBe("inner zip");
  });
});

describe("createFontDataCache — fetch override", () => {
  it("sources font bytes from the override and caches them", async () => {
    const fetchFonts = jest.fn(
      async (names: string[]): Promise<FontFile[]> =>
        names.map((name) => ({ name, data: new ArrayBuffer(8) })),
    );
    const cache = createFontDataCache("web", undefined, undefined, fetchFonts);

    const first = await cache.getFontData(["a.woff2"]);
    const second = await cache.getFontData(["a.woff2"]);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(fetchFonts).toHaveBeenCalledTimes(1);
    expect(fetchFonts).toHaveBeenCalledWith(["a.woff2"]);
  });
});
