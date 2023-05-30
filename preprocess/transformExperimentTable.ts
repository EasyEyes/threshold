import { GLOSSARY } from "../parameters/glossary";
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
  // Add block_condition label to every condition of experiment
  df = addUniqueLabelsToDf(df);
  // Spread underscore param values to all cells
  df = populateUnderscoreValues(df); // _params copied from Column B
  // Enforce using Column B for the underscore parameters, and Column C and on for conditions
  df = dropFirstColumn(df); // Conditions start in Column C
  // Populate missing values with defaults
  df = populateDefaultValues(df);
  return df;
};

/**
 * For each parameter starting with an underscore, the first value is copied to every column
 * @param {dfjs.DataFrame} df Dataframe describing the experiment
 * @returns  {dfjs.DataFrame}
 * */
const populateUnderscoreValues = (df: any): any => {
  // Get all the underscore parameters
  const underscoreParams = df.listColumns().filter(isUnderscoreParameter);
  // For each one...
  for (const underscoreParameter of underscoreParams) {
    // Get the first value
    const firstValue = df.select(underscoreParameter).toArray()[0][0];
    // And use it, or a blank string if there isn't a defined first value
    const valueToUse = firstValue ?? "";
    // Set the corresponding column to be all this value
    df = df.withColumn(underscoreParameter, () => valueToUse);
  }
  // Return the modified df
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
    if (GLOSSARY.hasOwnProperty(columnName)) {
      // Get current column values as an array
      const column: string[] = getColumnValues(populatedDf, columnName);
      // Replace any missing value with the default value
      const populatedColumn = column.map((x) =>
        x === "" ? GLOSSARY[columnName].default : x
      );
      // Use this default-interpolated column as the column
      populatedDf = populatedDf.withColumn(
        columnName,
        (r: any, i: number) => populatedColumn[i]
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
