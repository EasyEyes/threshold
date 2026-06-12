import { getGlossary } from "../parameters/glossaryRegistry";
import {
  getColumnValues,
  isUnderscoreParameter,
  addUniqueLabelsToDf,
} from "./utils";

/**
 * @file Perform transformations on the shape of the dataframe representing an experiment table
 */

/**
 * Normalize the shape of the experiment df, ensuring a value for every cell
 * ie populate underscores, drop first column, populate defaults
 * @param df
 * @returns
 */
export const normalizeExperimentDfShape = (df: any): any => {
  if (df.count() === 0) return df;
  df = addUniqueLabelsToDf(df);
  df = populateUnderscoreValues(df);
  df = dropFirstColumn(df);
  df = populateDefaultValues(df);
  return df;
};

/**
 * For each parameter starting with an underscore, the first value is copied to every column
 * @param {dfjs.DataFrame} df Dataframe describing the experiment
 * @returns  {dfjs.DataFrame}
 * */
const populateUnderscoreValues = (df: any): any => {
  if (df.count() === 0) return df;
  const underscoreParams = df.listColumns().filter(isUnderscoreParameter);
  for (const underscoreParameter of underscoreParams) {
    const firstValue = df.select(underscoreParameter).toArray()[0][0];
    const valueToUse = firstValue ?? "";
    df = df.withColumn(underscoreParameter, () => valueToUse);
  }
  return df;
};

/**
 * Fill any empty cells with the default value
 * @param {dfjs.DataFrame} df Dataframe describing the experiment
 * @returns  {dfjs.DataFrame}
 * */
const populateDefaultValues = (df: any): any => {
  let populatedDf = df;
  // For each column...
  df.listColumns().forEach((columnName: string) => {
    if (getGlossary().hasOwnProperty(columnName)) {
      // Get current column values as an array
      const column: string[] = getColumnValues(populatedDf, columnName);
      // Replace any missing value with the default value
      const populatedColumn = column.map((x) =>
        x === "" ? getGlossary()[columnName].default : x,
      );
      // Use this default-interpolated column as the column
      populatedDf = populatedDf.withColumn(
        columnName,
        (r: any, i: number) => populatedColumn[i],
      );
    }
  });
  return populatedDf;
};

/**
 * Drop the first column of values (ie Column B) from a df
 * @param {dfjs.DataFrame} df
 * @returns {dfjs.DataFrame}
 */
const dropFirstColumn = (df: any): any => {
  const originalColumns = df.listColumns();
  return df.transpose().drop("0").transpose().renameAll(originalColumns);
};
