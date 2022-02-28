export const isProlificPreviewExperiment = () => {
  let searchParams = window.location.search;
  return (
    searchParams.search("participant") != -1 &&
    searchParams.search("session") != -1 &&
    searchParams.search("study_id") != -1 &&
    searchParams.search("preview") != -1
  );
};

export const isPavloviaExperiment = () => {
  let urlSearchParams = new URLSearchParams(window.location.search);
  return (
    urlSearchParams.get("participant") == null &&
    urlSearchParams.get("session") == null &&
    urlSearchParams.get("study_id") == null
  );
};
