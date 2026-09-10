# EasyEyes color pipeline — photometer test protocol

Scientific validation of the three screen color parameters —
`_screenColorSpace`, `_screenFloat16Bool`, `_screenDitherBool` — with a
Cambridge Research Systems ColorCAL, oriented toward their intended use:
**text legibility research** (effect of foreground and background color on
legibility). Movie appears only as a plumbing check (Test 8).

Read this together with:

- `psychojs/src/util/ColorPipeline.js` — what the pipeline actually does.
- `components/colorPipelineProbe.js` — the measurement hooks used here.
- `tests/e2e/color-pipeline.e2e.test.ts` — the automated (drawing-buffer)
  half of this protocol. Those tests already prove, on every run: requested
  vs achieved reporting is truthful; URL switches cannot leak into
  participant runs; sub-LSB color survives to a float16 buffer for both
  background and text ink; dither's temporal mean lands between 8-bit codes
  while an undithered control quantizes; blackout detection still works
  under dither; filters run at device resolution.

**What the automated tests cannot see** — and what this protocol measures —
is everything after the drawing buffer: the OS compositor's ICC transform,
the cable, the panel's own bit depth and dithering. The photometer is the
only ground truth for _light_.

## 1. Apparatus and setup

- **Photometer**: CRS ColorCAL (USB). EasyEyes drives it over Web Serial
  (`components/ColorCAL.js`): it reads the factory calibration matrix
  (`r01`–`r03`) and issues `MES` readings, returning CIE X, Y, Z. It does
  NOT perform a zero (dark) calibration; if CRS's documentation for your
  unit calls for one, run it in CRS's own software first.
- **Picking the port**: the browser's chooser does not show the ColorCAL
  by name. On Windows it is the generic **"USB Serial Device (COMn)"**
  (USB vendor id `0861` = Cambridge Research Systems); on macOS a
  **"usbmodem…"** port. Chrome console lines about Bluetooth devices
  "blocked by the Serial blocklist" (headphones, game controllers) are
  harmless noise. If no USB serial entry appears at all, Windows has not
  bound a serial driver to the device — reconnect the cable, try another
  USB port, or install the CRS driver — and make sure no other program
  (CRS software, another browser tab) holds the port.
- **Instrument settling**: the ColorCAL is a slow, precise instrument. For
  readings unaffected by the previous level, allow **5 s** of settling at
  each new level before reading (the sweeps below default to
  `settleSec: 5`).
- **Positioning**: lay the laptop screen on its back and rest the photocell
  gently on the center of the screen. Ambient light then barely matters,
  but a dim room is still better, especially for dark levels.
- **Display state** (record all of this in your lab notebook; it defines
  the measurement):
  - Warm up the display ≥ 30 min.
  - Disable auto-brightness, True Tone / Night Shift / f.lux, and any
    "dynamic contrast". Fix the brightness slider and never touch it
    between calibration and study.
  - Note the OS display profile (ICC) in use; the browser converts the
    tagged canvas to exactly this profile.
  - Note `devicePixelRatio`, refresh rate, and whether the panel is
    wide-gamut (`__EEcolorProbe.report()` gives `displayP3Gamut`).
- **Browser**: Chrome or Edge. Web Serial requires Chromium. The float16
  backbuffer (`_screenFloat16Bool`) requires Chromium ≥ 122; the probe's
  `report()` tells you truthfully whether each request was achieved.
- **Launching an instrumented run**: compile any example, serve the repo,
  and open it with the probe plus the pipeline configuration under test.
  URL overrides of `_screen*` are honored ONLY while instrumentation
  (`?colorPipelineProbe` or `?colorPipelineLog`) is active, so one compiled
  experiment can serve every configuration:

```sh
  npm run example -- Test-colorLegibility.xlsx
  npx vite            # serves the repo at http://localhost:5500
```

Then open, e.g.:

```
  http://localhost:5500/examples/generated/Test-colorLegibility/index.html?colorPipelineProbe=1&_screenFloat16Bool=TRUE&_screenDitherBool=TRUE
```

Wait for the console line `[EasyEyes color pipeline] probe installed`,
then drive everything from the DevTools console via
`window.__EEcolorProbe`. Start every session with:

```js
__EEcolorProbe.report();
```

and confirm `applied`, `float16Backbuffer`, `dither`, `floatColorPath`
match what you requested, with `failures: []`. **A session whose report
does not match its intended configuration is invalid** — the report is
also written to the results CSV (`screenColorPipeline` column) so this
check can be repeated at analysis time for real study sessions.

**When to run sweeps**: while the app is idle, waiting for input — a
block-instructions page is ideal. The sweep hides the app's canvas stims
and drives the screen itself; an idle app won't interfere, and the
pipeline state is identical to trials (it is fixed at window creation).
Do NOT sweep during trials: the trial machinery rewrites the background
color (per-condition `screenColorRGBA`) and spawns stimuli mid-sweep,
which would fight the sweep's own presentation. Leftover DOM chrome (the
Proceed button, counters) is not hidden, but the photocell rests ON the
screen and sees only the panel area under its aperture, so UI at the
screen edges cannot reach it.

### No-console workflow: `_screenColorCheckBool`

The console commands above remain the full-control path, but the common
tests also run from an **in-app test page**
(`components/colorPipelineTestPage.js`): set the experiment-wide parameter
`_screenColorCheckBool` to TRUE (or, for experiments compiled
before the glossary gained it, append
`?_screenColorCheckBool=TRUE` to the URL). The page appears after
the compatibility page and RC calibration, before the first block. It:

- exits fullscreen and offers a **Connect ColorCAL** button (Web Serial
  chooser — the device is "USB Serial Device (COMn)" / "usbmodem…");
- draws a dashed square at the screen center marking where the photocell
  must rest; the square disappears while a test runs;
- runs **opt-in tests, one button each** — currently Test 3 (effective
  bit depth for text contrast steps), Test 6 (chromatic pairs &
  color-space tagging), and Test 9 (transfer function & the visual
  display-precision test's step series on black vs. the gray pedestal) —
  with editable, explained parameters (background, number and size of
  steps, colors, base levels, readings per level, settle time);
- after each run downloads a **zip**: the raw `colorcal-*.csv` plus a
  self-contained `report.html` with the pipeline configuration, the
  parameters used, titled and axis-labeled plots (luminance staircase
  for Test 3; a CIE chromaticity diagram with sRGB/P3 triangles for
  Test 6; transfer function, per-base step increments, and normalized
  steps for Test 9), and a glossary of every CSV column.

The page tests whatever pipeline the experiment booted with. Because the
parameter implies instrumentation mode, the `_screen*` URL overrides are
honored, so control configurations are one reload away, e.g.
`?_screenDitherBool=FALSE&_screenFloat16Bool=FALSE` for Test 3's
dither-OFF control, or `?_screenColorSpace=display-p3` for Test 6's
second tagging. New tests are added by appending to the `TESTS` registry
in `colorPipelineTestPage.js`.

### The three sweep instruments

| Instrument                                            | What it presents                                                                                                    | Driven by                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `__EEcolorProbe.photometer({levels})`                 | full-screen uniform levels                                                                                          | any photometer, SPACE advances |
| `__EEcolorProbe.measureBackgroundWithColorCAL({...})` | full-screen levels through the real float-background path                                                           | ColorCAL, automatic            |
| `__EEcolorProbe.measureTextWithColorCAL({...})`       | a real `visual.TextStim` (the class that draws letter, rsvpReading, and reading stimuli) with per-step fg/bg colors | ColorCAL, automatic            |

Both ColorCAL sweeps keep a render loop alive so the dither noise field
advances **every frame** (per-pixel temporal unbiasedness — see "Why there
is no frozen-frame photometer control" under Test 3), settle `settleSec`
per step, take `samplesPerLevel` XYZ readings, and save one CSV row per
reading to Downloads:

- `colorcal-background-*.csv`: `step, sample, requestedR/G/B, requestedR8Bit, bufferMeanR/G/B, bufferMinR, bufferMaxR, distinct8BitLevels, nits, X, Y, Z, xChroma, yChroma, timeSec`
- `colorcal-text-*.csv`: `step, sample, fgR/G/B, bgR/G/B, bufferPeakR/G/B, bufferMeanR/G/B, distinct8BitLevels, nits, X, Y, Z, xChroma, yChroma, timeSec`

The buffer columns tie every photometer reading to what the drawing buffer
held at that moment — when a test fails, they tell you which side of the
compositor lost the information.

The first ColorCAL call prompts for the serial port (pick the ColorCAL).
Do not combine probe sweeps with an experiment that itself connects the
ColorCAL (`measureLuminance=measure`): the port supports one reader.

### General measurement policy

- Repeat every sweep **3×**, and run one repetition in reversed level
  order to expose drift/hysteresis. Report per-level mean ± SD.
- Never accept a single anomalous reading: re-seat the photocell and
  re-measure before believing it.

## 2. The tests

### Test 1 — Display transfer function (baseline, pipeline OFF)

Open with `?colorPipelineProbe=1` and no `_screen*` overrides. Then:

```js
await __EEcolorProbe.measureBackgroundWithColorCAL({
  levels: Array.from({ length: 18 }, (_, i) => i / 17),
  samplesPerLevel: 3,
});
```

Fit `nits = a + b·level^γ`. This is the display's own transfer function
through the legacy 8-bit path; every later test is read against it.
_Accept_: smooth monotonic curve; γ typically 2.0–2.4; black level a > 0
recorded, not assumed zero.

### Test 2 — Text-path transfer function

Same URL, add `&_screenFloat16Bool=TRUE&_screenDitherBool=TRUE`. Sweep the
**foreground** of a solid text block over a fixed background:

```js
await __EEcolorProbe.measureTextWithColorCAL({
  pairs: Array.from({ length: 18 }, (_, i) => ({ fg: i / 17, bg: 1 })),
  samplesPerLevel: 3,
});
```

The default stimulus is a block of █ glyphs — the photocell sees
essentially pure foreground, and any row-seam coverage is a constant
factor that cancels in fits. _Accept_: the fitted curve superimposes on
Test 1 (same γ within confidence intervals; a fixed multiplicative
coverage factor is allowed). Any _shape_ difference means the text path
(white-glyph rasterization × ColorizeFilter) distorts color — a stimulus
error that would contaminate a legibility study.

### Test 3 — Effective bit depth for text contrast steps (the core claim)

The reason `_screenDitherBool` exists: legibility studies need contrast
steps finer than 1/255. Measure the same fine staircase in four
configurations:

```js
const fine = Array.from({ length: 16 }, (_, i) => ({
  fg: 0.5 + i / 1023,
  bg: 0.5,
}));
await __EEcolorProbe.measureTextWithColorCAL({
  pairs: fine,
  samplesPerLevel: 3,
});
```

| Config (URL)                                     | Expectation                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| none (8-bit baseline — THE negative control)     | staircase: ~4 flat plateaus with 1/255 jumps, at the codes rounding predicts |
| `_screenFloat16Bool=TRUE` only                   | see Test 7                                                                   |
| `_screenFloat16Bool=TRUE&_screenDitherBool=TRUE` | monotonic ramp through all 16 levels                                         |

The dither-off baseline is the decisive control: same requests, same
session, same display. If it collapses to the code plateaus while the
dithered run resolves every step, the extra resolution is attributable to
the dither and to nothing else.

**Why there is no frozen-frame photometer control.** Noisy-bit dithering
is spatio-TEMPORAL: even one frozen frame carries the sub-LSB signal in
its _spatial_ average, and a photometer aperture integrates over tens of
thousands of pixels — so freezing the frame would NOT snap the reading
back to an 8-bit level, and that is correct physics, not a failure. What
freezing breaks is _per-pixel temporal_ unbiasedness (each pixel stuck at
one code), which a large-aperture instrument on a uniform field cannot
see. That property is machine-verified instead, by the automated e2e
dither tests: a single drawing-buffer pixel must take multiple values
across 64 frames, and the noise must be independent per device pixel
(`tests/e2e/color-pipeline.e2e.test.ts`). The probe sweeps keep a render
loop alive throughout, so real presentations never freeze in practice.

**Analysis**: regress mean nits on requested value (the display is locally
linear over ±8/1023). Effective LSB = the smallest step whose luminance
increment is statistically resolvable across the 3 repeats (paired t or
just non-overlapping ±2 SD); effective bits = log₂(1/LSB*eff). Accept*:
≥ 10 effective bits with dither at 60 Hz (Allard & Faubert 2008 predict
~2–3 extra bits); Spearman ρ ≈ 1 (strict monotonicity); the dithered
temporal mean unbiased (regression intercept consistent with Test 1).

Also confirm in the CSV that `distinct8BitLevels` > 1 for dithered steps
(the noise is really straddling codes) and = 1 for the baseline.

### Test 4 — Contrast accuracy of the study's actual fg/bg pairs

For the exact pairs of the planned experiment (here, the four
`Test-colorLegibility` conditions):

```js
await __EEcolorProbe.measureTextWithColorCAL({
  pairs: [
    { fg: 0, bg: 1 }, // blackOnWhite
    { fg: 1, bg: 0.004 }, // whiteOnNearBlack
    { fg: 0.45, bg: 0.55 }, // lowContrastGray
    { fg: [0, 0, 1], bg: [1, 1, 0] }, // blueOnYellow
  ],
  samplesPerLevel: 5,
});
```

Then measure each **background alone**
(`measureBackgroundWithColorCAL({levels: [1, 0.004, 0.55, [1,1,0]]})`) and
compute measured Weber contrast `(L_text − L_bg)/L_bg` from the block-text
and background luminances. _Accept_: measured contrast within ±5% of the
value predicted from Test 1's transfer function for every pair; report the
measured contrasts in the paper rather than nominal ones.

### Test 5 — Real letters: coverage must be color-independent

The float path rasterizes glyphs **white** and applies color as a float
uniform, so the glyph texture holds only coverage. Verify with real
letters (photometer sees the space-average of ink and background):

```js
const letters = { text: "DHKNORSVZ", heightPx: 200 };
await __EEcolorProbe.measureTextWithColorCAL({
  ...letters,
  pairs: [
    { fg: 0.2, bg: 1 },
    { fg: 0.4, bg: 1 },
    { fg: 0.8, bg: 1 },
  ],
});
```

_Accept_: after subtracting the background's contribution, measured
luminance is **linear** in the foreground's linear-light value (from
Test 1) — i.e., coverage (the slope) is one constant, independent of
color. Nonlinearity here would mean color changes re-rasterize or re-blend
glyphs, making letter rendering color-dependent — fatal for a color
legibility study. The automated `measureTextInk` tests already check this
at the buffer; this repeats it in light.

### Test 6 — Chromatic pairs and color-space tagging

With the ColorCAL's XYZ output, verify `_screenColorSpace`:

```js
const primaries = [
  { fg: [1, 0, 0], bg: 0 },
  { fg: [0, 1, 0], bg: 0 },
  { fg: [0, 0, 1], bg: 0 },
];
// Run once with &_screenColorSpace=srgb and once with display-p3
await __EEcolorProbe.measureTextWithColorCAL({
  pairs: primaries,
  samplesPerLevel: 3,
});
```

_Accept on a wide-gamut (P3) display_: sRGB-tagged red measures near sRGB
red chromaticity (x, y ≈ 0.640, 0.330); display-p3-tagged red moves toward
P3 red (≈ 0.680, 0.320); green and blue shift analogously.
_Accept on an sRGB-limited panel_: both taggings land on the panel's own
primaries (the tag cannot add gamut).
_Negative control (both panels)_: achromatic fields (R=G=B) must measure
identical Y and chromaticity under both taggings — the two spaces share
white point and transfer function, which is why grayscale experiments are
unaffected by the tag.

### Test 7 — Float16 alone: what does the compositor deliver?

`_screenFloat16Bool=TRUE`, dither OFF, fine staircase from Test 3. The
buffer verifiably holds sub-LSB values (automated tests prove it; the
CSV's `bufferMeanR` shows it). The open question is physical: does the OS
compositor/scanout preserve more than 8 bits from an RGBA16F buffer?

_Expected on common 8-bit panels_: an 8-bit staircase — which is exactly
why `_screenDitherBool` exists. _On a 10-bit-effective pipe_ (some
Macs/EDR, 10-bit external monitors, and 8-bit panels whose scaler runs
FRC): finer steps. Native depth vs FRC is indistinguishable from here and
does not matter for experiments — what matters is the **effective
luminance precision**, which this test measures. The browser can only
supply hints, which `report()` now includes (`screenColorDepth`,
`minColor10Bits`, `dynamicRangeHigh`): treat them as context, never as a
measurement — `screen.colorDepth` may report 24 regardless, and
`(min-color: 10)` cannot distinguish native 10-bit from FRC.

**Sizing the dither to what you find.** The noisy-bit rule: the dither
amplitude (`ditherLsb` in `ColorPipeline.js`, compiled default 1/255)
must equal the **output pipe's own quantization step** — 1/255 on an
8-bit-effective pipe, 1/1023 on a 10-bit-effective pipe. The reward is
then ~2–3 further bits of _effective_ precision (≈1/1023 steps from an
8-bit pipe, ≈1/4095 from a 10-bit pipe). Do not set the amplitude to the
_target_ precision: noise narrower than the pipe's quantizer (e.g.
±0.5/4095 into a 1/1023 quantizer) leaves most values snapping
deterministically to the nearest code — biased means, banding back. And
oversizing (1/255 noise on a 10-bit pipe) stays unbiased but adds 4×
more noise than needed.

**Visual display-precision test (automatic).** The sizing above now
happens per session, without a photometer, controlled by the
experiment-wide parameter `_screenMeasurePrecision` (default
`assume8Bit` = no test, keep the 1/255 default; `test1Digit` = one digit
per precision; `test2Digits` = two digits per precision, cutting the
per-level guessing rate from 10% to 1%).
`components/displayPrecisionTest.js` runs the participant-facing check
after the compatibility page, RC calibration, and sound calibration,
before the first block (and before the `_screenColorCheckBool` ColorCAL
page, which therefore tests the final configuration). It **requires a real
float16 (RGBA16F) drawing buffer** and refuses to run without one (records
`displayPrecisionValid=false`, keeps the 1/255 default): on an 8-bit buffer
the sub-8-bit digit steps would be quantized in the browser's own backbuffer
before reaching the display, so the test would characterize the buffer, not
the panel. That is enforced two ways — a compile-time check
(`_screenMeasurePrecision` test modes require `_screenFloat16Bool=TRUE`) and
the runtime guard (Safari/Firefox/old Chrome can request float16 but not
achieve it). When it runs, with OUR dither suspended — it would synthesize
the very steps being measured (you'd be re-running Test 3) — and float16
carrying values intact through every chokepoint we control, it shows a
number in 72 pt bold Arial, fading from left to right: each precision level
contributes 1 or 2 digits, each drawn one code-LSB — 1/127 (7 bit), 1/255
(8), 1/511 (9), 1/1023 (10), 1/2047 (11), 1/4095 (12) — **above a gray
pedestal**, NOT on true black. The pedestal is the fix for the
profile/black-level dependence: near black those code steps are a minuscule
amount of light whose visibility is dominated by the panel's black level, ICC
profile, and room reflections (a true-black laptop shows nothing; a
mismatched profile lifts the shadows), whereas on an above-toe pedestal
the same code step lands on a steeper, consistent part of the transfer curve
and stays visible on any display. The pedestal is the experiment-wide
parameter `_screenMeasurePrecisionBackground` (default 0.3333, which the
buffer holds as **float16(1/3) = 0.333251953125 exactly**; the value used
is recorded as `displayPrecisionBackground` and in the result JSON, with
`pedestalOnCodeGrid`): a depth-b pipe outputs round(v·(2^b−1)), so the
pedestal must sit ON the pipe's code grid at every plausible depth — the
multiples of 1/3 are the only above-black values on the grid of every even
bit depth (3 divides 2^b−1 for even b), and the compiler cautions about any
other value. A mid-code pedestal silently inflates the reading: the first
cut (0.08 = 20.40 in 8-bit codes, 0.096 codes below the rounding boundary)
promoted the 9-, 10-, and 11-bit digits to full-code jumps on a pure 8-bit
pipe, making an 8-bit display read as 10-bit-effective — Test 9 measured
exactly that on the Windows laptop. Optional **flicker**
(`_screenMeasurePrecisionFlickerBool`, default FALSE;
`_screenMeasurePrecisionFlickerHz`, default 8 complete cycles per second,
at most 30): each digit's color is exchanged with its background's
repeatedly — the ordinary display alternating with a step-colored cell
holding a pedestal-colored digit — since sensitivity to an edge is highest
for contrast that alternates at a few Hz, so fainter steps may become
reportable. Swaps are frame-quantized; the achieved rate is recorded as
`displayPrecisionFlickerHz` (and `flicker.hzMeasured` in the JSON). It still measures a code-space step (what the dither
operates on): `test1Digit` shows 6 digits (typically 4 visible on a
10-bit-effective pipe), `test2Digits` 12 (typically 8). If the pipe resolves
a code step of size v the digit separates from the pedestal (by exactly one
output code, since the pedestal is on the grid); otherwise it quantizes back
to the pedestal and vanishes — so every digit is visible or absent, fading
monotonically left-to-right. A dithered/FRC pipe instead renders every step
faithfully on average and the fade is governed by contrast sensitivity —
either way the faintest fully-reported level bounds the effective precision
from below (perceptual ceiling ~10–11 bits at this pedestal: the 10-bit
step is ~0.6% Weber contrast). The participant copies the fading
number into a same-size same-font box (translated instructions:
`EE_typeNumberToMeasurePrecision`; on-screen clickable digits 0…9 and a ⌫
button support non-Latin keyboards; digits are LTR in every language).
Correctly reporting all digits of a level sets a LOWER BOUND on the display's
effective precision — deliberately agnostic about whether that precision comes
from a native ≥10-bit panel or an 8-bit panel with FRC, which is
indistinguishable from here and irrelevant to dither sizing.
`ColorPipeline.setDitherLsb()` then pins the amplitude to the faintest
fully-reported level's step (fallback 1/255 when no level is reported) and
dither resumes. Results CSV: `displayPrecisionValid`,
`displayPrecisionBackground`, `displayPrecisionFlickerBool`,
`displayPrecisionFlickerHz` (achieved rate),
`displayPrecisionTargetString`, `displayPrecisionResponse`,
`displayPrecisionDigitsCorrect`, `displayPrecisionBits`,
`displayPrecisionLsb`, `screenDitherLsb`, the full `displayPrecisionTest`
JSON (which also records the `pedestal`), plus — for EVERY experiment, tested
or not — the browser hints `reportedRGBBits` (= `screen.colorDepth`),
`reportsAtLeast10BitsPerChannel` (= `(min-color: 10)`), and
`reportsHDRCapability` (= `(dynamic-range: high)`); treat the hints as
context, never as a measurement. For claims beyond the digit test, let the
photometer adjudicate (observer contrast thresholds become the ceiling); the
fine staircase of this Test 7 remains the ground truth.

### Test 8 — In-experiment plumbing: `measureLuminance` (movie only)

`measureLuminance` (off | measure | pretend) samples the
ColorCAL **during stimulus presentation**, currently for
`targetKind=movie` only. It is the workflow check that the in-experiment
photometry machinery works; it does not exercise the text pipeline (the
movie plays in an HTML `<video>` element that bypasses it — see Caveats).

Use `examples/tables/Test-measureLuminance.xlsx`:

- **Block 1** (`measureLuminance=pretend`): no hardware; every reading is
  −1. Verify timing: `luminance-*.csv` appears in Downloads after each
  trial with `frameTimeSec` and `luminanceTimeSec` both stepping 0…10 s.
- **Block 2** (`measureLuminance=measure`): 11-step gray ramp, 6 s per
  frame (`movieHz=measureLuminanceHz=1/6`), first reading 5 s after step
  onset (`measureLuminanceDelaySec=5`). Verify the luminance column
  reproduces Test 1's transfer function at the movie's gray levels.

CSV columns: `frameTimeSec, movieValue, luminanceTimeSec, luminanceNits`.
The two time columns align only when `measureLuminanceHz == movieHz`.

### Test 9 — Transfer function & the precision steps: black vs. gray pedestal (in-app)

The photometric counterpart of the visual display-precision test (Test 7,
`_screenMeasurePrecision`): it measures, in light, exactly the codes that
test draws its digits at, and so demonstrates the three facts the test's
design rests on — (a) near black, a code step is a minuscule amount of
light whose size depends on the display and its ICC profile, so digits
on black come and go with the profile; (b) on the gray pedestal the same
code step is a fixed few percent of a comfortable luminance; (c) a pipe
that quantizes to 8 bits resolves NO sub-8-bit step at a base that sits
on its code grid (black, 1/3), but at a mid-code base it promotes them to
whole codes — the artifact that made an 8-bit laptop read as 10-bit when
the pedestal was 0.08.

**Run it** from the `_screenColorCheckBool` page: connect the ColorCAL,
fill **Run label** with the OS display profile in use (e.g. `Color LCD`),
and press Run on "Transfer function & precision steps". Defaults: an
11-level uniform ramp 0→1; base levels `0` (black), `0.333251953125`
(= float16(1/3), the visual test's pedestal — code 84.98 of 255 and
340.92 of 1023, i.e. on both grids) and `0.08` (the first-cut pedestal,
code 20.40 of 255 — mid-code); EasyEyes' dither **suspended** for the run
(as the visual test does — set the field to `on` for a dither control);
3 readings per level; 5 s settling; about 5–6 min. Then change the OS
display profile (macOS: System Settings → Displays → Color profile; try
`Adobe RGB (1998)`), reload, and run again with that profile as the run
label. The test requires the float16 backbuffer (`_screenFloat16Bool=TRUE`,
Chromium ≥ 122); without it the report carries a red warning, because the
sub-8-bit codes would then be quantized in the browser's own buffer.

**What it presents.** Every level is a text-path █ block (as in Test 3)
whose foreground is `base + step` on a background of `base` — the geometry
of a digit on its pedestal; the photocell sees the "digit ink". For each
base: the base alone, then `1/4095, 1/2047, 1/1023, 1/511, 1/255, 1/127`
added to it (faintest first, so each series ascends). The transfer ramp
uses `fg = bg = code` (a uniform field).

**Report** (`colorcal-test9-transferFunction-<label>-*.zip`):

- _Transfer function_ plot and table, with the fit `nits = a + b·code^γ`
  (a = measured black level). Expect γ ≈ 2.0–2.4 and a > 0; the curve's
  flattest part is at black, which is the whole problem with black-based
  digits.
- _Light added by each step, per base_ (Δ nits vs the base alone). From
  the sRGB curve, on black the 1/127 step is ≈ 1/1640 of white and the
  1/255 step ≈ 1/3300 (a few tenths of a nit on a laptop); on the 1/3
  pedestal the base is ≈ 9% of white and the 1/255 step adds ≈ 2.4%
  (Weber), 1/127 ≈ 4.9%.
- _Each step in units of the 1/255 step at the same base_ — the
  quantization fingerprint, with the ideal `255 × step` line
  (0.06, 0.12, 0.25, 0.50, 1, 2.01):

  | pipe                                                | base on the grid (black, 1/3) | mid-code base (0.08)                                                        |
  | --------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
  | finer than 8 bits, or dithered (FRC, driver, macOS) | ≈ ideal, proportional         | ≈ ideal                                                                     |
  | pure 8-bit quantizer                                | 0, 0, 0, 0, 1, 2              | **1, 1, 1, (1), 1, 2** — sub-8-bit steps emit a whole code: false positives |

- _Reading_: auto-generated bullets in the run's own numbers (black vs
  pedestal light per step; a per-base verdict; the profile-comparison
  instruction). The verdict rests on the two largest sub-8-bit steps —
  1/511 (0.50 of an 8-bit step) and 1/1023 (0.25): "finer than 8 bits"
  needs both resolved and proportional; "full 8-bit jump" flags the
  mid-code artifact; "8-bit pipe" means 1/511 is absent where a fine pipe
  would have shown it clearly (marginal ~2 SE detections of the tiny steps
  are named as noise/drift); and two guards keep dim bases honest — "below
  noise floor" when not even the 1/255 step resolved (black, typically),
  "inconclusive" when a fine pipe's 1/511 increment would itself be within
  the noise there.

**Across profiles.** Compare the two reports' black rows against their
pedestal rows. A pure-power-law profile such as Adobe RGB (1998) makes
macOS send the panel ≈ 8.8/255 for our 1/127 code, 6.4/255 for 1/255,
4.7/255 for 1/511 — a 4–30× lift that turns sub-8-bit codes into ordinary
8-bit ones (so a "9-bit" visual result under that profile measured the
profile's arithmetic, not the panel) — while the pedestal itself moves by
< 1 code (84.98 → 85.69) and every step shrinks by ≈ 5%. That contrast is
the demonstration.

_Accept_: (a) pedestal rows: the 1/255 and 1/127 steps resolved (Δ > 2 SE)
under every profile, changing by only a few percent between profiles;
(b) black rows: Δ small in absolute terms and profile-dependent between
runs; (c) at the 1/3 base, sub-8-bit steps either unresolved (8-bit pipe)
or proportional (finer/dithered pipe) — never whole-code jumps; at 0.08
on an 8-bit pipe, whole-code jumps. Caveats: the photocell rests on the
screen and so excludes room light — Weber contrast at black therefore
overstates real-room visibility; argue the near-black case from absolute
Δ nits. On OLED/local-dimming panels the base field itself changes the
panel's state; note the display type. CSV adds `series`, `baseCode`,
`stepCode`, `stepLabel` to the `colorcal-text` schema.

---

## 3. Caveats that bound any conclusions

1. **Movie bypasses the pipeline.** Movies are H.264/HEVC in a `<video>`
   element, not the WebGL canvas: `_screen*` parameters do not apply to
   them. Text (letter, rsvpReading, reading) is rendered by
   `visual.TextStim` through the pipeline — text is both the research
   target and the valid test target.
2. **Ordinary** `reading` **takes its text color from** `markingColorRGBA`**,**
   not `fontColorRGBA` (`components/readingAddons.js`, `_spawnStims`).
   `letter` and `rsvpReading` use `fontColorRGBA`. Until that is unified,
   a reading condition's foreground color must be set via
   `markingColorRGBA` — which also colors fixation marking. Budget for
   this in table design, or ask for the one-line change (it alters
   existing experiments' behavior, so it is deliberately not snuck in).
3. **Instructions are HTML nodes,** not canvas: `instructionFontColorRGBA`
   goes through CSS, not the pipeline. Fine for instructions; never use
   HTML text as a stimulus.
4. **Dither LSB defaults to 1/255 and can be measured per session.**
   When `_screenMeasurePrecision` is `test1Digit` or `test2Digits`, the
   visual display-precision test (Test 7 above;
   `components/displayPrecisionTest.js`) measures the session's
   effective precision at startup and sets the LSB (1/127…1/4095)
   accordingly; `screenDitherLsb` in the results CSV records what was
   in force. With the default `assume8Bit`, or when a participant
   reports no digits, the 1/255 default stands.
5. **The ICC profile is part of the stimulus.** The browser converts the
   tagged buffer to the OS display profile. Changing the profile (or
   letting the OS switch it) changes the light. Record it; re-verify after
   any OS/browser update — rerun Tests 2 and 3 as a 10-minute smoke check.
6. **One serial reader at a time**: don't mix probe sweeps and
   `measureLuminance=measure` in the same page session.

---

## 4. From verification to the legibility study

The compiled skeleton is `examples/tables/Test-colorLegibility.xlsx`
(4 conditions: black-on-white, white-on-near-black, low-contrast gray,
blue-on-yellow; `_screenFloat16Bool` and `_screenDitherBool` ON; near-black
0.004 instead of 0 because the compiler rightly refuses backgrounds that
defeat blackout detection). Design notes for the real study:

- **Dependent measures.** Foveal acuity (`thresholdParameter= targetSizeDeg`, brief letters — the skeleton), and/or peripheral
  crowding (`spacingDeg`), and/or reading: ordinary `reading` for
  reading speed, `rsvpReading` for RSVP thresholds. Acuity and crowding
  give clean Quest thresholds; reading speed is the ecologically relevant
  endpoint. Measuring two of these on the same fg/bg pairs is a strong
  design (mechanism + application).
- **Contrast series, not just extremes.** The scientific payoff of dither:
  present text Weber contrasts in fine steps (e.g. 10 log-spaced values
  from 0.005 to 1.0 around a mid-gray background) — steps far below one
  8-bit code — and measure threshold vs contrast per color pair.
  Photometer-verify every planned pair with Test 4 **before** data
  collection, and report measured (not nominal) contrasts.
- **Isoluminant chromatic pairs.** For chromatic (e.g. blue-on-yellow)
  conditions, use ColorCAL Y readings to titrate the pair to equal
  luminance (or to a fixed luminance ratio); the pipeline's fine steps
  make the titration precise. Note that individual isoluminance differs
  from photometric; treat photometric isoluminance as the controlled
  variable.
- **Polarity and adaptation controls.** Dark-on-light vs light-on-dark
  differ via pupil size and adaptation, independent of hue. Counterbalance
  polarity across conditions; keep each block's surround
  (`screenColorRGBA`) equal to that condition's background so adaptation
  is stable within block; allow ≥ 30 s adaptation after background
  changes (an instruction screen suffices).
- **Within-observer design.** Color pairs as blocks (adaptation), block
  order counterbalanced across observers (Latin square), ≥ 2 sessions to
  estimate test–retest reliability. With ~35 Quest trials per threshold
  and within-observer threshold SDs of ~0.05–0.1 log units, expect to
  resolve color effects of ~0.05 log units with a handful of observers ×
  repeated thresholds; pilot 2–3 observers first and compute power from
  their observed SDs rather than trusting these priors.
- **Per-session verification.** Every session's results CSV carries the
  `screenColorPipeline` JSON (requested vs achieved + failures). Reject
  sessions where it differs from the registered configuration. For
  in-lab sessions, a 5-minute Test 4 spot check (the study's pairs,
  `samplesPerLevel: 3`) at the start of each testing day catches display
  drift.
- **Remote participants.** You cannot photometer their screens. The
  defensible claim structure is: (a) in-lab, photometer-verified
  characterization of the stimulus (this protocol); (b) remote data with
  the per-session `screenColorPipeline` report, `_needBrowser` gating,
  and the automated capability checks; (c) analysis excluding sessions
  whose reports show failures. For contrast-critical remote work, keep
  contrasts ≥ a few 8-bit LSBs or require dither-capable browsers.

---

## 5. Records to keep per apparatus

One row per (display × OS × browser version × profile): date, Test 1 γ and
black level, Test 3 effective bits (dither on/off), Test 6 primaries
(both taggings), Test 7 verdict, Test 9 step light at black vs. pedestal
and its quantization fingerprint, ambient conditions. Re-measure after any
change to the row's identity. These records are what turns "the code is
correct" into "the stimulus was what the paper says it was."
