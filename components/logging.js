import { paramReader } from "../threshold";
import { status } from "./global";

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
  BC ??= status.block_condition;
  const styles = [
    "background-color: lightblue",
    // "border: 1px solid blue",
    // "padding: 1px 1px",
    // "border-radius: 1px",
  ].join(";");
  console.log("%c " + msg, styles, value);
};
