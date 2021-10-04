export function getNextTrialIndex(
  currentTrialIndex,
  currentBlockIndex,
  totalBlockTrialList,
) {

  currentTrialIndex = currentTrialIndex + 1;
  if (totalBlockTrialList[currentBlockIndex-1] > currentBlockIndex)
    return {
      trial: currentBlockIndex,
      block: currentTrialIndex
    };
  else if (currentBlockIndex+1 < totalBlockTrialList.length)
    return {
      trial: 1,
      block: currentBlockIndex+1
    };
  else 
    return {
      trial: -1,
      block: -1
    }; 
}
