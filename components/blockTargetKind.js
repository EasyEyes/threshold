import { safeExecuteFunc } from "./utils";

export const switchKind = (targetKind, mappings) => {
  if (typeof mappings[targetKind] === "string")
    return switchKind(mappings[targetKind], mappings);

  const { reading, letter, gabor, image, sound } = mappings;
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
    case "sound":
      safeExecuteFunc(sound);
      break;
    default:
      break;
  }
};
