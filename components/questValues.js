export const populateQuestDefaults = (conditionsList, reader) => {
  for (let i = 0; i < conditionsList.length; i++) {
    const condition = conditionsList[i];

    const questValues = {
      startVal: Math.log10(reader.read("thresholdGuess", condition.label)),
      startValSd: reader.read("thresholdGuessLogSd", condition.label),
      beta: reader.read("thresholdBeta", condition.label) || 2.3,
      delta: reader.read("thresholdDelta", condition.label) || 0.01,
      gamma: getGamma(reader.read("targetCharacterSet", condition.label)),
      pThreshold: reader.read("thresholdProportionCorrect", condition.label),
      nTrials: reader.read("conditionTrials", condition.label),
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
