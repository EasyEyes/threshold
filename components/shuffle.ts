import { ParamReader } from "../parameters/paramReader.js";
import { paramReader } from "../threshold.js";
import { logger, readTargetTask, shuffle } from "./utils.js";
import { GLOSSARY } from "../parameters/glossary";
import { isBlockShuffleGroupingParam } from "../preprocess/utils";

/**
 * FILE
 * Contains code for shuffling blocks grouped together, with nested levels of grouping.
 * The blocks are grouped in nested/recursive levels.
 * That is, all the groups defined by `blockShuffleGroups01` are shuffled.
 * Then the groups of blocks defined by `blockShuffleGroups02` (ie subsets of the groups defined in `blockShuffleGroups01`) are shuffled.
 * Then the groups of blocks defined by `blockShuffleGroups03`... etc
 * This continues until there are no more levels of groups defined.
 * Then groups are substituted with their corresponding blocks.
 * (Futher, each block is represented by a MultistairHandler, which handles condition ordering within a block.)
 */

const groupingParameters = Object.keys(GLOSSARY)
  .filter(isBlockShuffleGroupingParam)
  .sort();
export const GroupLevels = new Map(groupingParameters.map((p, i) => [i, p]));

type GroupDefinition = Map<string, number[]>;

/**
 * Recursively shuffle the groups of blocks for each defined level of block shuffle groupings.
 * @param depth
 * @param blocks
 * @returns
 */
export const _groupShuffle = (depth: number, blocks: number[]): number[] => {
  if (depth === GroupLevels.size || blocks.length === 1) return blocks;
  // Get the (sub)group label for every block, including empty strings for non-labels blocks; same length as `blocks`
  const groupLabels = getGroupLabels(depth, blocks);
  // Establish the mapping from group label to the blocks which make it up
  const oldGroupDefinitions = _mapBlocksToGroupLabels(blocks, groupLabels);
  // Group blocks of the same group into a single string, ie group label
  const blocksAndGroups = _groupBlocksByLabel(blocks, groupLabels);
  // Get just the groups, excluding the block numbers [and pinned groups], and shuffle
  const isGroup = (v: string | number) => typeof v === "string";
  const isPinned = (v: string | number) =>
    typeof v === "string" && v[0] === "_";
  const needsShuffled = (v: string | number) => isGroup(v) && !isPinned(v);
  const shuffledGroups = shuffle(blocksAndGroups.filter(needsShuffled));
  // Fill in the now-shuffled groups back into their spaces amongst the blocks
  const blocksAndShuffledGroups = blocksAndGroups.map((v) =>
    needsShuffled(v) ? shuffledGroups.pop() : v,
  );
  // Shuffle the blocks within each group, recursively based on subgrouping
  const uniqueGroups = [...new Set(groupLabels.filter((s) => s !== ""))]; // Unique group labels
  const recursivelyShuffledGroupDefinitions: GroupDefinition = new Map(
    uniqueGroups.map((group) => {
      const blocksInThisGroup = oldGroupDefinitions.get(group) as number[];
      const blocksInThisGroupShuffled = _groupShuffle(
        depth + 1,
        blocksInThisGroup,
      );
      return [group, blocksInThisGroupShuffled];
    }),
  );
  // Replace group labels with these now-shuffled block definitions
  const blocksInGroupShuffledOrder = blocksAndShuffledGroups
    .map((x) =>
      typeof x === "string" ? recursivelyShuffledGroupDefinitions.get(x) : x,
    )
    .flat();
  return blocksInGroupShuffledOrder;
};

/**
 * Get array, of same length as `blocks`, of the shuffle group labels that this current `depth` of groupings
 * @param depth
 * @param blocks
 * @returns {string[]}
 */
const getGroupLabels = (depth: number, blocks: number[]): string[] => {
  const param = GroupLevels.get(depth);
  return blocks.map((b) => String(paramReader.read(param, b)[0]));
};

/**
 * Return list of blocks in this experiment, shuffled according to block shuffle groups
 * @param paramReader
 * @returns {number[]}
 */
export const getBlockOrder = (paramReader: ParamReader): number[] => {
  let experiment = paramReader._experiment;
  if (!experiment) throw new Error("_experiment not defined");

  // TODO verify if necessary
  experiment = experiment.sort((a, b) => a.block - b.block);
  let blockNumbers = _getUniqueBlocks(experiment.map((b) => b.block));
  blockNumbers = _groupShuffle(0, blockNumbers);
  return blockNumbers;
};

export const _getUniqueBlocks = (
  potentiallyRepeatedBlocks: number[],
): number[] => {
  const seen = new Set();
  const uniqueBlocks: number[] = [];
  potentiallyRepeatedBlocks.forEach((b) => {
    if (!seen.has(b)) uniqueBlocks.push(b);
    seen.add(b);
  });
  return uniqueBlocks;
};

/**
 * eg
 *   blocks -> [1,2,3,4,5,6]
 *   groups -> ["","A","A","A","","B"]
 *   return [1,"A",5,"B"]
 * */
export const _groupBlocksByLabel = (
  blocks: number[],
  groups: string[],
): (number | string)[] => {
  const groupedBlocks: (number | string)[] = [];
  blocks.forEach((b, i) => {
    const groupLabel = groups[i];
    // If not given a group label, just add the block number
    if (groupLabel === "") {
      groupedBlocks.push(Number(b));
    } else {
      // If a label is given, add it if it's not already there.
      if (groupedBlocks[groupedBlocks.length - 1] !== groupLabel)
        groupedBlocks.push(String(groupLabel));
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
export const _mapBlocksToGroupLabels = (
  blocks: number[],
  groups: string[],
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

interface BlockDescription {
  block: number;
  targetKind: string;
  targetTask: string;
}
export const getBlocksTrialList = (
  paramReader: ParamReader,
  blockOrder: number[],
): BlockDescription[] => {
  const targetKinds = blockOrder.map(
    (blockN) => paramReader.read("targetKind", blockN)[0],
  );
  const targetTasks = blockOrder.map((blockN) => readTargetTask(`${blockN}_1`));
  return blockOrder.map((blockN, i) => {
    return {
      block: blockN - 1,
      targetKind: targetKinds[i],
      targetTask: targetTasks[i],
    };
  });
};
