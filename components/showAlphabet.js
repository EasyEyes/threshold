export function getAlphabetShowPos(showWhere) {
  switch (showWhere) {
    case "bottom":
      return [0, -window.innerHeight * 0.3];
    default:
      return [0, -window.innerHeight * 0.3];
  }
}

export function getAlphabetShowText(valid) {
  return valid.join(" ");
}


