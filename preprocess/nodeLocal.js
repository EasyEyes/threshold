/**
 * Load the EasyEyes WASM module from a local file (Node.js only).
 * Returns a wrapper exposing get_font_variable_axes, or null on failure.
 */
export async function loadWasmModuleLocal(baseDir, wasmRelativePath) {
  const fs = await import(/* webpackIgnore: true */ "fs");
  const path = await import(/* webpackIgnore: true */ "path");
  try {
    const wasmPath = path.resolve(baseDir, wasmRelativePath);
    if (!fs.existsSync(wasmPath)) return null;

    const wasmBytes = fs.readFileSync(wasmPath);

    let wasmInstance = null;
    const textDecoder = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true,
    });

    const getStringFromWasm = (ptr, len) => {
      const memory = new Uint8Array(wasmInstance.exports.memory.buffer);
      return textDecoder.decode(memory.subarray(ptr, ptr + len));
    };

    const imports = {
      wbg: {
        __wbg_log_461b6f6f48e94344: (arg0, arg1) => {
          console.log(getStringFromWasm(arg0, arg1));
        },
        __wbindgen_cast_2241b6af4c4b2941: (arg0, arg1) => {
          return getStringFromWasm(arg0, arg1);
        },
        __wbindgen_init_externref_table: () => {
          const table = wasmInstance.exports.__wbindgen_externrefs;
          const offset = table.grow(4);
          table.set(0, undefined);
          table.set(offset + 0, undefined);
          table.set(offset + 1, null);
          table.set(offset + 2, true);
          table.set(offset + 3, false);
        },
      },
    };

    const wasmModule = await WebAssembly.compile(wasmBytes);
    const instance = await WebAssembly.instantiate(wasmModule, imports);
    wasmInstance = instance;

    if (instance.exports.__wbindgen_start) {
      instance.exports.__wbindgen_start();
    }

    return {
      get_font_variable_axes: (fontData) => {
        const exports = instance.exports;
        const malloc = exports.__wbindgen_malloc;
        const free = exports.__wbindgen_free;

        const ptr = malloc(fontData.length, 1) >>> 0;
        let retPtr = 0;
        let retLen = 0;
        try {
          // Get fresh memory view after malloc (which may grow WASM memory)
          const mem = new Uint8Array(exports.memory.buffer);
          mem.set(fontData, ptr);

          const ret = exports.get_font_variable_axes(ptr, fontData.length);
          retPtr = ret[0];
          retLen = ret[1];

          if (ret[3]) {
            retPtr = 0;
            retLen = 0;
            throw new Error("WASM function returned an error");
          }

          const result = getStringFromWasm(retPtr, retLen);
          return result;
        } finally {
          // Free return buffer if allocated
          if (retPtr !== 0) {
            free(retPtr, retLen, 1);
          }
          // Note: Input buffer ptr is managed by WASM bindgen and should not be freed here
          // The generated code (easyeyes_wasm.js) also doesn't free the input buffer
        }
      },
    };
  } catch (error) {
    console.warn(
      "[Font Validation] WASM module not available in Node.js, skipping font introspection checks",
      error,
    );
    return null;
  }
}

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
