import Papa from "papaparse";

export const recruitmentServiceData = {
  name: "",
  code: "",
  incompatibleCode: "",
  url: "",
};

export const loadRecruitmentServiceConfig = (
  path = "recruitmentServiceConfig.csv"
) => {
  Papa.parse(path, {
    download: true,
    complete: ({ data }) => {
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
        }
      });
    },
  });
};
