import { safeExecuteFunc } from "./utils";

export const switchKind = (targetKind, mappings) => {
  if (typeof mappings[targetKind] === "string")
    return switchKind(mappings[targetKind], mappings);

  const {
    reading,
    letter,
    gabor,
    image,
    sound,
    vocoderPhrase,
    repeatedLetters,
    rsvpReading,
    movie,
    vernier,
    readlab,
  } = mappings;
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
    case "sound":
      safeExecuteFunc(sound);
      break;
    case "vocoderPhrase":
      safeExecuteFunc(vocoderPhrase);
      break;
    case "repeatedLetters":
      safeExecuteFunc(repeatedLetters);
      break;
    case "rsvpReading":
      safeExecuteFunc(rsvpReading);
      break;
    case "movie":
      safeExecuteFunc(movie);
      break;
    case "vernier":
      safeExecuteFunc(vernier);
      break;
    case "readlab":
      safeExecuteFunc(readlab);
      break;
    default:
      break;
  }
};

export const switchTask = (targetTask, mappings) => {
  if (typeof mappings[targetTask] === "string")
    return switchTask(mappings[targetTask], mappings);

  const { identify, questionAndAnswer, detect, adjust } = mappings;
  switch (targetTask) {
    case "identify":
      safeExecuteFunc(identify);
      break;
    case "questionAnswer":
    case "questionAndAnswer":
      safeExecuteFunc(questionAndAnswer);
      break;
    case "detect":
      safeExecuteFunc(detect);
      break;
    case "adjust":
      safeExecuteFunc(adjust);
      break;
    default:
      break;
  }
};
