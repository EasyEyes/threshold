import {
  recruitmentServiceData,
  loadRecruitmentServiceConfig,
} from "./recruitmentService";

// Helper to parse URL parameters once
const getProlificUrlParams = () => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  return {
    participant: urlSearchParams.get("participant"),
    session: urlSearchParams.get("session"),
    study_id: urlSearchParams.get("study_id"),
    preview: urlSearchParams.get("preview"),
  };
};

export const isProlificPreviewExperiment = () => {
  let searchParams = window.location.search;
  return (
    searchParams.search("participant") != -1 &&
    searchParams.search("session") != -1 &&
    searchParams.search("study_id") != -1 &&
    searchParams.search("preview") != -1
  );
};

export const isProlificExperiment = async () => {
  // Assuming URLSearchParams is faster than Papa.parse-ing recruitmentServiceConfig, check the former first
  const { participant, session, study_id } = getProlificUrlParams();
  if (participant && session && study_id) return true;
  // Otherwise, check the recruitmentService file to make sure
  await loadRecruitmentServiceConfig();
  return recruitmentServiceData.name == "Prolific";
};

/* -------------------------------------------------------------------------- */

// aka !isProlificExperiment() ?
//     but isProlificExperiment() !== !isPavloviaExperiment(), since
//     also isProlificExperiment also checks recruitmentServiceConfig?
export const isPavloviaExperiment = () => {
  const { participant, session, study_id } = getProlificUrlParams();
  return !participant && !session && !study_id;
};

/* -------------------------------------------------------------------------- */

// Where expInfo = thisExperimentInfo from global.js
export const saveProlificInfo = (expInfo: any) => {
  const { participant, session, study_id } = getProlificUrlParams();
  expInfo.ProlificParticipantID = participant;
  expInfo.ProlificSessionID = session;
  expInfo.ProlificStudyID = study_id;
};
