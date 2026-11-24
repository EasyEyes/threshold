import JSZip from "jszip";
import { fetchMedia } from "./mediaPreload.js";
import {
  adjustSoundDbSPL,
  audioCtx,
  setWaveFormToZeroDbSPL,
  verifyFileNameExtension,
} from "./soundUtils.js";
import { soundGainDBSPL, status } from "./global.js";
import { paramReader } from "../parameters/paramReader.ts";
import {
  parseSoundBackground,
  soundBackgroundGainDb,
} from "./soundBackgroundRef.ts";

const buffersByFolder = new Map();
let source = null;
let token = 0;

const stem = (name) =>
  String(name)
    .split("/")
    .pop()
    .replace(/\.(wav|aac)$/i, "")
    .toLowerCase();

const loadFolder = async (folder) => {
  if (buffersByFolder.has(folder)) return buffersByFolder.get(folder);
  const response = await fetchMedia(`folders/${folder}.zip`);
  const zip = await new JSZip().loadAsync(await response.arrayBuffer());
  const files = [];
  for (const filename of Object.keys(zip.files)) {
    const entry = zip.files[filename];
    const base = filename.split("/").pop() ?? "";
    if (
      entry.dir ||
      /__MACOSX/i.test(filename) ||
      base.startsWith(".") ||
      !verifyFileNameExtension(filename)
    )
      continue;
    const arrayBuffer = await entry.async("arraybuffer");
    const buffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    files.push({ name: filename, buffer });
  }
  buffersByFolder.set(folder, files);
  return files;
};

export const preloadSoundBackgrounds = async (reader) => {
  let values = [];
  try {
    values = reader.read("soundBackground", "__ALL_BLOCKS__");
  } catch {
    return;
  }
  if (!Array.isArray(values)) values = [values];
  const folders = new Set();
  for (const value of values) {
    const ref = parseSoundBackground(value);
    if (ref) folders.add(ref.folder);
  }
  await Promise.all(
    [...folders].map((folder) =>
      loadFolder(folder).catch((error) => {
        console.warn(
          `soundBackground: could not load folders/${folder}.zip`,
          error,
        );
        buffersByFolder.set(folder, []);
      }),
    ),
  );
};

const fileInFolder = (files, ref) => {
  const wanted = stem(ref.file);
  return files.find((file) => stem(file.name) === wanted);
};

const scaledBuffer = (audioBuffer, gainDb) => {
  const out = audioCtx.createBuffer(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate,
  );
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    const samples = Array.from(audioBuffer.getChannelData(c));
    setWaveFormToZeroDbSPL(samples);
    adjustSoundDbSPL(samples, gainDb);
    out.copyToChannel(Float32Array.from(samples), c);
  }
  return out;
};

export const beginSoundBackground = async () => {
  endSoundBackground();
  const mine = token;
  const value = paramReader.read("soundBackground", status.block_condition);
  const ref = parseSoundBackground(value);
  if (!ref) return;
  let files = buffersByFolder.get(ref.folder);
  if (!files) {
    try {
      files = await loadFolder(ref.folder);
    } catch (error) {
      console.warn(`soundBackground: could not load ${value}`, error);
      return;
    }
  }
  const file = fileInFolder(files, ref);
  if (!file) {
    console.warn(
      `soundBackground: ${ref.file} was not found in folders/${ref.folder}.zip`,
    );
    return;
  }
  const desired = paramReader.read(
    "soundBackgroundDBSPL",
    status.block_condition,
  );
  const played = scaledBuffer(
    file.buffer,
    soundBackgroundGainDb(desired, soundGainDBSPL.current),
  );
  if (mine !== token) return;
  if (audioCtx.state === "suspended") void audioCtx.resume();
  const next = audioCtx.createBufferSource();
  next.buffer = played;
  next.loop = true;
  next.connect(audioCtx.destination);
  next.start();
  if (mine !== token) {
    try {
      next.stop();
    } catch {
      // The trial already ended.
    }
    next.disconnect();
    return;
  }
  source = next;
};

export const endSoundBackground = () => {
  token++;
  if (!source) return;
  try {
    source.stop();
  } catch {
    // Already stopped.
  }
  try {
    source.disconnect();
  } catch {
    // Already disconnected.
  }
  source = null;
};
