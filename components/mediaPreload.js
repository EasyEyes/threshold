// Session-owned media bytes: consumers never depend on HTTP cache retention.
const entries = new Map();
let sealed = false;
const keyFor = (url) => new URL(url, document.baseURI).href;
export const collectStudyMedia = (reader) => {
  const urls = new Set();
  for (const c of reader.conditions) {
    // Use the same parameter defaults as the eventual media consumers.
    const get = (key) =>
      typeof reader.read === "function"
        ? reader.read(key, c.block_condition)
        : c[key];
    const add = (key, prefix, suffix = "") => {
      const value = get(key);
      if (typeof value === "string" && value.trim())
        urls.add(`${prefix}${value.trim()}${suffix}`);
    };
    // Optional sound tests and image parsing also inspect configured folders
    // outside the current target kind. Include every nonempty configured asset.
    add("targetImageFolder", "folders/", ".zip");
    add("targetSoundFolder", "folders/", ".zip");
    add("maskerSoundFolder", "folders/", ".zip");
    add("targetSoundList", "targetSoundLists/");
    add("showImage", "images/");
  }
  return [...urls];
};

export const mediaUrl = (url) => {
  const entry = entries.get(keyFor(url));
  if (entry) return (entry.objectUrl ||= URL.createObjectURL(entry.blob));
  if (sealed) throw new Error(`Required media was not preloaded: ${url}`);
  return url;
};
export const fetchMedia = async (url) => {
  const entry = entries.get(keyFor(url));
  if (entry) return new Response(entry.blob);
  if (sealed) throw new Error(`Required media was not preloaded: ${url}`);
  return fetch(url);
};

// Time out inactivity, not the total duration of a healthy slow download.
export async function downloadMedia(url, onProgress, signal, idleMs = 90000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  let timer;
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(abort, idleMs);
  };
  reset();
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    const length = Number(response.headers.get("Content-Length")) || 0;
    reset();
    const reader = response.body?.getReader();
    if (!reader) {
      const blob = await response.blob();
      onProgress(blob.size, blob.size);
      return blob;
    }
    const chunks = [];
    let received = 0;
    onProgress(0, length);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      reset();
      onProgress(received, length);
    }
    onProgress(received, received);
    return new Blob(chunks, {
      type: response.headers.get("Content-Type") || "",
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function preloadStudyMedia({
  reader,
  rc,
  distance,
  signal,
  calibrationTasks,
  compressed,
}) {
  const instructionMedia = { calibrationTasks, compressed };
  // Tasks that start face tracking; RC decides which models each one needs.
  const models = (calibrationTasks || []).some(({ name }) =>
    ["trackDistance", "measureDistance", "trackGaze"].includes(name),
  );
  if (
    (distance &&
      (typeof rc.getInstructionMediaUrls !== "function" ||
        typeof rc.preloadInstructionMedia !== "function")) ||
    (models && typeof rc.preloadModels !== "function")
  ) {
    throw new Error(
      "This study requires the updated RemoteCalibrator media preloader. Rebuild the local RemoteCalibrator bundle.",
    );
  }
  const urls = [
    ...new Set(
      [
        ...collectStudyMedia(reader),
        ...(distance ? rc.getInstructionMediaUrls(instructionMedia) : []),
      ].map(keyFor),
    ),
  ];
  const panel = document.createElement("div");
  panel.setAttribute("role", "status");
  panel.style.cssText =
    "position:fixed;inset:0;background:#eee;z-index:10000000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px;text-align:center;font:20px system-ui;color:#222";
  const title = document.createElement("div");
  title.textContent = "Loading study files…";
  const progress = document.createElement("progress");
  progress.max = urls.length + (models ? 1 : 0) || 1;
  let modelsReady = !models;
  const detail = document.createElement("div");
  detail.style.lineHeight = "1.5";
  const fileCount = document.createElement("div");
  const downloaded = document.createElement("div");
  const timeRemaining = document.createElement("div");
  const modelStatus = document.createElement("div");
  fileCount.hidden = downloaded.hidden = urls.length === 0;
  modelStatus.hidden = !models;
  detail.append(fileCount, downloaded, timeRemaining, modelStatus);
  const failure = document.createElement("div");
  failure.hidden = true;
  failure.textContent =
    "Some study files or tracking models couldn’t be loaded. Check your connection and try again. Anything already loaded will be kept.";
  const retry = document.createElement("button");
  retry.textContent = "Try again";
  retry.hidden = true;
  panel.append(title, progress, detail, failure, retry);
  document.body.append(panel);
  const stats = new Map();
  let started = performance.now();
  const update = () => {
    const complete = urls.filter((url) => entries.has(url)).length;
    progress.value = complete + (models && modelsReady ? 1 : 0);
    const values = [...stats.values()];
    const bytes = values.reduce((sum, s) => sum + s.loaded, 0);
    const measured = values.filter((s) => s.total > 0);
    const meanSize = measured.length
      ? measured.reduce((sum, s) => sum + s.total, 0) / measured.length
      : 0;
    const known = meanSize > 0;
    const remaining = urls.reduce(
      (sum, url) =>
        sum +
        (entries.has(url)
          ? 0
          : Math.max(
              0,
              (stats.get(url)?.total || meanSize) -
                (stats.get(url)?.loaded || 0),
            )),
      0,
    );
    const speed = bytes / Math.max(1, (performance.now() - started) / 1000);
    fileCount.textContent = "[[DONE]] of [[TOTAL]] files downloaded"
      .replace("[[DONE]]", complete)
      .replace("[[TOTAL]]", urls.length);
    downloaded.textContent = "[[MB]] MB downloaded".replace(
      "[[MB]]",
      (bytes / 1048576).toFixed(1),
    );
    timeRemaining.hidden = complete === urls.length;
    timeRemaining.textContent =
      known && speed > 0
        ? "About [[MINUTES]] min of downloading remaining".replace(
            "[[MINUTES]]",
            Math.max(1, Math.ceil(remaining / speed / 60)),
          )
        : "Estimating download time…";
    modelStatus.textContent = modelsReady
      ? "Tracking models ready"
      : "Preparing tracking models…";
  };
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("Study ended", "AbortError");
      started = performance.now();
      stats.clear();
      update();
      const pending = urls.filter((url) => !entries.has(url));
      let index = 0;
      const errors = [];
      // RC keeps models that loaded, so a retry only reloads the failed ones.
      const modelLoad = modelsReady
        ? null
        : rc.preloadModels({ calibrationTasks }).then(
            () => {
              modelsReady = true;
              update();
            },
            (error) => errors.push(error),
          );
      await Promise.all([
        modelLoad,
        ...Array.from({ length: Math.min(3, pending.length) }, async () => {
          while (index < pending.length && !signal?.aborted) {
            const url = pending[index++];
            try {
              const blob = await downloadMedia(
                url,
                (loaded, total) => {
                  stats.set(url, { loaded, total });
                  update();
                },
                signal,
              );
              entries.set(url, { blob });
              update();
            } catch (error) {
              errors.push(error);
            }
          }
        }),
      ]);
      if (signal?.aborted) throw new DOMException("Study ended", "AbortError");
      if (!errors.length) break;
      console.error(
        "Media preload failed",
        errors.map((error) => error.message),
      );
      detail.hidden = true;
      failure.hidden = false;
      retry.hidden = false;
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          retry.onclick = null;
          signal?.removeEventListener("abort", cancel);
        };
        const cancel = () => {
          cleanup();
          reject(new DOMException("Study ended", "AbortError"));
        };
        retry.onclick = () => {
          cleanup();
          resolve();
        };
        signal?.addEventListener("abort", cancel, { once: true });
      });
      retry.hidden = true;
      failure.hidden = true;
      detail.hidden = false;
    }
    if (distance)
      await rc.preloadInstructionMedia({
        ...instructionMedia,
        loadBlob: async (url) => entries.get(keyFor(url)).blob,
      });
    sealed = true;
  } finally {
    panel.remove();
  }
}
