import { describe, expect, it } from "@jest/globals";
import {
  parseSoundBackground,
  soundBackgroundGainDb,
  UNCALIBRATED_FULL_SCALE_DBSPL,
} from "../components/soundBackgroundRef";

describe("soundBackground", () => {
  it("reads a file inside a folders zip", () => {
    expect(parseSoundBackground("cafe/noise.wav")).toEqual({
      folder: "cafe",
      file: "noise.wav",
    });
    expect(parseSoundBackground(" cafe.zip/noise.aac ")).toEqual({
      folder: "cafe",
      file: "noise.aac",
    });
  });

  it("treats a bare filename as a zip of the same name", () => {
    expect(parseSoundBackground("noise.wav")).toEqual({
      folder: "noise",
      file: "noise.wav",
    });
  });

  it("plays nothing when the cell is blank", () => {
    expect(parseSoundBackground("")).toBeNull();
    expect(parseSoundBackground("   ")).toBeNull();
    expect(parseSoundBackground(undefined)).toBeNull();
  });

  it("uses the calibrated full-scale level when the computer was calibrated", () => {
    expect(soundBackgroundGainDb(65, 80)).toBe(-15);
    expect(soundBackgroundGainDb("70", 80)).toBe(-10);
  });

  it("stays audible when the computer was not calibrated", () => {
    expect(soundBackgroundGainDb(65, undefined)).toBe(
      65 - UNCALIBRATED_FULL_SCALE_DBSPL,
    );
    expect(soundBackgroundGainDb("", undefined)).toBe(
      40 - UNCALIBRATED_FULL_SCALE_DBSPL,
    );
    expect(soundBackgroundGainDb(75, undefined)).toBe(
      soundBackgroundGainDb(65, undefined) + 10,
    );
  });
});
