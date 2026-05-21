/**
 * EasyEyes Headphone Check
 *
 * Detects whether the participant is listening through headphones or a
 * built-in loudspeaker, and rejects whichever device type the study does
 * not allow. The method is the dichotic-pitch (Huggins Pitch) screening
 * test described in:
 *
 *   Milne, A., Bianco, R., Poole, K., Zhao, S., Oxenham, A., Billig, A.,
 *   & Chait, M. (2020). An online headphone screening test based on
 *   dichotic pitch. Behavior Research Methods.
 *   https://doi.org/10.3758/s13428-020-01514-0
 *
 * Reference JS implementation: https://github.com/ChaitLabUCL/HeadphoneCheck_Test
 *
 * On each trial the participant hears three 1-s intervals of white noise.
 * Two are diotic (identical to both ears). The third has a 180 degree
 * phase shift applied to a narrow band (+/- 6%) around 600 Hz in the
 * right ear only. That phase shift produces a faint tonal percept
 * (Huggins Pitch) only when the two channels are heard separately, i.e.
 * through headphones. Over a loudspeaker the two channels mix in air
 * and the tone is inaudible. Six 3-AFC trials; pass threshold defaults
 * to 4 of 6 correct (per Milne et al.).
 *
 * The signal-processing core (FFT, stimulus generation) is fully
 * self-contained. The page chrome -- gray background, top-corner
 * "Device Compatibility" eyebrow + step title, optional language menu
 * mirrored in the opposite corner -- is delegated to
 * `mountCompatibilityChrome` so this page lines up visually with the
 * Choose Camera, Camera Resolution and Final Compatibility pages.
 */

import { fillPhrase, mountCompatibilityChrome } from "./compatibilityFlow";
import { readi18nPhrases } from "./readPhrases";

// Wrapper around `readi18nPhrases` that swallows missing-key / missing-language
// errors and returns a fallback string. Lets the headphone-check UI keep
// rendering even if a translation row is incomplete.
const t = (key, lang, fallback = "") => {
  try {
    const v = readi18nPhrases(key, lang);
    return typeof v === "string" ? v : fallback;
  } catch {
    return fallback;
  }
};

// -----------------------------------------------------------------------------
// Hardcoded input parameter
// -----------------------------------------------------------------------------
//
// Allowed values for _needSoundOutput.current:
//   "headphone"   -- require headphones; participants who fail the Huggins
//                    Pitch test (likely on a loudspeaker) are rejected.
//   "loudspeaker" -- require built-in loudspeaker; participants who pass the
//                    Huggins Pitch test (clearly on headphones) are rejected.
//   "speakerOrHeadphone" / "speakerAndHeadphone" / "" -- either device is fine; the test is not run.
//
// The test only runs when exactly one of {headphone, loudspeaker} is required.
export const _needSoundOutput = {
  current: "headphone",
};

// -----------------------------------------------------------------------------
// Tunables (kept here so the algorithm is easy to inspect in one place).
// -----------------------------------------------------------------------------
const HEADPHONE_CHECK_CONFIG = {
  // Stimulus
  centerFrequencyHz: 600,
  bandwidthFraction: 0.06, // +/- 6% around the center, per Milne et al.
  intervalDurationSec: 1.0,
  interStimulusIntervalSec: 0.5,
  fadeSec: 0.025, // raised-cosine fade in/out to suppress clicks
  fftLength: 65536, // power of two; ample for any AudioContext sample rate
  noisePeak: 0.5, // safe headroom after FFT round-trip

  // Task
  numTrials: 6,
  passThreshold: 4, // >= 4 correct out of 6 == "headphones"
};

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Returns true iff the study requires exactly one of headphones or loudspeaker
 * and therefore needs the screening test. The caller usually combines this
 * with `_needCalibratedSound` etc. to decide whether sound is even relevant.
 *
 * @param {string} [need] override of the hardcoded parameter, e.g. when wired
 *   to the real spreadsheet parameter later.
 */
export const headphoneCheckIsNeeded = (need = _needSoundOutput.current) => {
  const n = (need || "").trim().toLowerCase();
  return n === "headphone" || n === "loudspeaker";
};

/**
 * Run the Huggins Pitch headphone screening test.
 *
 * Resolves with:
 *   {
 *     ran:              true,
 *     requirement:      "headphone" | "loudspeaker",
 *     numTrials:        number,
 *     numCorrect:       number,
 *     passThreshold:    number,
 *     detectedHeadphones: boolean,   // numCorrect >= passThreshold
 *     meetsRequirement: boolean,     // matches `requirement`
 *     responses:        Array<{trial, target, response, correct}>,
 *     summary:          string      // one-line English summary for the report
 *   }
 *
 * If the test is not needed, resolves with `{ ran: false, ... }` immediately.
 *
 * @param {object} [opts]
 * @param {string} [opts.requirement] one of "headphone", "loudspeaker", or
 *   "either"/"" (no test). Defaults to the hardcoded parameter above.
 * @param {object} [opts.paramReader] paramReader instance. Used by the
 *   shared page chrome to decide whether to render the language selector.
 * @param {object} [opts.rc] Remote Calibrator instance. Used by the shared
 *   page chrome to render the language menu and pick LTR/RTL.
 * @param {HTMLElement} [opts.mountNode] node to attach the UI to. Defaults
 *   to document.body.
 */
export const runHeadphoneCheck = async (opts = {}) => {
  const requirement = (opts.requirement ?? _needSoundOutput.current ?? "")
    .trim()
    .toLowerCase();

  if (!headphoneCheckIsNeeded(requirement)) {
    return {
      ran: false,
      requirement,
      numTrials: 0,
      numCorrect: 0,
      passThreshold: HEADPHONE_CHECK_CONFIG.passThreshold,
      detectedHeadphones: false,
      meetsRequirement: true,
      responses: [],
      summary: "",
      audioDeviceLabel: null,
    };
  }

  const mountNode = opts.mountNode ?? document.body;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Snapshot the active audio output device's label (when the browser
  // exposes it) so it's saved alongside the Milne test result for offline
  // diagnosis.
  const audioDeviceLabel = await getAudioOutputDeviceLabel(audioCtx);

  let responses = [];
  try {
    responses = await presentHeadphoneCheckUI(audioCtx, mountNode, {
      paramReader: opts.paramReader,
      rc: opts.rc,
    });
  } finally {
    try {
      await audioCtx.close();
    } catch (e) {
      // ignore: some browsers throw on double close
    }
  }

  const numCorrect = responses.reduce((n, r) => n + (r.correct ? 1 : 0), 0);
  const detectedHeadphones = numCorrect >= HEADPHONE_CHECK_CONFIG.passThreshold;
  const meetsRequirement =
    requirement === "headphone" ? detectedHeadphones : !detectedHeadphones;

  return {
    ran: true,
    requirement,
    numTrials: HEADPHONE_CHECK_CONFIG.numTrials,
    numCorrect,
    passThreshold: HEADPHONE_CHECK_CONFIG.passThreshold,
    detectedHeadphones,
    meetsRequirement,
    responses,
    audioDeviceLabel,
    summary: buildHeadphoneCheckSummary(
      requirement,
      numCorrect,
      HEADPHONE_CHECK_CONFIG.numTrials,
      detectedHeadphones,
      meetsRequirement,
      opts.rc?.language?.value || "en",
    ),
  };
};

// -----------------------------------------------------------------------------
// Audio device introspection
// -----------------------------------------------------------------------------

/**
 * Best-effort lookup of the human-readable label of the audio output device
 * currently bound to `audioCtx`. Returns:
 *   - the label string when the browser will give us one,
 *   - `""` when the device is enumerated but the label is hidden (the
 *     usual case: browsers withhold labels until microphone permission
 *     has been granted to the page),
 *   - `null` when we can't introspect at all (older browsers, missing
 *     `navigator.mediaDevices`, or an exception during enumeration).
 *
 * The active sink is matched via `audioCtx.sinkId` (Chromium 110+); on
 * other browsers we fall back to the entry whose `deviceId === "default"`.
 * Never throws.
 */
const getAudioOutputDeviceLabel = async (audioCtx) => {
  try {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.enumerateDevices !== "function"
    ) {
      return null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (stream) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((d) => d.kind === "audiooutput");
      console.log("outputs", outputs);
      if (outputs.length === 0) return null;

      let targetId = "default";
      if (audioCtx && typeof audioCtx.sinkId !== "undefined") {
        const raw =
          typeof audioCtx.sinkId === "string"
            ? audioCtx.sinkId
            : audioCtx.sinkId?.id ?? "";
        if (raw) targetId = raw;
      }

      const match =
        outputs.find((d) => d.deviceId === targetId) ||
        outputs.find((d) => d.deviceId === "default") ||
        outputs[0];

      stream.getTracks().forEach((track) => track.stop());
      return match?.label ?? "";
    } else return null;
  } catch {
    return null;
  }
};

// -----------------------------------------------------------------------------
// Stimulus generation
// -----------------------------------------------------------------------------

/**
 * Build a stereo AudioBuffer containing three 1-s intervals separated by
 * `interStimulusIntervalSec` of silence. Two intervals are diotic white
 * noise; the `targetInterval`-th (1-indexed) is the Huggins Pitch stimulus.
 *
 * The HP stimulus is generated by:
 *   1. drawing Gaussian white noise of length N = fftLength,
 *   2. taking its FFT,
 *   3. multiplying the complex spectrum by -1 (180 deg phase shift) inside
 *      the [f0*(1-b), f0*(1+b)] band on one channel only,
 *   4. taking the inverse FFT,
 *   5. truncating to sampleRate * intervalDurationSec samples and tapering
 *      with a short raised-cosine fade.
 */
const buildThreeIntervalBuffer = (audioCtx, targetInterval) => {
  const cfg = HEADPHONE_CHECK_CONFIG;
  const sampleRate = audioCtx.sampleRate;
  const intervalSamples = Math.round(sampleRate * cfg.intervalDurationSec);
  const isiSamples = Math.round(sampleRate * cfg.interStimulusIntervalSec);
  const totalSamples = 3 * intervalSamples + 2 * isiSamples;

  const buffer = audioCtx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let interval = 1; interval <= 3; interval++) {
    const isHugginsTarget = interval === targetInterval;
    const { leftData, rightData } = generateInterval(
      sampleRate,
      intervalSamples,
      isHugginsTarget,
    );
    const offset = (interval - 1) * (intervalSamples + isiSamples);
    left.set(leftData, offset);
    right.set(rightData, offset);
  }

  return buffer;
};

/**
 * Generate one 1-s interval. If `isHugginsTarget` is true, the right channel
 * carries a 180-degree-phase-shifted copy of the left channel inside a narrow
 * band around `centerFrequencyHz`. Otherwise both channels are identical
 * diotic white noise.
 */
const generateInterval = (sampleRate, intervalSamples, isHugginsTarget) => {
  const cfg = HEADPHONE_CHECK_CONFIG;
  const N = cfg.fftLength;

  // 1) Gaussian white noise, length N. Box-Muller from a pair of uniforms.
  const noise = new Float32Array(N);
  for (let i = 0; i < N; i += 2) {
    let u1 = Math.random();
    const u2 = Math.random();
    if (u1 < 1e-12) u1 = 1e-12;
    const mag = Math.sqrt(-2 * Math.log(u1));
    noise[i] = mag * Math.cos(2 * Math.PI * u2);
    if (i + 1 < N) noise[i + 1] = mag * Math.sin(2 * Math.PI * u2);
  }

  // Left channel = the unmodified noise.
  const leftFull = noise;

  // Right channel: identical to left for diotic; for the target, phase-shift
  // the narrow band around f0 by 180 deg via FFT/IFFT.
  let rightFull;
  if (!isHugginsTarget) {
    rightFull = noise;
  } else {
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    re.set(noise);
    fft(re, im, false);

    const binHz = sampleRate / N;
    const fLow = cfg.centerFrequencyHz * (1 - cfg.bandwidthFraction);
    const fHigh = cfg.centerFrequencyHz * (1 + cfg.bandwidthFraction);
    const kLow = Math.max(1, Math.floor(fLow / binHz));
    const kHigh = Math.min(N / 2 - 1, Math.ceil(fHigh / binHz));

    for (let k = kLow; k <= kHigh; k++) {
      re[k] = -re[k];
      im[k] = -im[k];
      // Mirror so the IFFT result stays real-valued.
      re[N - k] = -re[N - k];
      im[N - k] = -im[N - k];
    }

    fft(re, im, true);
    rightFull = re;
  }

  // 2) Truncate, peak-normalize, and taper.
  const leftData = new Float32Array(intervalSamples);
  const rightData = new Float32Array(intervalSamples);
  let peak = 1e-12;
  for (let i = 0; i < intervalSamples; i++) {
    const l = leftFull[i];
    const r = rightFull[i];
    leftData[i] = l;
    rightData[i] = r;
    if (Math.abs(l) > peak) peak = Math.abs(l);
    if (Math.abs(r) > peak) peak = Math.abs(r);
  }
  const gain = cfg.noisePeak / peak;

  const fadeSamples = Math.max(1, Math.round(sampleRate * cfg.fadeSec));
  for (let i = 0; i < intervalSamples; i++) {
    let env = 1;
    if (i < fadeSamples) {
      env = 0.5 * (1 - Math.cos((Math.PI * i) / fadeSamples));
    } else if (i > intervalSamples - fadeSamples) {
      const j = intervalSamples - 1 - i;
      env = 0.5 * (1 - Math.cos((Math.PI * j) / fadeSamples));
    }
    leftData[i] *= gain * env;
    rightData[i] *= gain * env;
  }

  return { leftData, rightData };
};

// -----------------------------------------------------------------------------
// In-place radix-2 Cooley-Tukey FFT (operates on parallel real/imag arrays).
// Length must be a power of two.
// -----------------------------------------------------------------------------
const fft = (re, im, inverse) => {
  const N = re.length;
  // Bit-reverse permutation.
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  // Butterflies.
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1;
    const theta = (sign * 2 * Math.PI) / len;
    const wRe = Math.cos(theta);
    const wIm = Math.sin(theta);
    for (let i = 0; i < N; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < half; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + half] * curRe - im[i + k + half] * curIm;
        const bIm = re[i + k + half] * curIm + im[i + k + half] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + half] = aRe - bRe;
        im[i + k + half] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        const nextIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
        curIm = nextIm;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < N; i++) {
      re[i] /= N;
      im[i] /= N;
    }
  }
};

// -----------------------------------------------------------------------------
// UI
// -----------------------------------------------------------------------------

/**
 * Picks a target interval (1..3) for each of the six trials, balanced so that
 * each of the three positions appears exactly twice, in random order.
 */
const drawTargetSequence = () => {
  const seq = [1, 1, 2, 2, 3, 3];
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = seq[i];
    seq[i] = seq[j];
    seq[j] = t;
  }
  return seq;
};

const presentHeadphoneCheckUI = async (
  audioCtx,
  mountNode,
  { paramReader, rc } = {},
) => {
  // Track an active per-page re-translator so the chrome's language menu
  // can refresh whichever sub-page (intro / trial) is currently mounted.
  const pageState = { retranslate: () => {} };

  const applyDirection = (lang) => {
    let rtl = false;
    try {
      rtl =
        (readi18nPhrases("EE_languageDirection", lang) || "LTR")
          .toString()
          .toLowerCase() === "rtl";
    } catch {
      rtl = false;
    }
    wrapper.style.direction = rtl ? "rtl" : "ltr";
    wrapper.style.textAlign = rtl ? "right" : "left";
  };

  // ----- Shared page chrome (gray bg + "Device Compatibility" eyebrow +
  //       step H1 in the upper corner + optional language selector) -----
  const chrome = mountCompatibilityChrome({
    paramReader,
    rc,
    stepTitle: t(
      "EE_headphoneCheckTitle",
      rc?.language?.value || "en",
      "Headphone check",
    ),
    onLanguageChange: (newLang) => {
      chrome.setStepTitle(
        t("EE_headphoneCheckTitle", newLang, "Headphone check"),
      );
      applyDirection(newLang);
      try {
        pageState.retranslate();
      } catch (_e) {
        // Caller-managed sub-page must not crash the chrome.
      }
    },
  });

  // ----- Page body (mirrors `displayCompatibilityMessage` layout so the
  //       headphone-check page sits in the same column as the rest of the
  //       compatibility flow). -----
  const wrapper = document.createElement("div");
  wrapper.id = "headphone-check-wrapper";
  wrapper.style.position = "absolute";
  wrapper.style.top = "8rem";
  wrapper.style.left = "20vw";
  wrapper.style.right = "20vw";
  wrapper.style.minWidth = "60vw";
  wrapper.style.zIndex = "10001";
  wrapper.style.backgroundColor = "#eee";
  wrapper.style.padding = "0";
  wrapper.style.lineHeight = "1.5";
  applyDirection(rc?.language?.value || "en");

  mountNode.appendChild(wrapper);

  const cleanup = () => {
    pageState.retranslate = () => {};
    wrapper.remove();
    chrome.unmount();
  };

  // ----- Intro / instructions -----
  const targets = drawTargetSequence();
  try {
    await showIntroPage(wrapper, audioCtx, { rc, pageState });
    const responses = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const buffer = buildThreeIntervalBuffer(audioCtx, target);
      // eslint-disable-next-line no-await-in-loop
      const response = await runOneTrial(wrapper, audioCtx, {
        trialIndex: i,
        numTrials: targets.length,
        target,
        buffer,
        rc,
        pageState,
      });
      responses.push({
        trial: i + 1,
        target,
        response,
        correct: response === target,
      });
    }
    return responses;
  } finally {
    cleanup();
  }
};

const showIntroPage = (wrapper, audioCtx, { rc, pageState } = {}) =>
  new Promise((resolve) => {
    wrapper.innerHTML = "";

    // Hosts one <p> per logical paragraph in `EE_headphoneCheckIntro`. Using
    // <p> (instead of a <div> with white-space: pre-line) gives the same
    // browser-default paragraph margins that the preview page's intro
    // paragraph has, so the two pages visually match.
    const introContainer = document.createElement("div");
    wrapper.appendChild(introContainer);

    // Button styling mirrors the preview page's "Run tests" button so the
    // two compatibility-flow pages look the same.
    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.display = "flex";
    buttonWrapper.style.alignItems = "center";
    buttonWrapper.style.gap = "1rem";
    buttonWrapper.style.marginTop = "1.5rem";
    const beginButton = document.createElement("button");
    beginButton.classList.add("btn", "btn-success");
    beginButton.style.width = "fit-content";
    beginButton.style.padding = "10px";
    beginButton.style.minWidth = "9rem";
    buttonWrapper.appendChild(beginButton);
    wrapper.appendChild(buttonWrapper);

    const retranslate = () => {
      const lang = rc?.language?.value || "en";
      const introTemplate = t(
        "EE_headphoneCheckIntro",
        lang,
        "Detect a pure tone hidden in noise.\n" +
          "There are [[N11]] trials. In each trial, you will hear three " +
          "one-second bursts of static noise. One burst contains a faint tone.\n" +
          "Choose which sound—1, 2, or 3—contains the tone.\n" +
          "You may replay each trial as often as you like before answering.\n" +
          "Set the volume to a comfortable level.",
      );
      const introText = fillPhrase(introTemplate, {
        N11: HEADPHONE_CHECK_CONFIG.numTrials,
      });
      introContainer.innerHTML = "";
      introText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .forEach((line) => {
          const p = document.createElement("p");
          p.textContent = line;
          introContainer.appendChild(p);
        });
      beginButton.textContent = t(
        "EE_compatibilityPreviewRunButton",
        lang,
        "Run tests",
      );
    };
    retranslate();
    if (pageState) pageState.retranslate = retranslate;

    beginButton.addEventListener("click", async () => {
      try {
        // resume() must run from a user gesture for autoplay-blocking browsers.
        await audioCtx.resume();
      } catch (e) {
        // ignore
      }
      if (pageState) pageState.retranslate = () => {};
      resolve();
    });
  });

const runOneTrial = (
  wrapper,
  audioCtx,
  { trialIndex, numTrials, buffer, rc, pageState },
) =>
  new Promise((resolve) => {
    wrapper.innerHTML = "";

    // Trial-number heading. Styled identically to the preview page's
    // "Device check (...)" <h3> so the two pages share the same heading
    // size and weight.
    const status = document.createElement("h3");
    status.style.margin = "0 0 0.5rem 0";
    status.style.fontSize = "1.2rem";
    wrapper.appendChild(status);

    const prompt = document.createElement("p");
    wrapper.appendChild(prompt);

    // Play button. Uses the secondary Bootstrap style so it stays visually
    // distinct from the "Next" success button while sharing its proportions.
    const playButton = document.createElement("button");
    playButton.classList.add("btn", "btn-secondary");
    playButton.style.width = "fit-content";
    playButton.style.padding = "10px";
    playButton.style.minWidth = "9rem";
    playButton.style.marginTop = "0.5rem";
    playButton.style.marginRight = "0.75rem";
    wrapper.appendChild(playButton);

    const choiceRow = document.createElement("div");
    choiceRow.style.marginTop = "1.5rem";
    choiceRow.style.display = "flex";
    choiceRow.style.gap = "0.75rem";
    wrapper.appendChild(choiceRow);

    const choiceButtons = [1, 2, 3].map((n) => {
      const b = document.createElement("button");
      b.classList.add("btn", "btn-outline-secondary");
      b.style.width = "5rem";
      b.style.padding = "10px";
      b.style.fontSize = "1rem";
      b.textContent = String(n);
      b.disabled = true;
      choiceRow.appendChild(b);
      return b;
    });

    let selected = null;
    // "Next" button styled identically to the preview page's "Run tests"
    // button.
    const submitWrapper = document.createElement("div");
    submitWrapper.style.display = "flex";
    submitWrapper.style.alignItems = "center";
    submitWrapper.style.gap = "1rem";
    submitWrapper.style.marginTop = "1.5rem";
    const submitButton = document.createElement("button");
    submitButton.classList.add("btn", "btn-success");
    submitButton.style.width = "fit-content";
    submitButton.style.padding = "10px";
    submitButton.style.minWidth = "9rem";
    submitButton.disabled = true;
    submitWrapper.appendChild(submitButton);
    wrapper.appendChild(submitWrapper);

    // Track whether the participant has heard the trial once; used to decide
    // between "Play sound" and "Play again" on the play button.
    let hasPlayedOnce = false;

    const retranslate = () => {
      const lang = rc?.language?.value || "en";
      status.textContent = fillPhrase(
        t("EE_headphoneCheckTrialNumber", lang, "Trial [[N11]] of [[N22]]"),
        { N11: trialIndex + 1, N22: numTrials },
      );
      prompt.textContent = t(
        "EE_headphoneCheckTrialPrompt",
        lang,
        "Listen carefully. Which of the three sounds contains the hidden tone?",
      );
      playButton.textContent = hasPlayedOnce
        ? t("EE_headphoneCheckPlayAgain", lang, "Play again")
        : t("EE_headphoneCheckPlay", lang, "Play sound");
      submitButton.textContent = t("EE_headphoneCheckNext", lang, "Next");
    };
    retranslate();
    if (pageState) pageState.retranslate = retranslate;

    let isPlaying = false;
    let activeSource = null;

    // Visually mark which interval is currently playing.
    const cfg = HEADPHONE_CHECK_CONFIG;
    const intervalDurMs = cfg.intervalDurationSec * 1000;
    const isiDurMs = cfg.interStimulusIntervalSec * 1000;
    const flashTimers = [];

    const clearFlash = () => {
      flashTimers.forEach(clearTimeout);
      flashTimers.length = 0;
      choiceButtons.forEach((b) => {
        b.style.outline = "";
      });
    };

    const scheduleFlash = () => {
      for (let n = 0; n < 3; n++) {
        const onAt = n * (intervalDurMs + isiDurMs);
        flashTimers.push(
          setTimeout(() => {
            choiceButtons.forEach((b, idx) => {
              b.style.outline = idx === n ? "3px solid #4CAF50" : "";
            });
          }, onAt),
        );
        flashTimers.push(
          setTimeout(() => {
            choiceButtons[n].style.outline = "";
          }, onAt + intervalDurMs),
        );
      }
    };

    const playOnce = async () => {
      if (isPlaying) return;
      isPlaying = true;
      playButton.disabled = true;
      try {
        await audioCtx.resume();
      } catch (e) {
        // ignore
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(audioCtx.destination);
      activeSource = src;
      scheduleFlash();
      src.onended = () => {
        isPlaying = false;
        activeSource = null;
        playButton.disabled = false;
        hasPlayedOnce = true;
        const lang = rc?.language?.value || "en";
        playButton.textContent = t(
          "EE_headphoneCheckPlayAgain",
          lang,
          "Play again",
        );
        clearFlash();
        choiceButtons.forEach((b) => {
          b.disabled = false;
        });
      };
      src.start();
    };

    playButton.addEventListener("click", playOnce);

    choiceButtons.forEach((b, idx) => {
      b.addEventListener("click", () => {
        if (!hasPlayedOnce) return;
        selected = idx + 1;
        choiceButtons.forEach((cb) => {
          cb.style.backgroundColor = "";
          cb.style.color = "";
        });
        b.style.backgroundColor = "#333";
        b.style.color = "#fff";
        submitButton.disabled = false;
      });
    });

    submitButton.addEventListener("click", () => {
      if (selected == null) return;
      if (activeSource) {
        try {
          activeSource.stop();
        } catch (e) {
          // ignore
        }
      }
      clearFlash();
      if (pageState) pageState.retranslate = () => {};
      resolve(selected);
    });
  });

// -----------------------------------------------------------------------------
// Summary helpers
// -----------------------------------------------------------------------------

// Build a translated headphone-check summary string from the structured
// `result` returned by `runHeadphoneCheck` plus a target language. Lets the
// compatibility report re-render the summary in the participant's chosen
// language without having to re-run the headphone test.
export const renderHeadphoneCheckSummary = (result, lang = "en") => {
  if (!result || !result.ran) return "";
  return buildHeadphoneCheckSummary(
    result.requirement,
    result.numCorrect,
    result.numTrials,
    result.detectedHeadphones,
    result.meetsRequirement,
    lang,
  );
};

const buildHeadphoneCheckSummary = (
  requirement,
  numCorrect,
  numTrials,
  detectedHeadphones,
  meetsRequirement,
  lang = "en",
) => {
  // Device names: detected vs. required. The phrases are loudspeaker(s) /
  // headphones / "loudspeakers or unclear" in the i18n table.
  const detected = detectedHeadphones
    ? t("EE_headphoneCheckHeadphones", lang, "headphones")
    : t(
        "EE_headphoneCheckLoudspeakersOrUnclear",
        lang,
        "loudspeakers or unclear",
      );
  const required =
    requirement === "headphone"
      ? t("EE_headphoneCheckHeadphones", lang, "headphones")
      : t("EE_headphoneCheckLoudspeakers", lang, "loudspeakers");

  const template = meetsRequirement
    ? t(
        "EE_headphoneCheckSummaryPass",
        lang,
        "✅ Headphone check passed: [[N11]]/[[N22]] correct. Detected [[DDD]] (required: [[RRR]]).\n",
      )
    : t(
        "EE_headphoneCheckSummaryFail",
        lang,
        "❌ Headphone check failed: [[N11]]/[[N22]] correct. Detected [[DDD]] (required: [[RRR]]).",
      );

  return fillPhrase(template, {
    N11: numCorrect,
    N22: numTrials,
    DDD: detected,
    RRR: required,
  });
};
