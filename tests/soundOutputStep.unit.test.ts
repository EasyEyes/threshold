/**
 * Requirements-page sound-output selection step (v1.5 Phase 4), jsdom tests.
 * Drives the REAL step UI: rows per needed kind, device selects (None last,
 * current/first device preselected), bark test button routed to the row's
 * device, Proceed/Quit gating (D6), lock-on-Proceed (D4), devicechange
 * rebuild (D5).
 *
 * @jest-environment jsdom
 */
import { loadPhrasesForTests } from "./helpers/phrases";
import { runSoundOutputSelectionStep } from "../components/soundOutput";
import {
  getSoundOutputSelection,
  soundOutputSelectionsLocked,
  _resetSoundOutputSelections,
} from "../components/soundOutput";

const DEVICES = [
  { deviceId: "sim-output-speakers", label: "MacBook Pro Speakers" },
  { deviceId: "sim-output-airpods", label: "Denis's AirPods Pro #2" },
];

let mediaDevicesMock: {
  getUserMedia: jest.Mock;
  enumerateDevices: jest.Mock;
  handlers: Record<string, (() => void)[]>;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

const fireDeviceChange = () => {
  for (const fn of mediaDevicesMock.handlers["devicechange"] ?? []) fn();
};

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

const rc = { language: { value: "en" } } as any;

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

const $ = <T extends HTMLElement>(sel: string): T | null =>
  document.querySelector(sel) as T | null;

beforeAll(async () => {
  await loadPhrasesForTests();
});

beforeEach(() => {
  _resetSoundOutputSelections();
  document.body.innerHTML = "";
  document.body.className = "";
  document.documentElement.className = "";
  const handlers: Record<string, (() => void)[]> = {};
  mediaDevicesMock = {
    handlers,
    getUserMedia: jest.fn(async () => ({})),
    enumerateDevices: jest.fn(async () =>
      DEVICES.map(
        (d) =>
          ({
            deviceId: d.deviceId,
            label: d.label,
            kind: "audiooutput",
            groupId: "g",
          }) as MediaDeviceInfo,
      ),
    ),
    addEventListener: (type, fn) => {
      (handlers[type] ??= []).push(fn);
    },
    removeEventListener: (type, fn) => {
      handlers[type] = (handlers[type] ?? []).filter((f) => f !== fn);
    },
  };
  Object.defineProperty(navigator, "mediaDevices", {
    value: mediaDevicesMock,
    configurable: true,
  });
  (HTMLMediaElement.prototype as any).play = jest.fn(async () => {});
  (HTMLMediaElement.prototype as any).setSinkId = jest.fn(async () => {});
  // browserHasSoundOutputSelectionSupport requires AudioContext.setSinkId
  // ON THE PROTOTYPE (a class field would be an own instance property).
  (window as any).AudioContext = class {
    async setSinkId() {}
  };
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("runSoundOutputSelectionStep", () => {
  it("no demand → resolves true without rendering anything", async () => {
    const reader = mkReader({ _needSoundOutput: [""] });
    await expect(
      runSoundOutputSelectionStep({ paramReader: reader, rc }),
    ).resolves.toBe(true);
    expect($("[data-ee-sound-output-step]")).toBeNull();
  });

  it("renders one select row per needed kind, None option last, first device preselected", async () => {
    const reader = mkReader(
      {
        needSoundOutput: { 1: ["headphones"], 2: ["loudspeakers"] },
        _needSoundOutput: [""],
      },
      2,
    );
    const done = runSoundOutputSelectionStep({ paramReader: reader, rc });
    await flush();

    expect($("[data-ee-sound-output-step]")).not.toBeNull();
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>("[data-ee-sound-output-row]"),
    );
    expect(rows.map((r) => r.dataset.eeSoundOutputRow)).toEqual([
      "loudspeakers",
      "headphones",
    ]);
    for (const row of rows) {
      const select = row.querySelector("select")!;
      const values = Array.from(select.options).map((o) => o.value);
      expect(values).toEqual([
        DEVICES[0].deviceId,
        DEVICES[1].deviceId,
        "none",
      ]);
      // First (current/available) device preselected and saved to the store.
      expect(select.value).toBe(DEVICES[0].deviceId);
      // "None" label comes from the phrase table.
      expect(select.options[select.options.length - 1].textContent).toBe(
        "None",
      );
    }
    expect(getSoundOutputSelection("loudspeakers")).toEqual({
      id: DEVICES[0].deviceId,
      label: DEVICES[0].label,
    });
    // Clean up: proceed to resolve the promise.
    $<HTMLButtonElement>("[data-ee-sound-output-step] .btn-success")!.click();
    await expect(done).resolves.toBe(true);
  });

  it("selecting None hides Proceed and shows the warning + Quit; reselecting a device restores Proceed", async () => {
    const reader = mkReader({
      needSoundOutput: ["headphones"],
      _needSoundOutput: [""],
    });
    const done = runSoundOutputSelectionStep({ paramReader: reader, rc });
    await flush();

    const step = $("[data-ee-sound-output-step]")!;
    const proceed = step.querySelector<HTMLButtonElement>(".btn-success")!;
    const quit = $<HTMLButtonElement>("button[data-ee-sound-output-quit]")!;
    expect(proceed.style.display).not.toBe("none");
    expect(quit.style.display).toBe("none");

    const select = step.querySelector("select")!;
    select.value = "none";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();

    expect(proceed.style.display).toBe("none");
    expect(quit.style.display).not.toBe("none");
    const warning = step.querySelector<HTMLElement>(
      "[data-ee-sound-output-warning]",
    )!;
    expect(warning.style.display).not.toBe("none");
    expect(warning.textContent).toMatch(/are needed/);
    expect(warning.textContent).toMatch(/headphones/i);

    select.value = DEVICES[1].deviceId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    expect(proceed.style.display).not.toBe("none");
    expect(quit.style.display).toBe("none");

    proceed.click();
    await expect(done).resolves.toBe(true);
  });

  it("Proceed locks the chosen selections (immutable afterwards)", async () => {
    const reader = mkReader({
      needSoundOutput: ["headphones"],
      _needSoundOutput: [""],
    });
    const done = runSoundOutputSelectionStep({ paramReader: reader, rc });
    await flush();

    const step = $("[data-ee-sound-output-step]")!;
    const select = step.querySelector("select")!;
    select.value = DEVICES[1].deviceId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    step.querySelector<HTMLButtonElement>(".btn-success")!.click();

    await expect(done).resolves.toBe(true);
    expect(soundOutputSelectionsLocked()).toBe(true);
    expect(getSoundOutputSelection("headphones")).toEqual({
      id: DEVICES[1].deviceId,
      label: DEVICES[1].label,
    });
    // Page unmounted.
    expect($("[data-ee-sound-output-step]")).toBeNull();
  });

  it("rebuilds options on devicechange, preserving a surviving selection and re-preselecting a vanished one", async () => {
    const reader = mkReader({
      needSoundOutput: ["headphones"],
      _needSoundOutput: [""],
    });
    const done = runSoundOutputSelectionStep({ paramReader: reader, rc });
    await flush();

    const step = $("[data-ee-sound-output-step]")!;
    const select = step.querySelector("select")!;
    select.value = DEVICES[1].deviceId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();

    // Device list changes but the selection survives → kept.
    fireDeviceChange();
    await flush();
    expect(select.value).toBe(DEVICES[1].deviceId);
    expect(getSoundOutputSelection("headphones")).toEqual({
      id: DEVICES[1].deviceId,
      label: DEVICES[1].label,
    });

    // The selected device vanishes → fall back to the first remaining device.
    mediaDevicesMock.enumerateDevices.mockResolvedValueOnce([
      {
        deviceId: DEVICES[0].deviceId,
        label: DEVICES[0].label,
        kind: "audiooutput",
        groupId: "g",
      } as MediaDeviceInfo,
    ]);
    fireDeviceChange();
    await flush();
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual([DEVICES[0].deviceId, "none"]);
    expect(select.value).toBe(DEVICES[0].deviceId);
    expect(getSoundOutputSelection("headphones")).toEqual({
      id: DEVICES[0].deviceId,
      label: DEVICES[0].label,
    });

    step.querySelector<HTMLButtonElement>(".btn-success")!.click();
    await expect(done).resolves.toBe(true);
  });

  it("bark test button routes the sound to the row's selected device", async () => {
    const reader = mkReader({
      needSoundOutput: ["headphones"],
      _needSoundOutput: [""],
    });
    const done = runSoundOutputSelectionStep({ paramReader: reader, rc });
    await flush();

    const step = $("[data-ee-sound-output-step]")!;
    const select = step.querySelector("select")!;
    select.value = DEVICES[1].deviceId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();

    const sinkSpy = HTMLMediaElement.prototype.setSinkId as jest.Mock;
    const playSpy = HTMLMediaElement.prototype.play as jest.Mock;
    step
      .querySelector<HTMLButtonElement>("button[data-ee-sound-output-test]")!
      .click();
    await flush();
    expect(sinkSpy).toHaveBeenCalledWith(DEVICES[1].deviceId);
    expect(playSpy).toHaveBeenCalled();
    // Sink BEFORE play.
    expect(sinkSpy.mock.invocationCallOrder[0]).toBeLessThan(
      playSpy.mock.invocationCallOrder[0],
    );

    step.querySelector<HTMLButtonElement>(".btn-success")!.click();
    await expect(done).resolves.toBe(true);
  });

  it("Quit resolves false (participant cannot provide a needed device)", async () => {
    const reader = mkReader({
      needSoundOutput: ["headphones"],
      _needSoundOutput: [""],
    });
    const done = runSoundOutputSelectionStep({ paramReader: reader, rc });
    await flush();

    const step = $("[data-ee-sound-output-step]")!;
    const select = step.querySelector("select")!;
    select.value = "none";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    $<HTMLButtonElement>("button[data-ee-sound-output-quit]")!.click();
    await expect(done).resolves.toBe(false);
    expect(soundOutputSelectionsLocked()).toBe(false);
  });

  it("shows RC_AddDevice and the RC_WarningUseRightKindOfDevice caution below the rows", async () => {
    const reader = mkReader({ needSoundOutput: ["headphones"] });
    const done = runSoundOutputSelectionStep({ paramReader: reader, rc });
    await flush();

    const step = $<HTMLElement>("[data-ee-sound-output-step]")!;
    // "Add any missing device by connecting it to this computer."
    expect(step.textContent).toContain(
      "Add any missing device by connecting it to this computer",
    );
    // The wrong-kind caution — now the real translated phrase (v42+).
    expect(step.textContent).toContain("invalidates the whole session");
    // Both appear AFTER the selection rows.
    const rows = [...step.querySelectorAll("[data-ee-sound-output-row]")];
    const note = step.querySelector("[data-ee-sound-output-note]")!;
    for (const r of rows)
      expect(r.compareDocumentPosition(note)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    $<HTMLButtonElement>(
      "button[data-ee-sound-output-proceed], button.btn-success",
    )!.click();
    await expect(done).resolves.toBe(true);
  });

  it("localizes the [[KKK]] kind name and the None-warning to the chosen language", async () => {
    const reader = mkReader({ needSoundOutput: ["headphones"] });
    const done = runSoundOutputSelectionStep({
      paramReader: reader,
      rc: { language: { value: "ar" } } as any,
    });
    await flush();

    // Select None → the RC_NeedOutputDevice warning renders, with [[KKK]]
    // filled by the translated RC_Headphones phrase (v42+), not English.
    const step = $<HTMLElement>("[data-ee-sound-output-step]")!;
    const select = step.querySelector("select")!;
    select.value = "none";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    const warning = $<HTMLElement>("[data-ee-sound-output-warning]")!;
    expect(warning.textContent).toContain("سماعات الرأس");
    expect(warning.textContent).not.toContain("headphones");

    // Restore a device to unlock Proceed and close the step.
    select.value = "sim-output-airpods";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    $<HTMLButtonElement>(
      "button[data-ee-sound-output-proceed], button.btn-success",
    )!.click();
    await expect(done).resolves.toBe(true);
  });
});
