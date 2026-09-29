# Interaction coordinator — managed interruptions

The adapter observes RC lifecycle reports, browser fullscreen state, pause
lifetimes and coarse study phases. Managed coordination is enabled by default
for regular study URLs in both development and production builds. The preserving
pause modal and recovery policy do not require a query parameter.

EasyEyes creates one instance per study session. RC does not import this module.
No trace is uploaded or persisted.

## Enable and inspect

Use the regular study URL. During development only, `interactionMode=observe`
records lifecycle events while keeping legacy pause behavior, and
`interactionMode=off` disables the coordinator for comparison.
`interactionMode=manage` is still accepted but is now redundant.
Production builds ignore these comparison overrides and always use managed
coordination. In the browser console, inspect:

```js
window.__easyEyesInteraction.getSnapshot();
window.__easyEyesInteraction.getTrace();
```

This read-only surface contains at most 128 immutable trace entries, fixed
lifecycle labels, relative times, and local operation IDs. It contains no study
answers, camera identifiers, or URLs. Repeated phase observations and per-frame
routine stamps do not add trace entries. Reload to start a fresh observation
session after Quit, navigation (including a page restored from browser cache),
or a development hot reload.

**RC build requirement:** `index.html` currently loads RC 0.9.162 from the CDN.
That build predates the lifecycle API. To observe RC, use a locally rebuilt RC
bundle containing the phase-two changes (including its WebGazer source changes)
in your browser test setup. This change does not publish RC or replace the CDN
version. With an older build, `remoteCalibrator.connection` is `unavailable`
and its reason is `unsupported-api`; the study still runs normally.

## Managed pause behavior

- `pausePolicy.ts` uses positive evidence of recovery and intentional exits.
  Empty RC scopes still do not establish EasyEyes ownership. Unknown coverage
  uses the preserving modal as well; it never selects a destructive fallback.
- `pauseController.ts` owns the pending fullscreen interruption. Camera recovery
  takes priority and dismisses only the host modal. It waits for recovery's UI
  cleanup, not merely camera readiness, before offering fullscreen Resume again.
- `pausePresenter.ts` uses a native dialog (a fixed modal fallback where needed).
  It leaves SweetAlert's instance, DOM and pending continuation intact. Window
  capture, background inertness and the keypad gate block participant input to
  the underlying screen. Resume does not click that screen's Proceed button.
- Resume invokes the native fullscreen request directly on the participant's
  gesture. If denied, Resume remains available. Quit uses the existing study
  shutdown path. Generation checks invalidate stale request completions.
- The optional RC `attachInteractionHost` capability delegates fullscreen
  recovery to the host and gates RC keypad callbacks while input is blocked.
  Its disposer cannot detach a more recent host. Rebuild RC before testing.
- RC camera reconnect no longer replays `_cameraSelectionOptions`. WebGazer
  restores the stream/settings; current preview and distance-circle visibility
  remains controlled by the current page. A still-pending picker or resolution
  step retains its existing reconnect subscription. This RC correction applies
  with or without the host flag once the rebuilt RC bundle is loaded.

Browser acceptance: test Escape/Resume on Choose Camera and the glasses reminder,
fullscreen denial/retry, repeated pauses, Choose Screen, camera recovery arriving
while paused, sleep/wake in an acuity block, and Quit during a pending Resume.
Compare against `observe`. The new host modal preserves RC across fullscreen
interruptions; RC's existing internal recovery presenter still manages its own
camera-disconnect screen and any RC-specific restart behavior.

## Source boundary

`remoteCalibratorAdapter.ts` subscribes to the version-one RC API and accepts its
synchronous initial snapshot. Attachment midway through calibration or recovery
does not manufacture earlier events. `remoteCalibratorContract.ts` copies only
known fields, validates versions, IDs, enum values, bounds and event metadata.
Subsequent revisions must be consecutive; older revisions are ignored. An
invalid source, revision gap or incompatible version detaches observation and
clears its snapshot, without interfering with the study. There is no automatic
polling or inferred resynchronization.

`snapshot.remoteCalibrator` holds the RC observation separately from the managed
scope stack. RC may report multiple roots and parents waiting for child cleanup.
Those reports cannot safely be forced into a single stack, and partial coverage
must not imply EasyEyes ownership. `coverage` therefore stays `unknown`; the
managed camera/recovery fields are not inferred from this observation slot.
Read camera/recovery facts from `remoteCalibrator.snapshot`. Operation identity
is the host session ID, RC source ID, and RC operation ID together.

The fullscreen listener reports browser state only. An independently scoped
interruption records the actual EasyEyes pause popup until SweetAlert's
`didDestroy`. Fullscreen re-entry does not prematurely release that interruption.
Quit, pagehide and development disposal detach subscriptions and listeners and
end the observation session. Late RC notifications or popup callbacks cannot
revive it. RC termination alone does not terminate the host session.

## Model

| State               | Meaning                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `lifecycle`         | Active → ending → ended. No restart within a session.                                      |
| `scopes`            | Nested participant interaction owners. A child returns to its parent.                      |
| `coverage`          | Unknown until the future adapter establishes complete lifecycle coverage.                  |
| `camera`            | Managed-model device status; RC observations remain in `remoteCalibrator.snapshot.camera`. |
| `recovery`          | Token-scoped recovery interaction, including retry and UI cleanup.                         |
| `fullscreen`        | Observed browser state.                                                                    |
| `fullscreenIntents` | Independent operations that intentionally release fullscreen.                              |
| `interruptions`     | Independently acquired reasons; resolving one cannot resolve another.                      |

Scopes model participant interaction, not background tracking. Pauses and recovery
do not replace the scope stack. `currentScope()` returns null if coverage is
unknown or the stack is empty; never interpret null as EasyEyes ownership.
Scopes retained while coverage is unknown are historical observations, not authority.

Recovery starts at `awaiting-resume`, advances to `attempting`, then `settling`
or `retry`. Retry returns to attempting. Settling can return to retry if cleanup
or reconnection fails. Completion requires settling and a ready camera;
cancellation/failure can end any recovery phase. Camera readiness alone never
closes recovery or removes interruptions. These are the managed model's rules;
the observation adapter preserves RC's reported recovery directly in its own
slot, including attachment midway through retry or cleanup.

## Example (not wired into the study)

```ts
import { createInteractionCoordinator } from "./coordinator";

const sessionId = "unique-study-session";
const manager = createInteractionCoordinator(sessionId);
const unsubscribe = manager.subscribe((snapshot, change) => {
  // Initial call: current snapshot, change === null.
  // Later calls: immutable snapshots and accepted events in revision order.
});

const token = manager.issueToken();
manager.dispatch({
  sessionId,
  type: "scope.begin",
  token,
  parentToken: null,
  owner: "remote-calibrator",
  label: "choose camera",
});

// Only after this specific interaction AND its cleanup actually finish:
manager.dispatch({ sessionId, type: "scope.end", token, outcome: "completed" });
unsubscribe();
```

## Contract and boundaries

- Use a unique session ID per run. Every event carries it; wrong-session events
  are rejected. Do not attach old callbacks to a new manager with a new ID.
- Issue a token immediately before a begin event. All operation kinds share one
  positive, increasing sequence. Do not reserve tokens across asynchronous work.
  Begin events at or below the last accepted token are rejected, preventing replay.
  Tokens identify operations; they are not security credentials.
- A nested scope must name the current top scope as its parent. Ending a parent
  with active children is rejected. Complete/cancel children first. All scope
  outcomes release ownership identically; the change event retains the outcome.
- Termination clears interaction claims and rejects later operational events.
  This is bookkeeping only: the host must still cancel callbacks, dispose
  listeners, and release resources. Camera/fullscreen values remain last observations.
- `transition()` is a pure reducer. Accepted events increment revision; ignored
  events return the same snapshot and a reason, with no observer notification.
  Snapshots and delivered events are frozen. No event history is retained.
- Reentrant dispatch queues events until every current observer receives the
  current revision. Its immediate return is `{ status: "queued" }`, not acceptance.
  Ordinary dispatch returns the applied/ignored result for that event. Further
  queued events may have advanced the manager before ordinary dispatch returns.
- Observers are not awaited. Sync exceptions and async rejections are isolated
  through optional `onObserverError`. Only synchronous invocation order is
  guaranteed. Observers must not generate unbounded event loops.
- Inputs are a typed internal contract, not a runtime schema for untrusted data.
  The source adapter validates versions, coverage and event order. Raw camera
  and fullscreen events must describe current observations; async recovery results
  use their operation token. Merely declaring coverage known does not verify it.
- The core reducer remains bookkeeping only. The opt-in host policy/controller
  and presenter consume it; RC remains responsible for device recovery.

## Verification

Run from the EasyEyes repository:

```sh
npm test -- --runInBand --runTestsByPath tests/interactionCoordinator.test.ts
npm test -- --runInBand --runTestsByPath tests/remoteCalibratorAdapter.test.ts tests/interactionObservation.test.ts
npm run check:ts
```

The tests exercise nested ownership, simultaneous interruptions, stale callbacks,
camera/UI lifetime separation, termination, unknown coverage and observer ordering.
They model the reported failure sequences without claiming browser-level fixes.
For browser acceptance, compare existing flows with observation off/on, including
glasses Proceed, Choose Camera, actual
sleep/wake, fullscreen denial, Quit and recalibration's existing block restart.

## Quit and cancellation

Quit claims `status.terminated` and stops the scheduler before waiting for
saves or showing debrief. Page cleanup registered with `onStudyTermination`
settles pending waits; every continuation must check termination before advancing.
RC independently disposes its registered resources, closes its UI and stops the
camera, then publishes the terminal lifecycle event. Cleanup never calls success
callbacks. Recovery cancellation is terminal; it is not a successful camera resume.

The RC input boundary is installed before calibration listeners. During a managed
pause it admits only the host dialog; during recovery it admits the camera recovery
controls. Direct measurement and keypad handlers also check the input gate.
Skipped calibration panels do not publish a visible panel scope. Scope closure
alone must not be interpreted as successful completion of the caller's step.

The WebGazer submodule commit/pin update is deferred. The local recovery lifecycle
changes remain required for these recovery notifications in a release build.
