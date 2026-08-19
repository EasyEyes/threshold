import JSZip from "jszip";
import { flattenZipEntries } from "../preprocess/zipUtils";

// Build a zip in memory and reload it, like production code does with an
// uploaded *.source.zip (or older *.export.zip) File.
async function roundTrip(files: Record<string, string>): Promise<JSZip> {
  const zip = new JSZip();
  for (const [path, contents] of Object.entries(files)) {
    zip.file(path, contents);
  }
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new JSZip().loadAsync(buffer);
}

describe("flattenZipEntries", () => {
  it("returns top-level entries of a flat archive unchanged", async () => {
    const zip = await roundTrip({
      "study.xlsx": "table",
      "Sloan.woff2": "font",
      "myFolder.zip": "folder",
    });

    const names = flattenZipEntries(zip).map((e) => e.name);
    expect(names.sort()).toEqual(["Sloan.woff2", "myFolder.zip", "study.xlsx"]);
  });

  it("flattens entries wrapped in a directory by a manual re-zip", async () => {
    const zip = await roundTrip({
      "study.export/study.xlsx": "table",
      "study.export/Sloan.woff2": "font",
    });

    const entries = flattenZipEntries(zip);
    const names = entries.map((e) => e.name);
    expect(names.sort()).toEqual(["Sloan.woff2", "study.xlsx"]);

    // Contents must come from the real nested entries
    const font = entries.find((e) => e.name === "Sloan.woff2");
    expect(await font?.entry.async("text")).toBe("font");
  });

  it("skips directory entries", async () => {
    // JSZip auto-creates the "study.export/" directory entry (dir: true)
    const zip = await roundTrip({ "study.export/study.xlsx": "table" });

    expect(Object.keys(zip.files)).toContain("study.export/");
    const names = flattenZipEntries(zip).map((e) => e.name);
    expect(names).toEqual(["study.xlsx"]);
  });

  it("skips OS junk entries added by archive tools", async () => {
    const zip = await roundTrip({
      "study.export/study.xlsx": "table",
      "__MACOSX/study.export/._study.xlsx": "apple double",
      "study.export/._Sloan.woff2": "apple double",
      "study.export/.DS_Store": "finder",
      "study.export/Thumbs.db": "explorer",
      "study.export/desktop.ini": "explorer",
    });

    const names = flattenZipEntries(zip).map((e) => e.name);
    expect(names).toEqual(["study.xlsx"]);
  });

  it("flattens arbitrarily deep nesting to basenames", async () => {
    const zip = await roundTrip({
      "outer/inner/texts/story.txt": "text",
    });

    const names = flattenZipEntries(zip).map((e) => e.name);
    expect(names).toEqual(["story.txt"]);
  });

  it("returns every entry when basenames collide across directories", async () => {
    // Nothing dedupes here; consumers resolve the ambiguity, so preserve
    // archive order to make their resolution deterministic.
    const zip = await roundTrip({
      "study.export/fonts/A.woff2": "font",
      "study.export/corpora/A.woff2": "corpus",
    });

    const entries = flattenZipEntries(zip);
    expect(entries.map((e) => e.name)).toEqual(["A.woff2", "A.woff2"]);
    expect(await entries[0].entry.async("text")).toBe("font");
    expect(await entries[1].entry.async("text")).toBe("corpus");
  });
});
