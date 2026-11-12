/**
 * Read files from a local directory as ArrayBuffers (Node.js only).
 * Returns [{ name, data }] for files that exist.
 */
export async function readFilesAsArrayBuffers(baseDir, fileNames) {
  const fs = await import(/* webpackIgnore: true */ "fs");
  const path = await import(/* webpackIgnore: true */ "path");
  const files = [];
  for (const fileName of fileNames) {
    const filePath = path.join(baseDir, fileName);
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        continue;
      }
      const buffer = fs.readFileSync(filePath);
      const arrayBuffer = new ArrayBuffer(buffer.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(buffer);
      files.push({ name: fileName, data: arrayBuffer });
    } catch (error) {
      console.error("Error reading file", fileName, error);
    }
  }
  return files;
}
