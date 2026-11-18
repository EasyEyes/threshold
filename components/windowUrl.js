// URL query helpers for participant identity and the Prolific daisy-chain
// redirect, extracted from threshold.js for unit testing.

// Parse participant / session / study_id / completedDaisyChainBefore from a
// window.location.search string. Missing params read as null.
export const parseWindowQuery = (search) => {
  const urlSearchParams = new URLSearchParams(search);
  return {
    participant: urlSearchParams.get("participant"),
    session: urlSearchParams.get("session"),
    study_id: urlSearchParams.get("study_id"),
    completedDaisyChainBefore: urlSearchParams.get("completedDaisyChainBefore"),
  };
};

// Redirect URL for the study chained AFTER this one, or null when there is
// no next URL or this participant already completed the chain.
export const daisyChainRedirectURL = (url, query) => {
  if (!url) return null;
  if (query.completedDaisyChainBefore) return null;
  const { participant, session, study_id } = query;
  return `${url}?external_id=${participant}&participant=${participant}&session=${session}&study_id=${study_id}&completedDaisyChainBefore=${true}`;
};
