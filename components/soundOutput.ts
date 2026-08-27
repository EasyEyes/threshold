/**
 * Sound output selection (v1.5): the Requirements-page device step, the
 * saved-selection store, the block-0 "Setting sound output device" page with
 * the AudioContext sink patch + reconnect watch, and per-block routing with
 * kind-change reminders. Includes the needSoundOutput reader and the
 * browser-support compat check.
 *
 * Sections, in dependency order:
 *   1. needSoundOutput reading + browser support
 *   2. Selection store (state, kind helpers, sink application)
 *   3. Requirements-page selection step
 *   4. Block-0 page, sink patch, live-target registry, reconnect watch
 *   5. Per-block routing + reminders
 */

import { ParamReader } from "../parameters/paramReader";
import { renderMarkdown } from "./markdownInline.js";
import {
  fillPhrase,
  getCompatibilityBodyTopOffset,
  isLanguageRTL as isRTL,
  mountCompatibilityChrome,
  tryReadPhrase,
  unmountCompatibilityReportPage,
} from "./compatibilityUI";
import { dogBarkDataUrl } from "./sounds/dog-bark";

// === 1. needSoundOutput reading + browser support =====================

/**
 * Sound-output demand resolution (needSoundOutput v1.5).
 *
 * The per-block V1 Swal radio popup was deleted with Phase 6 (selection now
 * happens once on the Requirements page — section 3 below — and each
 * block routes/reminds via section 5). Section 1 is the
 * demand resolver shared by everything else. Browsers without setSinkId
 * (e.g. Firefox) are NOT rejected: the selection step skips itself and
 * audio uses the default output (browserHasSoundOutputSelectionSupport
 * gates the step UI, not compatibility).
 */

type BlockId = number;

export const readNeedSoundOutput = (
  block: BlockId,
  reader: ParamReader,
): string[] => {
  // Both reads return per-condition arrays of equal length (same block);
  // absent params resolve to the glossary default "".
  const canonical = reader.read("needSoundOutput", block) as string[];
  const legacy = reader.read("needSoundOutputKind", block) as string[];
  return canonical.map((c, i) => (c !== "" ? c : legacy[i] ?? ""));
};

const soundOutputDemandedAnywhere = (reader: ParamReader): boolean => {
  const blockCount = reader._blockCount as unknown as number;
  for (let i = 1; i <= blockCount; i++) {
    if (readNeedSoundOutput(i, reader).some((v) => v !== "")) return true;
  }
  // Block 0: the global name resolves to its glossary default
  // "speakerOrHeadphone" when absent — count only explicit demands.
  const block0 =
    ((
      reader.read("_needSoundOutput") as string[] | undefined
    )?.[0] as string) ?? "";
  return block0 !== "" && block0 !== "speakerOrHeadphone";
};

/**
 * The study demands device selection somewhere and this browser lacks the
 * APIs it needs (e.g. Firefox has no setSinkId) → incompatible, per the
 * v1.5 card (RC_BrowserLacksSoundSupport). The Requirements checklist
 * shows the reason as a ✗ row; this gate makes it fatal.
 */
export const checkBrowserSoundOutputSelectionSupport = (
  reader: ParamReader,
) => {
  return !(
    soundOutputDemandedAnywhere(reader) &&
    !browserHasSoundOutputSelectionSupport()
  );
};

export const browserHasSoundOutputSelectionSupport = (): boolean => {
  return (
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.enumerateDevices !== "undefined" &&
    typeof AudioContext !== "undefined" &&
    "setSinkId" in AudioContext.prototype
  );
};

// === 2. Selection store ==============================================

/**
 * Sound-output selection model (v1.5) — headless store behind the
 * Requirements-page selection step. No DOM here; the compat flow (step UI)
 * and threshold.js (CSV + per-block sinks) consume this module.
 *
 * Vocabulary: `needSoundOutput` (per block) and `_needSoundOutput` (block 0)
 * are the experimenter's demands. Each demand maps to a row KIND —
 * "loudspeakers" or "headphones" — and the participant picks one device per
 * needed row, or "None" (which blocks Proceed, D6). Selections are saved on
 * the Requirements page and immutable afterwards (D4).
 */

export type SoundOutputKind = "loudspeakers" | "headphones";
/** Fixed row order (alphabetical) so UI and tests are deterministic. */
export const SOUND_OUTPUT_KINDS: readonly SoundOutputKind[] = [
  "loudspeakers",
  "headphones",
];

export interface SoundOutputSelection {
  id: string;
  label: string;
}
/** Per-kind state: not yet chosen, explicitly "None", or a device. */
export type SoundOutputChoice = SoundOutputSelection | "none" | undefined;

/**
 * Map a `_needSoundOutput` value (block 0, singular) to demanded row kinds.
 * speakerOrHeadphone demands no row: either kind suffices, so there is
 * nothing specific to select.
 */
export const block0SoundOutputNeeds = (need: string): SoundOutputKind[] => {
  switch (need) {
    case "speaker":
      return ["loudspeakers"];
    case "headphone":
      return ["headphones"];
    case "speakerAndHeadphone":
      return ["loudspeakers", "headphones"];
    default:
      return [];
  }
};

const readBlock0Need = (reader: ParamReader): string =>
  ((reader.read("_needSoundOutput") as string[] | undefined)?.[0] as string) ??
  "";

export { readBlock0Need };

/**
 * Kind block 0 actually ROUTES to — the baseline the per-block reminder
 * pages diff against. A specific `_needSoundOutput` routes its demanded
 * kind; the speakerOrHeadphone reuse routes whichever saved choice supplied
 * the device (loudspeakers preferred, mirroring desiredSinkForBlock0); null
 * when nothing is routed. (Page/watch GATING stays on block0TargetKind in
 * section 4: a speakerOrHeadphone study routes silently and must
 * not show the block-0 page or block on reconnect.)
 */
export const block0RoutedKind = (
  reader: ParamReader,
): SoundOutputKind | null => {
  const need = readBlock0Need(reader);
  const kinds = block0SoundOutputNeeds(need);
  if (kinds.includes("loudspeakers")) return "loudspeakers";
  if (kinds.includes("headphones")) return "headphones";
  if (need === "speakerOrHeadphone") {
    if (deviceOrNull(choices.loudspeakers)) return "loudspeakers";
    if (deviceOrNull(choices.headphones)) return "headphones";
  }
  return null;
};

/**
 * [[KKK]] fill for participant-facing phrases: the short kind-name phrases
 * RC_Loudspeakers / RC_Headphones (translated; English fallback).
 */
export const soundOutputKindName = (
  kind: SoundOutputKind,
  lang: string,
): string => {
  const phraseKey =
    kind === "loudspeakers" ? "RC_Loudspeakers" : "RC_Headphones";
  return tryReadPhrase(phraseKey, lang) || kind;
};

/**
 * Union of every demand in the experiment: all blocks' needSoundOutput
 * (canonical name, with the deprecated name as silent fallback via
 * readNeedSoundOutput) plus block 0's _needSoundOutput. Fixed order.
 */
export const neededSoundOutputKinds = (
  reader: ParamReader,
): SoundOutputKind[] => {
  const set = new Set<SoundOutputKind>();
  const blockCount = (reader as any)._blockCount as number;
  for (let b = 1; b <= blockCount; b++) {
    for (const v of readNeedSoundOutput(b, reader)) {
      if (v === "loudspeakers" || v === "headphones") set.add(v);
    }
  }
  for (const k of block0SoundOutputNeeds(readBlock0Need(reader))) set.add(k);
  return SOUND_OUTPUT_KINDS.filter((k) => set.has(k));
};

// ---------------------------------------------------------------------------
// Selection store (module state = the experiment-wide saved selections, D4)
// ---------------------------------------------------------------------------

let choices: Record<SoundOutputKind, SoundOutputChoice> = {
  loudspeakers: undefined,
  headphones: undefined,
};
let locked = false;

export const setSoundOutputSelection = (
  kind: SoundOutputKind,
  choice: Exclude<SoundOutputChoice, undefined>,
): void => {
  if (locked) {
    console.error(
      `[soundOutput] selection for ${kind} is locked (Requirements page already closed); ignoring.`,
    );
    return;
  }
  choices[kind] = choice;
};

export const getSoundOutputSelection = (
  kind: SoundOutputKind,
): SoundOutputChoice => choices[kind];

export const lockSoundOutputSelections = (): void => {
  locked = true;
};

export const soundOutputSelectionsLocked = (): boolean => locked;

// ---------------------------------------------------------------------------
// Routing baseline for the per-block reminder pages: the kind of the most
// recently ROUTED device. Block 0 sets it at compat exit; each block sets
// it at block start. A block whose demanded kind differs gets a put-on /
// take-off reminder page.
// ---------------------------------------------------------------------------
let lastAppliedKind: SoundOutputKind | null = null;

export const getLastAppliedSoundOutputKind = (): SoundOutputKind | null =>
  lastAppliedKind;

export const setLastAppliedSoundOutputKind = (
  kind: SoundOutputKind | null,
): void => {
  lastAppliedKind = kind;
};

/** Needed kinds without a device selection (unset or explicit None). */
export const unmetSoundOutputNeeds = (reader: ParamReader): SoundOutputKind[] =>
  neededSoundOutputKinds(reader).filter((k) => {
    const c = choices[k];
    return c === undefined || c === "none";
  });

// ---------------------------------------------------------------------------
// Desired sinks: which saved device should a given audio context use?
// ---------------------------------------------------------------------------

const deviceOrNull = (c: SoundOutputChoice): SoundOutputSelection | null =>
  c && c !== "none" ? c : null;

/**
 * Block 0 (compat exit, sound calibration, headphone check). Speaker demand
 * wins when both are present — calibration is the loudspeaker activity.
 * speakerOrHeadphone reuses any device the blocks happened to select.
 */
export const desiredSinkForBlock0 = (
  reader: ParamReader,
): SoundOutputSelection | null => {
  const kinds = block0SoundOutputNeeds(readBlock0Need(reader));
  if (kinds.includes("loudspeakers")) return deviceOrNull(choices.loudspeakers);
  if (kinds.includes("headphones")) return deviceOrNull(choices.headphones);
  if (readBlock0Need(reader) === "speakerOrHeadphone")
    return (
      deviceOrNull(choices.loudspeakers) ?? deviceOrNull(choices.headphones)
    );
  return null;
};

/** Per-block sink from the block's needSoundOutput demand ("" → no change). */
export const desiredSinkForBlock = (
  block: number,
  reader: ParamReader,
): SoundOutputSelection | null => {
  const demand = readNeedSoundOutput(block, reader).find((v) => v !== "") ?? "";
  if (demand === "loudspeakers" || demand === "headphones")
    return deviceOrNull(choices[demand]);
  return null;
};

/**
 * Apply a desired sink to a freshly created AudioContext/media element.
 * Returns true when a sink was actually applied. A rejected setSinkId (e.g.
 * the device was unplugged since selection) is non-fatal — the reconnect
 * watch owns that recovery.
 */
export const applySinkToNewContext = async (
  ctx: { setSinkId?: (id: string) => Promise<void> },
  selection: SoundOutputChoice | null,
): Promise<boolean> => {
  const sel = deviceOrNull(selection ?? undefined);
  if (!sel || typeof ctx?.setSinkId !== "function") return false;
  try {
    await ctx.setSinkId(sel.id);
    return true;
  } catch {
    return false;
  }
};

/** CSV cell text for a choice: "" (unset) / "None" / "id-label". */
export const formatSoundOutputSelection = (
  c: SoundOutputChoice | null,
): string => {
  if (c === "none") return "None";
  const sel = deviceOrNull(c ?? undefined);
  return sel ? `${sel.id}-${sel.label}` : "";
};

/** Test hook: wipe selections + lock. */
export const _resetSoundOutputSelections = (): void => {
  choices = { loudspeakers: undefined, headphones: undefined };
  locked = false;
  lastAppliedKind = null;
};

// === 3. Requirements-page selection step =============================

/**
 * Requirements-page sound-output selection step (v1.5, D2/D5/D6).
 *
 * One compat-flow step, after camera selection and before the headphone
 * check. The participant picks one output device per needed row kind
 * (loudspeakers / headphones), can audition a bark on the row's device, and
 * proceeds only when no needed row is "None" (otherwise a per-row warning +
 * Quit). Selections are saved to the store (section 2) and locked on Proceed;
 * block 0 (Huggins/calibration) and per-block reminder pages consume them.
 *
 * The sim participant drives this page via the data-ee-sound-output-*
 * hooks (row / test / quit) — see components/simulatedParticipant.ts.
 */

export interface SoundOutputDevice {
  id: string;
  label: string;
}

const NONE_VALUE = "none";

const KIND_DEFINITION_PHRASE: Record<SoundOutputKind, string> = {
  loudspeakers: "RC_LoudspeakersDefinition",
  headphones: "RC_HeadphonesDefinition",
};

/**
 * V1.5 device-list policy (D7): every labeled audiooutput, deduped by id.
 * The V2 classifier (auto-labeling devices as loudspeakers/headphones)
 * replaces this one function without touching the UI.
 */
export const buildSoundOutputDeviceOptions = (
  devices: MediaDeviceInfo[],
): SoundOutputDevice[] => {
  const seen = new Set<string>();
  const out: SoundOutputDevice[] = [];
  for (const d of devices) {
    if (d.kind !== "audiooutput" || !d.label || seen.has(d.deviceId)) continue;
    seen.add(d.deviceId);
    out.push({ id: d.deviceId, label: d.label });
  }
  return out;
};

/** Labels require a mic-permission grant (same trick as the V1 popup). */
const listSoundOutputDevices = async (): Promise<SoundOutputDevice[]> => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    // Permission denied — fall through; labels may be empty.
  }
  return buildSoundOutputDeviceOptions(
    await navigator.mediaDevices.enumerateDevices(),
  );
};

/** Preselect the system's current default output when listed, else first. */
const preselectDevice = (
  devices: SoundOutputDevice[],
): SoundOutputDevice | null =>
  devices.find((d) => d.id === "default") ?? devices[0] ?? null;

export const runSoundOutputSelectionStep = async ({
  paramReader,
  rc,
}: {
  paramReader: ParamReader;
  rc: any;
}): Promise<boolean> => {
  const kinds = neededSoundOutputKinds(paramReader);
  if (kinds.length === 0) return true;
  // Unsupported browser: the final compatibility report rejects the
  // participant with RC_BrowserLacksSupportForAudioOutputSelection.
  if (!browserHasSoundOutputSelectionSupport()) return true;

  const lang = () => rc?.language?.value || "en";
  // Fetched once up front; kept fresh by the devicechange listener below.
  let devices: SoundOutputDevice[] = await listSoundOutputDevices();

  return new Promise<boolean>((resolve) => {
    const chrome = mountCompatibilityChrome({
      paramReader,
      rc,
      stepTitle: tryReadPhrase("RC_SoundOutput", lang()) || "Sound output",
      onLanguageChange: () => {
        chrome.setStepTitle(tryReadPhrase("RC_SoundOutput", lang()) || "");
        translateBody();
      },
    });

    const page = document.createElement("div");
    page.id = "sound-output-selection-step";
    page.dataset.eeSoundOutputStep = "";
    page.style.display = "flex";
    page.style.flexDirection = "column";
    page.style.position = "absolute";
    page.style.top = getCompatibilityBodyTopOffset();
    page.style.right = "20vw";
    page.style.left = "20vw";
    page.style.minWidth = "60vw";
    page.style.zIndex = "10001";
    page.style.backgroundColor = "#eee";
    page.style.lineHeight = "1.5";

    const intro = document.createElement("p");
    intro.style.margin = "0 0 1rem 0";
    page.appendChild(intro);

    // ----- one row per needed kind -----
    interface Row {
      kind: SoundOutputKind;
      container: HTMLDivElement;
      select: HTMLSelectElement;
      warning: HTMLParagraphElement;
    }
    const rows: Row[] = kinds.map((kind) => {
      const container = document.createElement("div");
      container.dataset.eeSoundOutputRow = kind;
      container.style.marginBottom = "1.25rem";

      const definition = document.createElement("p");
      definition.style.margin = "0 0 0.4rem 0";
      definition.dataset.eeSoundOutputDefinition = kind;
      container.appendChild(definition);

      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.alignItems = "center";
      controls.style.gap = "0.75rem";

      const select = document.createElement("select");
      // Styled like createLanguageSelector's dropdown (D5).
      select.style.backgroundColor = "#999";
      select.style.color = "white";
      select.style.borderRadius = "0.3rem";
      select.style.fontFamily = "inherit";
      select.style.fontSize = "inherit";
      select.style.padding = "0.25rem 0.5rem";
      controls.appendChild(select);

      // Bark test button: plays the bark on THIS row's selected device.
      const testButton = document.createElement("button");
      testButton.dataset.eeSoundOutputTest = "";
      testButton.classList.add("btn", "btn-outline-secondary");
      testButton.style.padding = "4px 10px";
      let playing = false;
      testButton.onclick = async () => {
        if (playing) return;
        const choice = getSoundOutputSelection(kind);
        if (!choice || choice === "none") return;
        playing = true;
        try {
          const audio = new Audio(dogBarkDataUrl);
          if (typeof (audio as any).setSinkId === "function") {
            await (audio as any).setSinkId(choice.id);
          }
          await audio.play();
        } catch {
          // Unrouteable device / blocked playback — non-fatal.
        } finally {
          playing = false;
        }
      };
      controls.appendChild(testButton);
      container.appendChild(controls);

      const warning = document.createElement("p");
      warning.dataset.eeSoundOutputWarning = kind;
      warning.style.color = "#b42318";
      warning.style.margin = "0.4rem 0 0 0";
      warning.style.display = "none";
      container.appendChild(warning);

      page.appendChild(container);
      return { kind, container, select, warning };
    });

    // Below the selection row(s): how to add a missing device, and the
    // wrong-kind caution (RC_WarningUseRightKindOfDevice — English fallback
    // until the phrase lands in the international table).
    const note = document.createElement("p");
    note.dataset.eeSoundOutputNote = "";
    note.style.margin = "0.5rem 0 0 0";
    page.appendChild(note);

    // ----- Proceed / Quit (D6: exactly one is visible) -----
    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.display = "flex";
    buttonWrapper.style.gap = "1rem";
    buttonWrapper.style.marginTop = "0.5rem";
    const proceedButton = document.createElement("button");
    proceedButton.classList.add("btn", "btn-success");
    proceedButton.style.padding = "10px";
    proceedButton.style.minWidth = "9rem";
    proceedButton.style.fontWeight = "bold";
    const quitButton = document.createElement("button");
    quitButton.dataset.eeSoundOutputQuit = "";
    quitButton.classList.add("btn", "btn-danger");
    quitButton.style.padding = "10px";
    quitButton.style.minWidth = "9rem";
    buttonWrapper.appendChild(proceedButton);
    buttonWrapper.appendChild(quitButton);
    page.appendChild(buttonWrapper);

    // ----- options (rebuilt from scratch on open + devicechange, D5) -----
    const rebuildRow = (row: Row) => {
      const current = getSoundOutputSelection(row.kind);
      const currentId =
        current && current !== "none"
          ? current.id
          : current === "none"
          ? NONE_VALUE
          : "";
      row.select.innerHTML = "";
      for (const d of devices) {
        const option = document.createElement("option");
        option.value = d.id;
        option.textContent = d.label;
        row.select.appendChild(option);
      }
      // "None" always last (D5).
      const noneOption = document.createElement("option");
      noneOption.value = NONE_VALUE;
      noneOption.textContent =
        tryReadPhrase("RC_Diamond-None", lang()) || "None";
      row.select.appendChild(noneOption);

      const stillThere = devices.some((d) => d.id === currentId);
      const choice =
        currentId === NONE_VALUE
          ? NONE_VALUE
          : stillThere
          ? currentId
          : preselectDevice(devices)?.id ?? NONE_VALUE;
      row.select.value = choice;
      setSoundOutputSelection(
        row.kind,
        choice === NONE_VALUE
          ? "none"
          : { id: choice, label: devices.find((d) => d.id === choice)!.label },
      );
    };

    const refreshGating = () => {
      const unmet = unmetSoundOutputNeeds(paramReader);
      const unmetSet = new Set(unmet);
      for (const row of rows) {
        row.warning.style.display = unmetSet.has(row.kind) ? "" : "none";
      }
      proceedButton.style.display = unmet.length === 0 ? "" : "none";
      quitButton.style.display = unmet.length === 0 ? "none" : "";
    };

    const translateBody = () => {
      const l = lang();
      const rtl = isRTL(l);
      page.style.direction = rtl ? "rtl" : "ltr";
      page.style.textAlign = rtl ? "right" : "left";
      intro.innerHTML = renderMarkdown(
        tryReadPhrase("RC_SelectSoundOutput", l) || "",
      );
      note.innerHTML =
        renderMarkdown(tryReadPhrase("RC_AddDevice", l) || "") +
        "<br>" +
        renderMarkdown(
          tryReadPhrase("RC_WarningUseRightKindOfDevice", l) ||
            "⚠ CAUTION: Running the study with the wrong kind of sound output device invalidates the whole session. Before paying, Quality Assurance checks the appropriateness of the sound output devices.",
        );
      for (const row of rows) {
        const definition = row.container.querySelector<HTMLElement>(
          "[data-ee-sound-output-definition]",
        )!;
        definition.innerHTML = renderMarkdown(
          tryReadPhrase(KIND_DEFINITION_PHRASE[row.kind], l) || "",
        );
        row.warning.innerHTML = renderMarkdown(
          fillPhrase(tryReadPhrase("RC_NeedOutputDevice", l) || "", {
            KKK: soundOutputKindName(row.kind, l),
          }),
        );
        const testBtn = row.container.querySelector<HTMLElement>(
          "button[data-ee-sound-output-test]",
        )!;
        testBtn.textContent = `🐶 ${tryReadPhrase("RC_Play", l) || "Play"}`;
        const noneOption = row.select.querySelector<HTMLOptionElement>(
          `option[value="${NONE_VALUE}"]`,
        );
        if (noneOption)
          noneOption.textContent =
            tryReadPhrase("RC_Diamond-None", l) || "None";
      }
      proceedButton.textContent =
        tryReadPhrase("RC_Proceed", l) ||
        tryReadPhrase("T_proceed", l) ||
        "Proceed";
      quitButton.textContent = tryReadPhrase("RC_Quit", l) || "Quit";
    };

    for (const row of rows) {
      row.select.addEventListener("change", () => {
        const v = row.select.value;
        setSoundOutputSelection(
          row.kind,
          v === NONE_VALUE
            ? "none"
            : { id: v, label: devices.find((d) => d.id === v)?.label ?? "" },
        );
        refreshGating();
      });
    }

    const onDeviceChange = async () => {
      devices = await listSoundOutputDevices();
      for (const row of rows) rebuildRow(row);
      refreshGating();
    };
    navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);

    let done = false;
    const unmount = () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        onDeviceChange,
      );
      page.remove();
      chrome.unmount();
    };
    proceedButton.onclick = () => {
      if (done || unmetSoundOutputNeeds(paramReader).length > 0) return;
      done = true;
      lockSoundOutputSelections();
      unmount();
      resolve(true);
    };
    quitButton.onclick = () => {
      if (done) return;
      done = true;
      unmount();
      resolve(false);
    };

    translateBody();
    document.body.prepend(page);
    for (const row of rows) rebuildRow(row);
    refreshGating();
  });
};

// === 4. Block-0 page, sink patch, live targets, reconnect watch ======

/**
 * Block-0 sound-output routing (v1.5 Phase 5).
 *
 * After the Requirements page saved+locked the selections, block 0 (sound
 * calibration, Huggins already done) must actually ROUTE audio to the saved
 * device:
 *
 *  - `runSoundOutputBlock0Page` — compat-exit page "Setting sound output
 *    device" (RC_SettingSoundOutput): tells the participant which device the
 *    study will use (RC_RemoveHeadphonesBrief for loudspeakers,
 *    RC_PutOnYourXXXHeadphones for headphones) and arms the routing. Shown
 *    only when `_needSoundOutput` demands a specific kind; a
 *    speakerOrHeadphone study routes silently.
 *  - routing = armed `AudioContext` constructor patch (the calibration
 *    library lazily creates its own contexts, so wrapping the constructor is
 *    the only hook that catches them all) + setSinkId broadcast to
 *    registered live targets (see threshold.js registrations).
 *  - `startSoundOutputReconnectWatch` — if the routed device disappears
 *    (devicechange), block everything with RC_TryToReconnectDevice and a
 *    Quit; on reconnect re-apply the sink and restore Proceed.
 *
 * The sim participant drives these pages via data-ee-sound-output-block0 /
 * data-ee-sound-output-reconnect hooks — see simulatedParticipant.ts.
 */

// ---------------------------------------------------------------------------
// Desired sink + armed constructor patch
// ---------------------------------------------------------------------------

let currentSinkId: string | null = null;

export const setCurrentDesiredSink = (
  sel: SoundOutputSelection | null,
): void => {
  currentSinkId = sel ? sel.id : null;
};

let patchArmed = false;
let savedConstructors: [string, unknown][] = [];

/**
 * Wrap window.AudioContext so every context created afterwards auto-applies
 * the current desired sink. Idempotent. The sound-calibration library
 * (speakerCalibrator) constructs its playback contexts lazily and
 * repeatedly, so per-instance wiring would miss them — the constructor is
 * the one hook that catches every context.
 */
export const armAudioContextSinkPatch = (): void => {
  if (patchArmed) return;
  patchArmed = true;
  if (!browserHasSoundOutputSelectionSupport()) return;
  const w = window as unknown as Record<string, any>;
  for (const name of ["AudioContext", "webkitAudioContext"]) {
    const Native = w[name];
    if (typeof Native !== "function") continue;
    const Patched = function (this: unknown, ...args: unknown[]) {
      const ctx = Reflect.construct(Native, args) as {
        setSinkId?: (id: string) => Promise<void>;
      };
      const id = currentSinkId;
      if (id && typeof ctx?.setSinkId === "function") {
        Promise.resolve(ctx.setSinkId(id)).catch(() => {
          // Unrouteable device — non-fatal; the reconnect watch owns
          // recovery.
        });
      }
      return ctx;
    } as unknown as new (...args: unknown[]) => unknown;
    Object.defineProperty(Patched, "name", { value: name });
    savedConstructors.push([name, Native]);
    w[name] = Patched;
  }
};

// Test hook: undo the patch (restores the saved constructors).
export const _resetAudioContextSinkPatch = (): void => {
  const w = window as unknown as Record<string, any>;
  for (const [name, Native] of savedConstructors) w[name] = Native;
  savedConstructors = [];
  patchArmed = false;
  currentSinkId = null;
};

// ---------------------------------------------------------------------------
// Live-target broadcast (elements/contexts that already exist)
// ---------------------------------------------------------------------------

const liveTargets: unknown[] = [];

/** Register a live element/context to receive sink updates. */
export const registerSoundOutputTarget = (t: unknown): void => {
  if (t && !liveTargets.includes(t)) liveTargets.push(t);
};

/** setSinkId every registered live target (dead entries ignored). */
export const applySinkToLiveTargets = async (
  sel: SoundOutputSelection | null,
): Promise<void> => {
  for (const t of liveTargets) {
    if (t && typeof (t as { setSinkId?: unknown }).setSinkId === "function") {
      await applySinkToNewContext(
        t as { setSinkId: (id: string) => Promise<void> },
        sel,
      );
    }
  }
};

// ---------------------------------------------------------------------------
// Block-0 page (compat exit)
// ---------------------------------------------------------------------------

/**
 * Which row kind block 0's sink routes to (matches desiredSinkForBlock0's
 * preference: loudspeakers win — calibration is a loudspeaker activity).
 * null when `_needSoundOutput` demands no specific kind.
 */
export const block0TargetKind = (
  reader: ParamReader,
): SoundOutputKind | null => {
  const kinds = block0SoundOutputNeeds(readBlock0Need(reader));
  if (kinds.includes("loudspeakers")) return "loudspeakers";
  if (kinds.includes("headphones")) return "headphones";
  return null;
};

/** Page body phrase per target kind (labels filled at render time). */
export const block0BodyPhrase = (kind: SoundOutputKind): string =>
  kind === "loudspeakers"
    ? "RC_RemoveHeadphonesBrief"
    : "RC_PutOnYourXXXHeadphones";

export const runSoundOutputBlock0Page = async ({
  paramReader,
  rc,
}: {
  paramReader: ParamReader;
  rc: any;
}): Promise<boolean> => {
  const selection = desiredSinkForBlock0(paramReader);

  // Route block 0's audio to the saved device: new contexts (calibration
  // library) via the armed constructor, existing ones via broadcast. This
  // also seeds the baseline the per-block reminder pages diff against.
  if (selection) {
    setCurrentDesiredSink(selection);
    armAudioContextSinkPatch();
    await applySinkToLiveTargets(selection);
    setLastAppliedSoundOutputKind(block0RoutedKind(paramReader));
  }

  // speakerOrHeadphone / no demand / nothing saved → silent routing.
  const kind = block0TargetKind(paramReader);
  if (!selection || !kind) return true;

  // The final compatibility report resolves but is NOT unmounted by its
  // own page; this page mounts in the same spot. Clear it first, or the
  // two overlap and the report's dead Proceed button eats the clicks.
  unmountCompatibilityReportPage();

  const lang = () => rc?.language?.value || "en";
  return new Promise<boolean>((resolve) => {
    const chrome = mountCompatibilityChrome({
      paramReader,
      rc,
      stepTitle:
        tryReadPhrase("RC_SettingSoundOutput", lang()) ||
        "Setting sound output device",
      onLanguageChange: () => {
        chrome.setStepTitle(
          tryReadPhrase("RC_SettingSoundOutput", lang()) ||
            "Setting sound output device",
        );
        translateBody();
      },
    });

    const page = document.createElement("div");
    page.id = "sound-output-block0-page";
    page.dataset.eeSoundOutputBlock0 = "";
    page.dataset.eeSoundOutputBlock0Kind = kind;
    page.style.display = "flex";
    page.style.flexDirection = "column";
    // Start-align children — flex default stretch would pull the body
    // text and Proceed button across the full page width.
    page.style.alignItems = "flex-start";
    page.style.position = "absolute";
    page.style.top = getCompatibilityBodyTopOffset();
    page.style.right = "20vw";
    page.style.left = "20vw";
    page.style.minWidth = "60vw";
    // Above Remote Calibrator, whose panels stack up to z 999999999999 —
    // below that, RC headings bleed over the page and cover its buttons.
    page.style.zIndex = "1000000000000";
    page.style.backgroundColor = "#eee";
    page.style.lineHeight = "1.5";

    const body = document.createElement("p");
    body.style.margin = "0 0 1rem 0";
    page.appendChild(body);

    const proceedButton = document.createElement("button");
    proceedButton.dataset.eeSoundOutputBlock0Proceed = "";
    proceedButton.classList.add("btn", "btn-success");
    proceedButton.style.padding = "10px";
    proceedButton.style.minWidth = "9rem";
    proceedButton.style.fontWeight = "bold";
    page.appendChild(proceedButton);

    const translateBody = () => {
      const l = lang();
      const rtl = isRTL(l);
      page.style.direction = rtl ? "rtl" : "ltr";
      page.style.textAlign = rtl ? "right" : "left";
      body.innerHTML = renderMarkdown(
        fillPhrase(tryReadPhrase(block0BodyPhrase(kind), l) || "", {
          XXX: selection.label,
        }),
      );
      proceedButton.textContent =
        tryReadPhrase("RC_Proceed", l) ||
        tryReadPhrase("T_proceed", l) ||
        "Proceed";
    };

    let done = false;
    proceedButton.onclick = () => {
      if (done) return;
      done = true;
      page.remove();
      chrome.unmount();
      resolve(true);
    };

    translateBody();
    document.body.prepend(page);
  });
};

// ---------------------------------------------------------------------------
// Reconnect watch
// ---------------------------------------------------------------------------

/**
 * Watch the routed block-0 device for the rest of the session. When it
 * disappears, cover the screen with RC_TryToReconnectDevice (+ Quit). When
 * it returns, re-apply the sink and restore a Proceed button. No-op when
 * nothing is routed for block 0.
 */
export const startSoundOutputReconnectWatch = ({
  paramReader,
  rc,
  quitPsychoJS,
}: {
  paramReader: ParamReader;
  rc: any;
  quitPsychoJS: (...args: unknown[]) => unknown;
}): void => {
  const selection = desiredSinkForBlock0(paramReader);
  const kind = block0TargetKind(paramReader);
  if (!selection || !kind) return;

  const lang = () => rc?.language?.value || "en";

  const devicePresent = async (): Promise<boolean> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((d) => d.deviceId === selection.id);
    } catch {
      return true; // enumeration failed — don't nag
    }
  };

  let overlay: {
    root: HTMLDivElement;
    message: HTMLParagraphElement;
    proceed: HTMLButtonElement;
  } | null = null;

  const buildOverlay = () => {
    const root = document.createElement("div");
    root.dataset.eeSoundOutputReconnect = "";
    root.dataset.state = "missing";
    root.style.position = "fixed";
    root.style.inset = "0";
    // One above the block-0 page (and RC's max stacking).
    root.style.zIndex = "1000000000001";
    root.style.backgroundColor = "#eee";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.alignItems = "center";
    root.style.justifyContent = "center";
    root.style.gap = "1rem";
    root.style.padding = "10vh 20vw";
    root.style.lineHeight = "1.5";

    const title = document.createElement("h1");
    title.style.fontSize = "1.6rem";
    root.appendChild(title);

    const message = document.createElement("p");
    message.style.margin = "0";
    root.appendChild(message);

    const buttons = document.createElement("div");
    buttons.style.display = "flex";
    buttons.style.gap = "1rem";

    const proceed = document.createElement("button");
    proceed.dataset.eeSoundOutputReconnectProceed = "";
    proceed.classList.add("btn", "btn-success");
    proceed.style.padding = "10px";
    proceed.style.minWidth = "9rem";
    proceed.style.fontWeight = "bold";
    proceed.style.display = "none";
    proceed.onclick = () => {
      if (overlay) {
        overlay.root.remove();
        overlay = null;
      }
    };
    buttons.appendChild(proceed);

    const quit = document.createElement("button");
    quit.dataset.eeSoundOutputReconnectQuit = "";
    quit.classList.add("btn", "btn-danger");
    quit.style.padding = "10px";
    quit.style.minWidth = "9rem";
    quit.onclick = () =>
      quitPsychoJS(
        "",
        false,
        paramReader,
        true,
        false,
        "soundOutputDisconnected",
      ) as unknown as void;
    buttons.appendChild(quit);

    root.appendChild(buttons);
    document.body.appendChild(root);

    const o = { root, message, proceed };
    overlay = o;
    translate();
    return o;
  };

  const translate = () => {
    if (!overlay) return;
    const l = lang();
    const rtl = isRTL(l);
    overlay.root.style.direction = rtl ? "rtl" : "ltr";
    overlay.root.style.textAlign = rtl ? "right" : "center";
    overlay.message.innerHTML = renderMarkdown(
      fillPhrase(tryReadPhrase("RC_TryToReconnectDevice", l) || "", {
        XXX: selection.label,
        KKK: soundOutputKindName(kind, l),
      }),
    );
    overlay.proceed.textContent =
      tryReadPhrase("RC_Proceed", l) ||
      tryReadPhrase("T_proceed", l) ||
      "Proceed";
    overlay.root.querySelector("h1")!.textContent =
      tryReadPhrase("RC_SettingSoundOutput", l) ||
      "Setting sound output device";
    const quitBtn = overlay.root.querySelector<HTMLButtonElement>(
      "button[data-ee-sound-output-reconnect-quit]",
    );
    if (quitBtn) quitBtn.textContent = tryReadPhrase("RC_Quit", l) || "Quit";
  };

  const markRestored = async () => {
    if (!overlay) return;
    overlay.root.dataset.state = "restored";
    overlay.proceed.style.display = "";
    // Re-apply the sink — the browser may have dropped the route while the
    // device was away.
    setCurrentDesiredSink(selection);
    await applySinkToLiveTargets(selection);
    translate();
  };

  const onDeviceChange = async () => {
    if (await devicePresent()) {
      if (overlay) await markRestored();
    } else if (!overlay) {
      buildOverlay();
    }
  };

  navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
  // Initial check: catches a device that vanished before the watch started.
  onDeviceChange();
};

// === 5. Per-block routing + reminders ================================

/**
 * Per-block sound-output routing + reminder pages (v1.5 Phase 6).
 *
 * At each block start (filterRoutineBegin in threshold.js), the block's
 * `needSoundOutput` demand is routed to the device the Requirements page
 * saved for that kind, and the block's CSV rows name the device in a
 * `soundOutputDevice` column.
 *
 * The participant sees a reminder interstitial ONLY when the demanded kind
 * differs from the most recently routed one (store's lastAppliedSoundOutputKind;
 * block 0 seeds it at compat exit): RC_PutOnYourXXXHeadphones when a block
 * needs headphones, RC_RemoveHeadphonesBrief when it needs loudspeakers —
 * [[XXX]] filled with the saved device label. Same-kind consecutive blocks
 * route silently.
 *
 * This replaces the V1 per-block Swal radio popup (deleted with Phase 6).
 */

const blockKind = (
  block: number,
  reader: ParamReader,
): SoundOutputKind | null => {
  const demand = readNeedSoundOutput(block, reader).find((v) => v !== "") ?? "";
  return demand === "loudspeakers" || demand === "headphones" ? demand : null;
};

const runReminderPage = async ({
  kind,
  selection,
  rc,
}: {
  kind: SoundOutputKind;
  selection: SoundOutputSelection;
  rc: any;
}): Promise<void> => {
  const lang = () => rc?.language?.value || "en";
  await new Promise<void>((resolve) => {
    const page = document.createElement("div");
    page.id = "sound-output-reminder-page";
    page.dataset.eeSoundOutputReminder = "";
    page.dataset.kind = kind;
    page.style.display = "flex";
    page.style.flexDirection = "column";
    // Start-align children — flex default stretch would pull the body
    // text and Proceed button across the full page width.
    page.style.alignItems = "flex-start";
    page.style.gap = "0.5rem";
    page.style.position = "absolute";
    page.style.top = getCompatibilityBodyTopOffset();
    page.style.right = "20vw";
    page.style.left = "20vw";
    page.style.minWidth = "60vw";
    // Above Remote Calibrator's stacking (up to z 999999999999).
    page.style.zIndex = "1000000000000";
    page.style.backgroundColor = "#eee";
    page.style.lineHeight = "1.5";
    page.style.padding = "5vh 2vw";

    const title = document.createElement("h1");
    title.style.fontSize = "1.6rem";
    title.style.margin = "0";
    page.appendChild(title);

    const body = document.createElement("p");
    body.style.margin = "0 0 1rem 0";
    page.appendChild(body);

    const proceedButton = document.createElement("button");
    proceedButton.dataset.eeSoundOutputReminderProceed = "";
    proceedButton.classList.add("btn", "btn-success");
    proceedButton.style.padding = "10px";
    proceedButton.style.minWidth = "9rem";
    proceedButton.style.fontWeight = "bold";
    page.appendChild(proceedButton);

    const translate = () => {
      const l = lang();
      const rtl = isRTL(l);
      page.style.direction = rtl ? "rtl" : "ltr";
      page.style.textAlign = rtl ? "right" : "left";
      title.textContent =
        tryReadPhrase("RC_SettingSoundOutput", l) ||
        "Setting sound output device";
      body.innerHTML = renderMarkdown(
        fillPhrase(tryReadPhrase(block0BodyPhrase(kind), l) || "", {
          XXX: selection.label,
        }),
      );
      proceedButton.textContent =
        tryReadPhrase("RC_Proceed", l) ||
        tryReadPhrase("T_proceed", l) ||
        "Proceed";
    };

    let done = false;
    proceedButton.onclick = () => {
      if (done) return;
      done = true;
      page.remove();
      resolve();
    };

    translate();
    document.body.prepend(page);
  });
};

/**
 * Route the block's audio to the saved device (new contexts via the armed
 * constructor patch, live targets via broadcast), write the block's
 * `soundOutputDevice` CSV cell, and show the put-on/take-off reminder when
 * the demanded kind differs from the last routed one — in that case the
 * routing waits for the reminder's dismissal so the previous block's
 * response sound can't jump devices mid-play. Blocks with no demand
 * (or nothing saved) are silent no-ops that record an empty cell.
 */
export const applySoundOutputForBlock = async ({
  block,
  paramReader,
  rc,
  saveToOutputCSVFn,
}: {
  block: number;
  paramReader: ParamReader;
  rc: any;
  saveToOutputCSVFn: (label: string, value: any) => void;
}): Promise<void> => {
  const kind = blockKind(block, paramReader);
  const selection = kind ? desiredSinkForBlock(block, paramReader) : null;

  // Register the column ONLY for blocks that demand sound output —
  // addData puts the key in every subsequent CSV row, and studies that
  // never mention needSoundOutput must not gain columns.
  if (kind)
    saveToOutputCSVFn(
      "soundOutputDevice",
      formatSoundOutputSelection(selection),
    );

  if (!kind || !selection) return;

  const route = async () => {
    setCurrentDesiredSink(selection);
    armAudioContextSinkPatch();
    await applySinkToLiveTargets(selection);
    setLastAppliedSoundOutputKind(kind);
  };

  if (getLastAppliedSoundOutputKind() !== kind) {
    // Kind changed → remind first, then route. Routing before the reminder
    // would reroute the previous block's still-playing response sound to
    // the new device mid-play; nothing sounds during the reminder itself.
    await runReminderPage({ kind, selection, rc });
    await route();
  } else {
    // Same kind ⇒ same device — idempotent re-apply, inaudible.
    await route();
  }
};
