export function getNextTrialIndex(
  currentTrialIndex,
  currentBlockIndex,
  totalBlockTrialList,
) {
  let res;
  if (totalBlockTrialList[currentBlockIndex-1] >= currentTrialIndex+1)
    res = {
      trial: currentTrialIndex+1,
      totalTrials: totalBlockTrialList[currentBlockIndex-1],
      block: currentBlockIndex
    };
  else if (currentBlockIndex+1 <= totalBlockTrialList.length) {
    currentBlockIndex = currentBlockIndex + 1;
    res = {
      trial: 1,
      totalTrials: totalBlockTrialList[currentBlockIndex-1],
      block: currentBlockIndex
    };
  }
  else 
    res = {
      trial: -1,
      totalTrials: -1,
      block: -1
    }; 
  
  return res;
}
