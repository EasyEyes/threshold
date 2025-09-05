/**
 * Unlike glossary.ts (which is compiled from an exteral Google Sheets spreadsheet which Denis edits), this
 * file may be edited directly by the EasyEyes programming team. This file represents internal parameters, ie
 * parameters which are not specified by the experimenter or alterable by Denis. These interal parameters should
 * be used for communication betwen the compilation and runtime processes of EasyEyes, ie storing information
 * derived at the proprocess stage so that it can be read (using the same parameter reader api used for accessing
 * the value of other parameters) during the runtime of an experiment (ie in a participant's browser.)
 *
 * At the time of creation, this internal parameters support was added to pass the experimenter's experiment table
 * filename (read at the preprocess step, on the experimenter page) to the participant (experiment runtime) page,
 * without using an experimenter-specifiable parameter (ie _experimentFilename) which might be mistakenly filled in
 * by the experimenter (but discarded when overwritten by the preprocessor).
 *
 * It's possible that future use cases will require adding additional internal parameters. In this case, such internal
 * parameters should be added to the INTERNAL_GLOSSARY below. Additionally, the value of the parameter should be added
 * to the runtime condition files during the preprocessing step. This should be done after the experiment file is validated
 * (ie after the call to `validateExperimentDf(df)`) so as to not introduce reports of the experimenter's table being
 * improperly formatted due to an addition of the EasyEyes programming team. For this process, use the
 * `addNewInternalParam()` function in `preprocess/main.ts`; see the call
 * `df = addNewInternalParam(df, "!experimentFilename", filename);` as reference.
 *
 * Internal parameters should be prefixed with "!". This convention ensures that internal parameters don't interfere
 * with future public parameters.
 */

interface Glossary {
  [parameter: string]: { [field: string]: string | string[] };
}

export const INTERNAL_GLOSSARY: Glossary = {
  "!experimentFilename": {
    name: "!experimentFilename",
    availability: "now",
    example: "experimentTable.csv",
    explanation:
      "Filename for the experiment table file used to compile this experiment.",
    type: "text",
    default: "",
    categories: "",
  },
};
