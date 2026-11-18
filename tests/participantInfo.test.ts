/**
 * @jest-environment node
 *
 * Unit tests for components/participantInfo.js — the callback threshold.js
 * hands to checkCrossSessionId (gotParticipantId), extracted as a pure
 * state transition over the experiment-info object.
 *
 * Characterization tests of CURRENT behavior:
 *  - a returning participant (id matches the stored id) continues the
 *    session counter (Number(session)+1); a non-numeric session label
 *    passes through untouched.
 *  - anyone else (new participant, or no stored id) starts at session 1.
 *  - an empty participant answer leaves everything untouched.
 */
import { applyReturnedParticipantInfo } from "../components/participantInfo.js";

// experiment-info stand-in recording every setSession argument.
const newInfo = () => {
  const sessions: unknown[] = [];
  return {
    sessions,
    info: {
      participant: "old",
      EasyEyesID: "old",
      PavloviaSessionID: "old",
      setSession: (s: unknown) => sessions.push(s),
    } as any,
  };
};

describe("applyReturnedParticipantInfo", () => {
  test("empty participant is a no-op", () => {
    const { info, sessions } = newInfo();
    applyReturnedParticipantInfo(info, "", "5", "old");
    expect(sessions).toEqual([]);
    expect(info.participant).toBe("old");
  });

  test("participant with no stored id → session 1, ids recorded", () => {
    const { info, sessions } = newInfo();
    applyReturnedParticipantInfo(info, "P1", "4", undefined);
    expect(sessions).toEqual([1]);
    expect(info.participant).toBe("P1");
    expect(info.EasyEyesID).toBe("P1");
    expect(info.PavloviaSessionID).toBe("P1");
  });

  test.each([
    ["different participant than stored", "NEW", "7", "OLD", 1],
    ["returning participant, numeric session", "SAME", "4", "SAME", 5],
    ["returning participant, session 0", "SAME", "0", "SAME", 1],
    ["returning participant, null session", "SAME", null, "SAME", 1],
  ])("%s → session %p", (_label, participant, session, storedId, expected) => {
    const { info, sessions } = newInfo();
    applyReturnedParticipantInfo(info, participant, session, storedId);
    expect(sessions).toEqual([expected]);
    expect(info.participant).toBe(participant);
  });

  test("returning participant, non-numeric session label passes through", () => {
    const { info, sessions } = newInfo();
    applyReturnedParticipantInfo(info, "SAME", "retest", "SAME");
    expect(sessions).toEqual(["retest"]);
  });
});
