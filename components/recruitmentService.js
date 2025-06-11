import Papa from "papaparse";

export const recruitmentServiceData = {
  name: "",
  code: "",
  incompatibleCode: "",
  url: "",
  abortedCode: "",
};

export const loadRecruitmentServiceConfig = async (
  path = "recruitmentServiceConfig.csv",
) => {
  const data = await new Promise((resolve, reject) => {
    try {
      Papa.parse(path, {
        download: true,
        complete: ({ data }) => resolve(data),
      });
    } catch (e) {
      reject(e);
    }
  });
  if (!data) return;
  data.forEach((param) => {
    switch (param[0]) {
      case "name":
        recruitmentServiceData.name = param[1];
        break;
      case "code":
        recruitmentServiceData.code = param[1];
        break;
      case "incompatible-completion-code":
        recruitmentServiceData.incompatibleCode = param[1];
        break;
      case "url":
        recruitmentServiceData.url = param[1];
        break;
      case "aborted-completion-code":
        recruitmentServiceData.abortedCode = param[1];
        break;
    }
  });
};
