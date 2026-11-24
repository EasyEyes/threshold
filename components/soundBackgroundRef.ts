/**
 * soundBackground names a file inside a zip in EasyEyesResources `folders/`.
 * `cafe/noise.wav` is `folders/cafe.zip` → `noise.wav`.
 * `cafe.wav` is `folders/cafe.zip` → a file named cafe.
 */
export interface SoundBackgroundRef {
  folder: string;
  file: string;
}

const AUDIO_EXT = /\.(wav|aac)$/i;

export const parseSoundBackground = (
  value: unknown,
): SoundBackgroundRef | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const slash = trimmed.indexOf("/");
  if (slash >= 0) {
    const folder = trimmed
      .slice(0, slash)
      .replace(/\.zip$/i, "")
      .trim();
    const file = trimmed.slice(slash + 1).trim();
    if (!folder || !file) return null;
    return { folder, file };
  }
  const folder = trimmed.replace(/\.zip$/i, "").replace(AUDIO_EXT, "");
  if (!folder) return null;
  return { folder, file: trimmed };
};

/**
 * dB to apply after the file is normalized to 0 dB RMS (the same convention
 * as other EasyEyes sounds). A calibrated computer supplies its full-scale
 * SPL. An uncalibrated computer does not, so assume a nominal full-scale
 * level for a computer at maximum volume. A 10 dB change in the parameter is
 * still a 10 dB change in playback.
 */
export const UNCALIBRATED_FULL_SCALE_DBSPL = 85;
export const DEFAULT_SOUND_BACKGROUND_DBSPL = 40;

export const soundBackgroundGainDb = (
  desiredDbSpl: unknown,
  calibratedFullScaleDbSpl: unknown,
): number => {
  const desired =
    desiredDbSpl === "" || desiredDbSpl === undefined || desiredDbSpl === null
      ? DEFAULT_SOUND_BACKGROUND_DBSPL
      : Number(desiredDbSpl);
  if (!Number.isFinite(desired)) return 0;
  const calibrated = Number(calibratedFullScaleDbSpl);
  const fullScale = Number.isFinite(calibrated)
    ? calibrated
    : UNCALIBRATED_FULL_SCALE_DBSPL;
  return desired - fullScale;
};
