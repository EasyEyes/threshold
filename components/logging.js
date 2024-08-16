import { paramReader } from "../threshold";
import { status } from "./global";
import { toFixedNumber, debug } from "./utils";

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
  if (isEachFrameFunctionMessage) return;
  const timestamp = toFixedNumber(performance.now() / 1000, 3);

  BC ??= status.block_condition;
  const styles = [
    "background-color: lightblue",
    "color: black",
    // "border: 1px solid blue",
    // "padding: 1px 1px",
    // "border-radius: 1px",
  ].join(";");
  console.log("%c " + msg + " " + timestamp + "(sec)", styles, value);
};

export const logDisplay = (msg, value = "", duration = 3000) => {
  if (!debug) return;
  const containerId = "logDisplayContainer";
  let container = document.getElementById(containerId);
  if (container === null) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "absolute";
    container.style.top = "200px";
    container.style.left = "200px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    document.body.append(container);
  }
  const div = document.createElement("h2");
  div.innerText = `${msg} ${value}`;
  div.style.padding = "10px";
  container.appendChild(div);
  setTimeout(() => {
    container.removeChild(div);
  }, duration);
};
