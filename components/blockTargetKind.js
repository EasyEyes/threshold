import { safeExecuteFunc } from "./utils";

export const switchKind = (targetKind, { reading, letter, gabor, image }) => {
  switch (targetKind) {
    case "reading":
      safeExecuteFunc(reading);
      break;
    case "letter":
      safeExecuteFunc(letter);
      break;
    case "gabor":
      safeExecuteFunc(gabor);
      break;
    case "image":
      safeExecuteFunc(image);
      break;
    default:
      safeExecuteFunc(letter);
      break;
  }
};
