import { ParamReader } from "../parameters/paramReader.js";
import { logger, shuffle } from "./utils.js";

export const getBlockOrder = (paramReader: ParamReader): number[] => {
  let experiment = paramReader._experiment;
  if (!experiment) throw new Error("_experiment not defined");

  // TODO verify if necessary
  experiment = experiment.sort((a, b) => a.block - b.block);
  let blockNumbers = experiment.map((b) => b.block);

  const block_shuffleBlocksWithinGroups = experiment.map(
    (block) => block.block_shuffleBlocksWithinGroups
  );
  let block_shuffleGroups = experiment.map(
    (block) => block.block_shuffleGroups
  );

  const shuffleBlocksWithinGroups = block_shuffleBlocksWithinGroups?.some(
    (s) => s !== undefined && s !== ""
  );
  const shuffleGroups = block_shuffleGroups?.some(
    (s) => s !== undefined && s !== ""
  );

  // shuffleBlocksWithinGroups before shuffleGroups
  if (shuffleBlocksWithinGroups) {
    const blockNumbersShuffledWithinGroups =
      getBlocksFromShufflingBlocksWithinGroups(
        blockNumbers,
        block_shuffleBlocksWithinGroups
      );
    block_shuffleGroups = shuffleToMatch(
      blockNumbersShuffledWithinGroups,
      blockNumbers,
      block_shuffleGroups
    );
    blockNumbers = blockNumbersShuffledWithinGroups;
  }
  if (shuffleGroups) {
    blockNumbers = getBlocksFromShufflingGroups(
      blockNumbers,
      block_shuffleGroups
    );
  }

  return blockNumbers;
};

const getBlocksFromShufflingGroups = (
  blocks: number[],
  groups: string[]
): number[] => {
  if (blocks.length !== groups.length)
    throw new Error("Group labeling isn't same length as block numbers.");
  // Group blocks of the same group into a single string, ie group label
  const blocksAndGroups = groupBlocksByLabel(blocks, groups);
  // Get just the groups, excluding the block numbers, and shuffle
  const shuffledGroups = shuffle(
    blocksAndGroups.filter((v) => typeof v === "string")
  );
  // Fill in the, now shuffled, groups back into their spaces amongst the blocks
  const blocksAndShuffledGroups = blocksAndGroups.map((v) =>
    typeof v === "string" ? shuffledGroups.pop() : v
  );
  // Replace group labels with the block numbers they represent
  const groupToBlockMap = mapBlocksToGroupLabels(blocks, groups);
  const groupShuffledBlocks = blocksAndShuffledGroups
    .map((v) => (typeof v === "string" ? groupToBlockMap.get(v) : v))
    .flat();
  // Leaving us with our block numbers, shuffled based on group
  return groupShuffledBlocks;
};
const getBlocksFromShufflingBlocksWithinGroups = (
  blocks: number[],
  groups: string[]
): number[] => {
  if (blocks.length !== groups.length)
    throw new Error("Group labeling isn't same length as block numbers.");
  // Group blocks of the same group into a single string, ie group label
  const blocksAndGroups = groupBlocksByLabel(blocks, groups);
  const groupToBlockMap = mapBlocksToGroupLabels(blocks, groups);
  const blocksShuffledWithinGroups = blocksAndGroups
    .map((v) => (typeof v === "string" ? shuffle(groupToBlockMap.get(v)) : v))
    .flat();
  return blocksShuffledWithinGroups;
};

/**
 * eg
 *   blocks -> [1,2,3,4,5,6]
 *   groups -> ["","A","A","A","","B"]
 *   return [1,"A",5,"B"]
 * */
const groupBlocksByLabel = (
  blocks: number[],
  groups: string[]
): (number | string)[] => {
  const groupedBlocks: (number | string)[] = [];
  blocks.forEach((b, i) => {
    const groupLabel = groups[i];
    // If not given a group label, just add the block number
    if (groupLabel === "") {
      groupedBlocks.push(b);
    } else {
      // If a label is given, add it if it's not already there.
      if (groupedBlocks[groupedBlocks.length - 1] !== groupLabel)
        groupedBlocks.push(groupLabel);
    }
  });
  return groupedBlocks;
};

/**
 * e
 *   blocks -> [1,2,3,4,5,6]
 *   groups -> ["","A","A","A","","B"]
 *   return Map("A":[2,3,4], "B":[6])
 * */
const mapBlocksToGroupLabels = (
  blocks: number[],
  groups: string[]
): Map<string, number[]> => {
  const groupToBlocks = new Map();
  blocks.forEach((b, i) => {
    const group = groups[i];
    const blocksForThisGroup = groupToBlocks.has(group)
      ? [...groupToBlocks.get(group), b]
      : [b];
    groupToBlocks.set(group, blocksForThisGroup);
  });
  return groupToBlocks;
};

/**
 * Shuffle array `b` to preserve the original `a` -> `b` correspondence, reflecting the new
 * ordering of `a` given by `aShuffled`. ie shuffle `b` in the exact same way `a` was shuffled.
 * */
const shuffleToMatch = (
  aShuffled: typeof a,
  a: unknown[],
  b: unknown[]
): typeof b => {
  const aToB = new Map(a.map((x, i) => [x, b[i]]));
  const bShuffled = aShuffled.map((x) => aToB.get(x));
  return bShuffled;
};

interface BlockDescription {
  block: number;
  targetKind: string;
  targetTask: string;
}
export const getBlocksTrialList = (
  paramReader: ParamReader,
  blockOrder: number[]
): BlockDescription[] => {
  const targetKinds = blockOrder.map(
    (blockN) => paramReader.read("targetKind", blockN)[0]
  );
  const targetTasks = blockOrder.map(
    (blockN) => paramReader.read("targetTask", blockN)[0]
  );
  return blockOrder.map((blockN, i) => {
    return {
      block: blockN - 1,
      targetKind: targetKinds[i],
      targetTask: targetTasks[i],
    };
  });
};
