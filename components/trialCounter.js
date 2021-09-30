export function calculateBlockWithTrialIndex(
  totalBlockTrialList,
  totalTrialIndex
) {
  let cumulativeTrialCount = 0;
  for (let i = 0; i < totalBlockTrialList.length; i++) {
    cumulativeTrialCount += totalBlockTrialList[i];
    if (totalTrialIndex <= cumulativeTrialCount) return i + 1;
  }
  return totalBlockTrialList.length;
}
