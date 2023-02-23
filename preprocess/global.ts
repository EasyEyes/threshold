export interface Experiment {
  participantRecruitmentServiceName: string;
  participantRecruitmentServiceUrl: string;
  participantRecruitmentServiceCode: string;
  experimentUrl: string;
}

export const experimentRecruitmentAndRunInfo: Experiment = {
  participantRecruitmentServiceName: "",
  participantRecruitmentServiceUrl: "",
  participantRecruitmentServiceCode: "",
  experimentUrl: "",
};

export const tempAccessToken = { t: undefined };

export const compatibilityRequirements = {
  t: "",
  parsedInfo: {},
  L: "",
  previousParsedInfo: {},
  previousT: "",
  selected: "English",
  previousL: "",
};
