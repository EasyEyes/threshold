import { logger } from "./utils";

export const populateQuestDefaults = (
  conditionsList,
  reader,
  targetKind = "letter"
) => {
  for (let i = 0; i < conditionsList.length; i++) {
    const condition = conditionsList[i];
    const cName = condition["block_condition"];

    const readerGamma = reader.read("thresholdGamma", cName);
    // If no gamma value is provided, calculate the default
    const gamma =
      readerGamma !== ""
        ? readerGamma
        : targetKind == "letter"
        ? getGamma(reader.read("fontCharacterSet", cName))
        : 0.5;
    const questValues = {
      startVal: Math.log10(reader.read("thresholdGuess", cName)),
      startValSd: reader.read("thresholdGuessLogSd", cName),
      beta: reader.read("thresholdBeta", cName),
      delta: reader.read("thresholdDelta", cName),
      gamma: gamma,
      pThreshold: reader.read("thresholdProportionCorrect", cName),
      nTrials: reader.read("conditionTrials", cName),
    };
    /*
      Other parameters specified for QuestHandler:
      - stopInterval
      - grain
      - method
    */
    for (const property in questValues) {
      if (!questValues[property])
        console.error(`property: ${property}, value: ${questValues[property]}`);
      conditionsList[i][property] = questValues[property];
    }
  }
  return conditionsList;
};

const getGamma = (characterSet) => {
  if (!isNaN(characterSet)) characterSet = characterSet.toString();

  const valueCounts = {};
  for (let i = 0; i < characterSet.length; i++) {
    // eslint-disable-next-line no-prototype-builtins
    if (valueCounts.hasOwnProperty(characterSet[i]))
      valueCounts[characterSet[i]]++;
    else valueCounts[characterSet[i]] = 1;
  }

  const probabilityOrderedValues = Array.from(new Set(characterSet)).sort(
    (a, b) => (valueCounts[a] < valueCounts[b] ? 1 : -1)
  );

  const gamma =
    valueCounts[probabilityOrderedValues.pop()] / characterSet.length;
  return gamma;
};
