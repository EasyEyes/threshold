import { ParamReader } from "../parameters/paramReader.js";
import { paramReader } from "../threshold.js";
import { logger, shuffle } from "./utils.js";

// TODO read from glossary, ie /blockShuffleSub\d+groups
// const groupingParameters = ["blockShuffleGroups", "blockShuffleSubgroups", "blockShuffleSub2groups", "blockShuffleSub3groups"];
const groupingParameters = [
  "blockShuffleGroups1",
  "blockShuffleGroups2",
  "blockShuffleGroups3",
  "blockShuffleGroups4",
];
const GroupLevels = new Map(groupingParameters.map((p, i) => [i, p]));

type GroupDefinition = Map<string, number[]>;

const groupShuffle = (
  depth: number,
  blocks: number[],
  parentGroupLabel?: string
): number[] => {
  logger(
    `shuffling group. depth ${depth}, blocks: ${blocks.toString()}, parentGroupLabel:${parentGroupLabel}`
  );
  if (depth === GroupLevels.size || blocks.length === 1) return blocks;
  // Get the (sub)group label for every block, including empty strings for non-labels blocks; same length as `blocks`
  const groupLabels = getGroupLabels(depth, blocks);
  // Establish the mapping from group label to the blocks which make it up
  const oldGroupDefinitions = mapBlocksToGroupLabels(blocks, groupLabels);
  // Group blocks of the same group into a single string, ie group label
  const blocksAndGroups = groupBlocksByLabel(blocks, groupLabels);
  // Get just the groups, excluding the block numbers, and shuffle
  const shuffledGroups = shuffle(
    blocksAndGroups.filter((v) => typeof v === "string")
  );
  // Fill in the now-shuffled groups back into their spaces amongst the blocks
  const blocksAndShuffledGroups = blocksAndGroups.map((v) =>
    typeof v === "string" ? shuffledGroups.pop() : v
  );
  logger("blocksAndShuffledGroups", blocksAndShuffledGroups);
  // Shuffle the blocks within each group, recursively based on subgrouping
  const uniqueGroups = [...new Set(groupLabels.filter((s) => s))]; // Unique group labels
  const recursivelyShuffledGroupDefinitions: GroupDefinition = new Map(
    uniqueGroups.map((group) => {
      const blocksInThisGroup = oldGroupDefinitions.get(group) as number[];
      const blocksInThisGroupShuffled = groupShuffle(
        depth + 1,
        blocksInThisGroup,
        group
      );
      return [group, blocksInThisGroupShuffled];
    })
  );
  // Replace group labels with these now-shuffled block definitions
  const blocksInGroupShuffledOrder = blocksAndShuffledGroups
    .map((x) =>
      typeof x === "string" ? recursivelyShuffledGroupDefinitions.get(x) : x
    )
    .flat();
  return blocksInGroupShuffledOrder;
};

const getGroupLabels = (depth: number, blocks: number[]): string[] => {
  const param = GroupLevels.get(depth);
  return blocks.map((b) => paramReader.read(param, b)[0]);
};

export const getBlockOrder = (paramReader: ParamReader): number[] => {
  let experiment = paramReader._experiment;
  if (!experiment) throw new Error("_experiment not defined");

  // TODO verify if necessary
  experiment = experiment.sort((a, b) => a.block - b.block);
  let blockNumbers = experiment.map((b) => b.block);
  blockNumbers = groupShuffle(0, blockNumbers);
  logger("blockNumber", blockNumbers);
  return blockNumbers;
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
 * eg
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

// /**
//  * Shuffle array `b` to preserve the original `a` -> `b` correspondence, reflecting the new
//  * ordering of `a` given by `aShuffled`. ie shuffle `b` in the exact same way `a` was shuffled.
//  * */
// const shuffleToMatch = (
//   aShuffled: typeof a,
//   a: unknown[],
//   b: unknown[]
// ): typeof b => {
//   const aToB = new Map(a.map((x, i) => [x, b[i]]));
//   const bShuffled = aShuffled.map((x) => aToB.get(x));
//   return bShuffled;
// };

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
