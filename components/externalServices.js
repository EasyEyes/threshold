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

  let searchParams = window.location.search;
  const searchParamsBool =
    searchParams.search("participant") != -1 &&
    searchParams.search("session") != -1 &&
    searchParams.search("study_id") != -1;

  const isProlificCodeStoredBool = recruitmentServiceData.name == "Prolific";
  return isProlificCodeStoredBool || searchParamsBool;
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
  console.log(urlSearchParams, "urlSearchParams");
  let participant = urlSearchParams.get("participant");
  let session = urlSearchParams.get("session");
  let study_id = urlSearchParams.get("study_id");

  expInfo.ProlificParticipantID = participant;
  expInfo.ProlificSessionID = session;
  expInfo.ProlificStudyID = study_id;
};
