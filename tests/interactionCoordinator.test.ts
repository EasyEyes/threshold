import { createInteractionCoordinator } from "../components/interaction/coordinator";
import {
  createInitialSnapshot,
  currentScope,
  transition,
} from "../components/interaction/transition";
import type {
  EventPayload,
  InteractionEvent,
  Snapshot,
} from "../components/interaction/types";

function fixture() {
  const manager = createInteractionCoordinator("study-1");
  const send = (event: EventPayload) =>
    manager.dispatch({ ...event, sessionId: "study-1" });
  const beginScope = (
    owner: "easyeyes" | "remote-calibrator",
    label: string,
    parentToken: number | null = null,
  ) => {
    const token = manager.issueToken();
    expect(
      send({ type: "scope.begin", token, parentToken, owner, label }).status,
    ).toBe("applied");
    return token;
  };
  const interrupt = (
    reason: "fullscreen-lost" | "camera-unavailable" | "other",
  ) => {
    const token = manager.issueToken();
    send({ type: "interruption.begin", token, reason });
    return token;
  };
  return { manager, send, beginScope, interrupt };
}

describe("interaction coordinator: ownership and observation", () => {
  test("starts unknown and never infers ownership from missing RC events", () => {
    const { manager, send, beginScope } = fixture();
    expect(manager.getSnapshot()).toMatchObject({
      lifecycle: "active",
      coverage: "unknown",
      camera: "unknown",
      revision: 0,
    });
    beginScope("easyeyes", "block");
    expect(currentScope(manager.getSnapshot())).toBeNull();
    send({ type: "coverage.changed", coverage: "known" });
    expect(currentScope(manager.getSnapshot())?.owner).toBe("easyeyes");
    send({ type: "coverage.changed", coverage: "unknown" });
    expect(currentScope(manager.getSnapshot())).toBeNull();
  });

  test("child completion restores its parent and cannot end the parent early", () => {
    const { manager, send, beginScope } = fixture();
    send({ type: "coverage.changed", coverage: "known" });
    const host = beginScope("easyeyes", "setup");
    const calibration = beginScope("remote-calibrator", "calibration", host);
    const glasses = beginScope(
      "remote-calibrator",
      "glasses reminder",
      calibration,
    );
    expect(
      send({ type: "scope.end", token: calibration, outcome: "completed" }),
    ).toMatchObject({ status: "ignored", reason: "scope-has-children" });
    expect(currentScope(manager.getSnapshot())?.token).toBe(glasses);
    send({ type: "scope.end", token: glasses, outcome: "completed" });
    expect(currentScope(manager.getSnapshot())?.token).toBe(calibration);
    send({ type: "scope.end", token: calibration, outcome: "completed" });
    expect(currentScope(manager.getSnapshot())?.token).toBe(host);
  });

  test("rejects a scope attached to a stale or non-current parent", () => {
    const { manager, send, beginScope } = fixture();
    beginScope("easyeyes", "setup");
    expect(
      send({
        type: "scope.begin",
        token: manager.issueToken(),
        parentToken: null,
        owner: "remote-calibrator",
        label: "wrong parent",
      }),
    ).toMatchObject({ status: "ignored", reason: "parent-not-active" });
  });

  test.each(["completed", "cancelled", "failed"] as const)(
    "%s releases only that scope; late completion cannot release the next one",
    (outcome) => {
      const { manager, send, beginScope } = fixture();
      const old = beginScope("remote-calibrator", "choose camera");
      send({ type: "scope.end", token: old, outcome });
      const next = beginScope("easyeyes", "acuity block");
      expect(send({ type: "scope.end", token: old, outcome })).toMatchObject({
        status: "ignored",
        reason: "stale-token",
      });
      expect(manager.getSnapshot().scopes.map((scope) => scope.token)).toEqual([
        next,
      ]);
      expect(
        send({
          type: "scope.begin",
          token: old,
          parentToken: next,
          owner: "remote-calibrator",
          label: "replayed",
        }).status,
      ).toBe("ignored");
    },
  );

  test("simultaneous pauses and repeated reasons have independent lifetimes", () => {
    const { manager, send, interrupt, beginScope } = fixture();
    const page = beginScope("remote-calibrator", "glasses reminder");
    const escape = interrupt("fullscreen-lost");
    const camera = interrupt("camera-unavailable");
    const anotherCamera = interrupt("camera-unavailable");
    send({ type: "interruption.end", token: camera });
    send({ type: "interruption.end", token: escape });
    expect(send({ type: "interruption.end", token: escape }).status).toBe(
      "ignored",
    );
    expect(manager.getSnapshot().interruptions).toEqual([
      { token: anotherCamera, reason: "camera-unavailable" },
    ]);
    expect(manager.getSnapshot().scopes[0].token).toBe(page);
  });

  test("intentional fullscreen operations do not overwrite actual fullscreen or page ownership", () => {
    const { manager, send, beginScope } = fixture();
    beginScope("remote-calibrator", "choose camera");
    const first = manager.issueToken();
    send({ type: "fullscreen.intent.begin", token: first });
    const second = manager.issueToken();
    send({ type: "fullscreen.intent.begin", token: second });
    send({ type: "fullscreen.changed", status: "missing" });
    send({ type: "fullscreen.intent.end", token: first });
    expect(manager.getSnapshot()).toMatchObject({
      fullscreen: "missing",
      fullscreenIntents: [second],
      interruptions: [],
    });
    expect(manager.getSnapshot().scopes[0].label).toBe("choose camera");
  });

  test("recovery of a camera does not restore completed calibration UI or close recovery UI", () => {
    const { manager, send, beginScope, interrupt } = fixture();
    const calibration = beginScope("remote-calibrator", "distance calibration");
    send({ type: "scope.end", token: calibration, outcome: "completed" });
    const block = beginScope("easyeyes", "acuity block");
    const interruption = interrupt("camera-unavailable");
    const recovery = manager.issueToken();
    send({ type: "camera.changed", status: "disconnected" });
    send({ type: "recovery.begin", token: recovery });
    expect(
      send({ type: "recovery.advance", token: recovery, phase: "settling" })
        .status,
    ).toBe("ignored");
    send({ type: "recovery.advance", token: recovery, phase: "attempting" });
    send({ type: "camera.changed", status: "ready" });
    expect(manager.getSnapshot().recovery?.phase).toBe("attempting");
    expect(
      send({ type: "recovery.end", token: recovery, outcome: "completed" })
        .status,
    ).toBe("ignored");
    send({ type: "recovery.advance", token: recovery, phase: "settling" });
    send({ type: "recovery.end", token: recovery, outcome: "completed" });
    expect(manager.getSnapshot().interruptions).toHaveLength(1);
    send({ type: "interruption.end", token: interruption });
    expect(manager.getSnapshot().scopes.map((scope) => scope.token)).toEqual([
      block,
    ]);
    expect(manager.getSnapshot().recovery).toBeNull();
  });

  test("recovery can retry, fail or cancel; a late result cannot finish a newer recovery", () => {
    const { manager, send } = fixture();
    const first = manager.issueToken();
    send({ type: "recovery.begin", token: first });
    send({ type: "recovery.advance", token: first, phase: "attempting" });
    send({ type: "recovery.advance", token: first, phase: "retry" });
    send({ type: "recovery.advance", token: first, phase: "attempting" });
    send({ type: "recovery.advance", token: first, phase: "settling" });
    expect(
      send({ type: "recovery.end", token: first, outcome: "completed" }).status,
    ).toBe("ignored");
    send({ type: "recovery.end", token: first, outcome: "failed" });
    const second = manager.issueToken();
    send({ type: "recovery.begin", token: second });
    expect(
      send({ type: "recovery.end", token: first, outcome: "failed" }).status,
    ).toBe("ignored");
    expect(manager.getSnapshot().recovery?.token).toBe(second);
    send({ type: "recovery.end", token: second, outcome: "cancelled" });
    expect(manager.getSnapshot().recovery).toBeNull();
  });

  test("termination clears interaction claims and prevents late events or restart", () => {
    const { manager, send, beginScope, interrupt } = fixture();
    const page = beginScope("remote-calibrator", "calibration");
    interrupt("camera-unavailable");
    send({ type: "recovery.begin", token: manager.issueToken() });
    send({ type: "fullscreen.intent.begin", token: manager.issueToken() });
    expect(send({ type: "session.ended" }).status).toBe("ignored");
    send({ type: "session.ending" });
    expect(manager.getSnapshot()).toMatchObject({
      lifecycle: "ending",
      scopes: [],
      interruptions: [],
      recovery: null,
      fullscreenIntents: [],
      coverage: "unknown",
    });
    expect(
      send({ type: "scope.end", token: page, outcome: "completed" }).status,
    ).toBe("ignored");
    expect(send({ type: "camera.changed", status: "ready" }).status).toBe(
      "ignored",
    );
    send({ type: "session.ended" });
    const terminal = manager.getSnapshot();
    send({ type: "session.ending" });
    send({ type: "session.ended" });
    expect(manager.getSnapshot()).toBe(terminal);
    expect(() => manager.issueToken()).toThrow("no longer active");
  });

  test("session IDs prevent old callbacks from affecting a new session", () => {
    const { manager } = fixture();
    expect(
      manager.dispatch({
        sessionId: "old-study",
        type: "camera.changed",
        status: "ready",
      }),
    ).toMatchObject({ status: "ignored", reason: "wrong-session" });
    expect(manager.getSnapshot().revision).toBe(0);
    expect(createInteractionCoordinator("other").issueToken()).toBe(1);
  });

  test.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid token %s",
    (token) => {
      const { send } = fixture();
      expect(
        send({ type: "interruption.begin", token, reason: "other" }).status,
      ).toBe("ignored");
    },
  );

  test("transition replay is deterministic and leaves earlier snapshots intact", () => {
    const initial = createInitialSnapshot("replay");
    const events: InteractionEvent[] = [
      {
        sessionId: "replay",
        type: "scope.begin",
        token: 1,
        parentToken: null,
        owner: "easyeyes",
        label: "block",
      },
      {
        sessionId: "replay",
        type: "interruption.begin",
        token: 2,
        reason: "fullscreen-lost",
      },
      { sessionId: "replay", type: "interruption.end", token: 2 },
    ];
    const replay = () =>
      events.reduce(
        (state, event) => transition(state, event).snapshot,
        initial,
      );
    expect(replay()).toEqual(replay());
    expect(replay()).toMatchObject({ revision: 3, interruptions: [] });
    expect(initial.scopes).toEqual([]);
    expect(Object.isFrozen(replay().scopes[0])).toBe(true);
    expect(Object.isFrozen(replay().scopes)).toBe(true);
    expect(Object.isFrozen(replay())).toBe(true);
  });
});

describe("interaction coordinator: subscriptions", () => {
  test("subscribes with current snapshot, ignores no-ops, and disposes independently", () => {
    const { manager, send } = fixture();
    send({ type: "camera.changed", status: "ready" });
    const listener = jest.fn();
    const stop = manager.subscribe(listener);
    expect(listener).toHaveBeenLastCalledWith(manager.getSnapshot(), null);
    send({ type: "camera.changed", status: "ready" });
    expect(listener).toHaveBeenCalledTimes(1);
    const stopAgain = manager.subscribe(listener);
    stop();
    stop();
    send({ type: "fullscreen.changed", status: "missing" });
    expect(listener).toHaveBeenCalledTimes(3);
    stopAgain();
    send({ type: "fullscreen.changed", status: "present" });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  test("reentrant dispatch reaches every observer in revision order", () => {
    const { manager, send } = fixture();
    const seen: string[] = [];
    manager.subscribe((state, change) => {
      if (!change) return;
      seen.push(`a:${state.revision}`);
      if (state.revision === 1) {
        expect(
          send({ type: "fullscreen.changed", status: "missing" }).status,
        ).toBe("queued");
      }
    });
    manager.subscribe((state, change) => {
      if (change) seen.push(`b:${state.revision}`);
    });
    send({ type: "camera.changed", status: "ready" });
    expect(seen).toEqual(["a:1", "b:1", "a:2", "b:2"]);
  });

  test("subscribing during dispatch gets one current snapshot then ordered changes", () => {
    const { manager, send } = fixture();
    const seen: string[] = [];
    manager.subscribe((state, change) => {
      if (change && state.revision === 1) {
        manager.subscribe((snapshot, next) => {
          seen.push(`${next ? "change" : "initial"}:${snapshot.revision}`);
          if (!next) send({ type: "fullscreen.changed", status: "missing" });
        });
      }
    });
    send({ type: "camera.changed", status: "ready" });
    expect(seen).toEqual(["initial:1", "change:2"]);
  });

  test("exceptions and rejected async observers do not block state or other observers", async () => {
    const errors: unknown[] = [];
    const manager = createInteractionCoordinator("errors", {
      onObserverError: (error) => {
        errors.push(error);
        throw new Error("broken diagnostics");
      },
    });
    const seen: Snapshot[] = [];
    manager.subscribe(() => {
      throw new Error("sync");
    });
    manager.subscribe(async () => {
      throw new Error("async");
    });
    manager.subscribe((state) => {
      seen.push(state);
    });
    manager.dispatch({
      sessionId: "errors",
      type: "camera.changed",
      status: "ready",
    });
    await Promise.resolve();
    expect(seen.map((state) => state.revision)).toEqual([0, 1]);
    expect(errors).toHaveLength(4);
  });

  test("queued events are copied before the caller can mutate them", () => {
    const { manager, send } = fixture();
    manager.subscribe((state, change) => {
      if (!change || state.revision !== 1) return;
      const event: InteractionEvent = {
        sessionId: "study-1",
        type: "fullscreen.changed",
        status: "missing",
      };
      manager.dispatch(event);
      event.status = "present";
    });
    send({ type: "camera.changed", status: "ready" });
    expect(manager.getSnapshot().fullscreen).toBe("missing");
  });
});
