export const populateQuestDefaults = (conditionsList, reader) => {
  for (let i = 0; i < conditionsList.length; i++) {
    const condition = conditionsList[i];

    const questValues = {
      startVal: Math.log10(reader.read("thresholdGuess", condition.label)),
      startValSd: reader.read("thresholdGuessLogSd", condition.label),
      beta: reader.read("thresholdBeta", condition.label) || 2.3,
      delta: reader.read("thresholdDelta", condition.label) || 0.01,
      gamma: getGamma(reader.read("targetAlphabet", condition.label)),
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

const getGamma = (alphabet) => {
  const valueCounts = {};
  for (let i = 0; i < alphabet.length; i++) {
    if (valueCounts.hasOwnProperty(alphabet[i])) valueCounts[alphabet[i]]++;
    else valueCounts[alphabet[i]] = 1;
  }
  const probabilityOrderedValues = [...new Set(...alphabet)].sort((a, b) =>
    valueCounts[a] < valueCounts[b] ? 1 : -1
  );
  const gamma = valueCounts[probabilityOrderedValues.pop()] / alphabet.length;
  return gamma;
};
