// Experiment-info bookkeeping for the participant id returned by the
// cross-session id check (checkCrossSessionId), extracted from threshold.js
// for unit testing. A RETURNING participant (id matching the stored id)
// continues the session counter; anyone else starts at session 1.

export const applyReturnedParticipantInfo = (
  experimentInfo,
  participant,
  session = null,
  storedId,
) => {
  if (!participant) return;
  experimentInfo.participant = participant;
  if (storedId !== undefined && participant === storedId) {
    experimentInfo.setSession(
      session && isNaN(Number(session)) ? session : Number(session) + 1,
    );
  } else {
    experimentInfo.setSession(1);
  }
  experimentInfo.EasyEyesID = participant;
  experimentInfo.PavloviaSessionID = participant;
};
