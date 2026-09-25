# Interaction coordinator — phase one

This is an isolated core in EasyEyes. **No production module imports it.** It
does not install listeners, control progression, change popups, acquire devices,
or fix the existing pause/resume bugs. Remote Calibrator is unchanged.

EasyEyes will eventually create one instance per study session. A future adapter
will translate RC lifecycle notifications into events. RC must not import this
module or instantiate a competing coordinator. Production integration and
observation logging are deliberately outside this change.

## Model

| State               | Meaning                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| `lifecycle`         | Active → ending → ended. No restart within a session.                     |
| `scopes`            | Nested participant interaction owners. A child returns to its parent.     |
| `coverage`          | Unknown until the future adapter establishes complete lifecycle coverage. |
| `camera`            | Observed device status, independent of the page being displayed.          |
| `recovery`          | Token-scoped recovery interaction, including retry and UI cleanup.        |
| `fullscreen`        | Observed browser state.                                                   |
| `fullscreenIntents` | Independent operations that intentionally release fullscreen.             |
| `interruptions`     | Independently acquired reasons; resolving one cannot resolve another.     |

Scopes model participant interaction, not background tracking. Pauses and recovery
do not replace the scope stack. `currentScope()` returns null if coverage is
unknown or the stack is empty; never interpret null as EasyEyes ownership.
Scopes retained while coverage is unknown are historical observations, not authority.

Recovery starts at `awaiting-resume`, advances to `attempting`, then `settling`
or `retry`. Retry returns to attempting. Settling can return to retry if cleanup
or reconnection fails. Completion requires settling and a ready camera;
cancellation/failure can end any recovery phase. Camera readiness alone never
closes recovery or removes interruptions. The future adapter must report cleanup
completion explicitly and validate this proposed model against real RC flows.

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
  A future adapter must validate versions, coverage and event order. Raw camera
  and fullscreen events must describe current observations; async recovery results
  use their operation token. Merely declaring coverage known does not verify it.
- This core does not decide whether Resume is safe, enforce one popup, restore
  DOM, or preserve a pending participant promise. Those require lifecycle coverage,
  host policy, resource cleanup and a dedicated interruption presenter in later phases.

## Verification

Run from the EasyEyes repository:

```sh
npm test -- --runInBand --runTestsByPath tests/interactionCoordinator.test.ts
npm run check:ts
```

The tests exercise nested ownership, simultaneous interruptions, stale callbacks,
camera/UI lifetime separation, termination, unknown coverage and observer ordering.
They model the reported failure sequences without claiming browser-level fixes.
Before runtime integration, add adapter/RC contract tests and compare existing
flows with observation off/on, including glasses Proceed, Choose Camera, actual
sleep/wake, fullscreen denial, Quit and recalibration's existing block restart.
