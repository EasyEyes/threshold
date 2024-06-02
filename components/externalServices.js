import {
  recruitmentServiceData,
  loadRecruitmentServiceConfig,
} from "./recruitmentService";

export const isProlificPreviewExperiment = () => {
  let searchParams = window.location.search;
  return (
    searchParams.search("participant") != -1 &&
    searchParams.search("session") != -1 &&
    searchParams.search("study_id") != -1 &&
    searchParams.search("preview") != -1
  );
};

export const isProlificExperiment = () => {
  loadRecruitmentServiceConfig();
  console.log(recruitmentServiceData, "external service");
  return recruitmentServiceData.name == "Prolific";
};

/* -------------------------------------------------------------------------- */

export const isPavloviaExperiment = () => {
  let urlSearchParams = new URLSearchParams(window.location.search);
  return (
    urlSearchParams.get("participant") == null &&
    urlSearchParams.get("session") == null &&
    urlSearchParams.get("study_id") == null
  );
};

/* -------------------------------------------------------------------------- */

export const saveProlificInfo = (expInfo) => {
  let urlSearchParams = new URLSearchParams(window.location.search);
  let participant = urlSearchParams.get("participant");
  let session = urlSearchParams.get("session");
  let study_id = urlSearchParams.get("study_id");

  expInfo.ProlificParticipantID = participant;
  expInfo.ProlificSessionID = session;
  expInfo.ProlificStudyID = study_id;
};
