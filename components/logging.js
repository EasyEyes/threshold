import { paramReader } from "../threshold";
import { status } from "./global";
import { toFixedNumber } from "./utils";

export const logQuest = (msg, value = "", BC = undefined) => {
  BC ??= status.block_condition;
  const styles = [
    "background-color: lightyellow",
    "border: 2px dashed blue",
    "padding: 2px 2px",
    "border-radius: 1px",
  ].join(";");
  if (paramReader.read("logQuestBool", BC)) {
    console.log("%cQUEST. " + msg, styles, value);
  }
};

export const logNotice = (msg, value = "", BC = undefined) => {
  const isEachFrameFunctionMessage = /EachFrame/.test(msg);
  const timestamp = toFixedNumber(performance.now() / 1000, 3);

  BC ??= status.block_condition;
  const styles = [
    "background-color: lightblue",
    "color: black",
    // "border: 1px solid blue",
    // "padding: 1px 1px",
    // "border-radius: 1px",
  ].join(";");
  if (!isEachFrameFunctionMessage)
    console.log("%c " + msg + " " + timestamp + "(sec)", styles, value);
};
