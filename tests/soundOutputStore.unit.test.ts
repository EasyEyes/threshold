/**
 * Sound-output selection model (v1.5 Phase 3): headless store behind the
 * Requirements-page selection step. Kind mapping (singular _needSoundOutput
 * values → plural row kinds), union-of-demands across block 0 and all blocks,
 * "None" semantics, saved selections (immutable once locked), desired-sink
 * computation, and applySinkToNewContext.
 *
 * @jest-environment jsdom
 */
import {
  SOUND_OUTPUT_KINDS,
  block0SoundOutputNeeds,
  neededSoundOutputKinds,
  setSoundOutputSelection,
  getSoundOutputSelection,
  lockSoundOutputSelections,
  soundOutputSelectionsLocked,
  unmetSoundOutputNeeds,
  desiredSinkForBlock0,
  desiredSinkForBlock,
  applySinkToNewContext,
  formatSoundOutputSelection,
  _resetSoundOutputSelections,
} from "../components/soundOutput";

/** Minimal ParamReader-shaped mock. rows[name] may be:
 *  - string[] shared by all blocks, or
 *  - { [block: number]: string[] } for per-block values. */
const mkReader = (
  rows: Record<string, string[] | Record<number, string[]>>,
  blockCount = 1,
): any => ({
  _blockCount: blockCount,
  read: (name: string, block?: any) => {
    const v = rows[name];
    if (v === undefined) return [""];
    if (Array.isArray(v)) return v;
    if (block === undefined) return Object.values(v)[0] ?? [""];
    return v[block as number] ?? [""];
  },
});

const AIRPODS = { id: "sim-output-airpods", label: "Denis's AirPods Pro #2" };
const SPEAKERS = { id: "sim-output-speakers", label: "MacBook Pro Speakers" };

beforeEach(() => _resetSoundOutputSelections());

describe("block0SoundOutputNeeds (singular → plural kind mapping)", () => {
  it("maps the four _needSoundOutput values", () => {
    expect(block0SoundOutputNeeds("speaker")).toEqual(["loudspeakers"]);
    expect(block0SoundOutputNeeds("headphone")).toEqual(["headphones"]);
    expect(block0SoundOutputNeeds("speakerAndHeadphone")).toEqual([
      "loudspeakers",
      "headphones",
    ]);
    // Or: either kind suffices, so it demands no specific row.
    expect(block0SoundOutputNeeds("speakerOrHeadphone")).toEqual([]);
  });
  it("maps empty/unknown to no rows", () => {
    expect(block0SoundOutputNeeds("")).toEqual([]);
    expect(block0SoundOutputNeeds("garbage")).toEqual([]);
  });
});

describe("neededSoundOutputKinds (union of demands)", () => {
  it("unions needSoundOutput across blocks", () => {
    const reader = mkReader(
      {
        needSoundOutput: { 1: ["headphones"], 2: ["loudspeakers"] },
        _needSoundOutput: [""],
      },
      2,
    );
    expect(neededSoundOutputKinds(reader)).toEqual([
      "loudspeakers",
      "headphones",
    ]);
  });

  it("adds the block-0 (_needSoundOutput) demand", () => {
    const reader = mkReader({ _needSoundOutput: ["headphone"] });
    expect(neededSoundOutputKinds(reader)).toEqual(["headphones"]);
  });

  it("dedupes block and block-0 demands, deterministic order", () => {
    const reader = mkReader({
      needSoundOutput: ["headphones"],
      _needSoundOutput: ["speakerAndHeadphone"],
    });
    expect(neededSoundOutputKinds(reader)).toEqual([
      "loudspeakers",
      "headphones",
    ]);
    expect(neededSoundOutputKinds(reader)).toEqual(
      neededSoundOutputKinds(reader),
    );
  });

  it("speakerOrHeadphone demands no row", () => {
    const reader = mkReader({ _needSoundOutput: ["speakerOrHeadphone"] });
    expect(neededSoundOutputKinds(reader)).toEqual([]);
  });

  it("sees demands made only under the deprecated name", () => {
    const reader = mkReader({
      needSoundOutputKind: ["headphones"],
      _needSoundOutput: [""],
    });
    expect(neededSoundOutputKinds(reader)).toEqual(["headphones"]);
  });

  it("empty experiment demands nothing", () => {
    const reader = mkReader({});
    expect(neededSoundOutputKinds(reader)).toEqual([]);
  });
});

describe("selection store", () => {
  it("round-trips a device selection", () => {
    setSoundOutputSelection("headphones", AIRPODS);
    expect(getSoundOutputSelection("headphones")).toEqual(AIRPODS);
  });

  it("distinguishes unset, None, and a device", () => {
    expect(getSoundOutputSelection("loudspeakers")).toBeUndefined();
    setSoundOutputSelection("loudspeakers", "none");
    expect(getSoundOutputSelection("loudspeakers")).toBe("none");
    setSoundOutputSelection("headphones", AIRPODS);
    expect(getSoundOutputSelection("headphones")).toEqual(AIRPODS);
  });

  it("is immutable once locked (Requirements page has closed)", () => {
    setSoundOutputSelection("headphones", AIRPODS);
    lockSoundOutputSelections();
    expect(soundOutputSelectionsLocked()).toBe(true);
    setSoundOutputSelection("headphones", SPEAKERS);
    expect(getSoundOutputSelection("headphones")).toEqual(AIRPODS);
  });
});

describe("unmetSoundOutputNeeds (Proceed gating)", () => {
  const reader = mkReader(
    {
      needSoundOutput: { 1: ["headphones"], 2: ["loudspeakers"] },
      _needSoundOutput: [""],
    },
    2,
  );

  it("needed rows are unmet before any selection", () => {
    expect(unmetSoundOutputNeeds(reader)).toEqual([
      "loudspeakers",
      "headphones",
    ]);
  });

  it("a device selection meets the need", () => {
    setSoundOutputSelection("loudspeakers", SPEAKERS);
    setSoundOutputSelection("headphones", AIRPODS);
    expect(unmetSoundOutputNeeds(reader)).toEqual([]);
  });

  it("an explicit None does NOT meet the need", () => {
    setSoundOutputSelection("loudspeakers", SPEAKERS);
    setSoundOutputSelection("headphones", "none");
    expect(unmetSoundOutputNeeds(reader)).toEqual(["headphones"]);
  });

  it("ignores kinds the experiment does not need", () => {
    const headphoneOnly = mkReader({
      needSoundOutput: ["headphones"],
      _needSoundOutput: [""],
    });
    setSoundOutputSelection("headphones", AIRPODS);
    expect(unmetSoundOutputNeeds(headphoneOnly)).toEqual([]);
  });
});

describe("desired sink", () => {
  it("block 0: headphone need → headphones selection", () => {
    const reader = mkReader({ _needSoundOutput: ["headphone"] });
    setSoundOutputSelection("headphones", AIRPODS);
    expect(desiredSinkForBlock0(reader)).toEqual(AIRPODS);
  });

  it("block 0: speaker need → loudspeakers selection", () => {
    const reader = mkReader({ _needSoundOutput: ["speaker"] });
    setSoundOutputSelection("loudspeakers", SPEAKERS);
    expect(desiredSinkForBlock0(reader)).toEqual(SPEAKERS);
  });

  it("block 0: speakerAndHeadphone prefers loudspeakers (calibration)", () => {
    const reader = mkReader({ _needSoundOutput: ["speakerAndHeadphone"] });
    setSoundOutputSelection("loudspeakers", SPEAKERS);
    setSoundOutputSelection("headphones", AIRPODS);
    expect(desiredSinkForBlock0(reader)).toEqual(SPEAKERS);
  });

  it("block 0: speakerOrHeadphone reuses any selected device", () => {
    const reader = mkReader({ _needSoundOutput: ["speakerOrHeadphone"] });
    expect(desiredSinkForBlock0(reader)).toBeNull();
    setSoundOutputSelection("headphones", AIRPODS);
    expect(desiredSinkForBlock0(reader)).toEqual(AIRPODS);
  });

  it("block 0: a None selection yields no sink", () => {
    const reader = mkReader({ _needSoundOutput: ["headphone"] });
    setSoundOutputSelection("headphones", "none");
    expect(desiredSinkForBlock0(reader)).toBeNull();
  });

  it("block: demand selects the matching kind's device", () => {
    const reader = mkReader(
      {
        needSoundOutput: { 1: ["headphones"], 2: ["loudspeakers"] },
        _needSoundOutput: [""],
      },
      2,
    );
    setSoundOutputSelection("headphones", AIRPODS);
    setSoundOutputSelection("loudspeakers", SPEAKERS);
    expect(desiredSinkForBlock(1, reader)).toEqual(AIRPODS);
    expect(desiredSinkForBlock(2, reader)).toEqual(SPEAKERS);
  });

  it("block: no demand → no sink change", () => {
    const reader = mkReader({ _needSoundOutput: [""] });
    setSoundOutputSelection("headphones", AIRPODS);
    expect(desiredSinkForBlock(1, reader)).toBeNull();
  });
});

describe("applySinkToNewContext", () => {
  it("applies the selection to a fresh context", async () => {
    const calls: string[] = [];
    const ctx = { setSinkId: async (id: string) => void calls.push(id) };
    await expect(applySinkToNewContext(ctx, AIRPODS)).resolves.toBe(true);
    expect(calls).toEqual([AIRPODS.id]);
  });

  it("no-ops for null/None selections", async () => {
    const ctx = { setSinkId: jest.fn() };
    await expect(applySinkToNewContext(ctx, null)).resolves.toBe(false);
    await expect(applySinkToNewContext(ctx, "none")).resolves.toBe(false);
    expect(ctx.setSinkId).not.toHaveBeenCalled();
  });

  it("no-ops when the context lacks setSinkId", async () => {
    await expect(applySinkToNewContext({}, AIRPODS)).resolves.toBe(false);
  });

  it("a rejected setSinkId (device vanished) is non-fatal", async () => {
    const ctx = {
      setSinkId: async () => {
        throw new Error("NotFoundError");
      },
    };
    await expect(applySinkToNewContext(ctx, AIRPODS)).resolves.toBe(false);
  });
});

describe("formatSoundOutputSelection (CSV cell text)", () => {
  it("formats device / None / unset", () => {
    expect(formatSoundOutputSelection(AIRPODS)).toBe(
      `${AIRPODS.id}-${AIRPODS.label}`,
    );
    expect(formatSoundOutputSelection("none")).toBe("None");
    expect(formatSoundOutputSelection(undefined)).toBe("");
    expect(formatSoundOutputSelection(null)).toBe("");
  });
});

it("exports the two row kinds in fixed order", () => {
  expect(SOUND_OUTPUT_KINDS).toEqual(["loudspeakers", "headphones"]);
});
