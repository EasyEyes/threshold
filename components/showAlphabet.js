function getAlphabetShowPos(ele, showWhere) {
  switch (showWhere) {
    case "bottom":
      ele.style.bottom = "10%";
      break;
    default:
      ele.style.bottom = "10%";
      break;
  }
}

export function getAlphabetShowText(valid) {
  return valid.join(" ");
}

export function setupClickableAlphabet(ans, font, where, responseRegister) {
  const alphabetHolder = document.createElement("div");
  alphabetHolder.id = "alphabet-holder";
  alphabetHolder.className = "alphabet-holder";
  alphabetHolder.style.fontFamily = `"${font}"`;
  getAlphabetShowPos(alphabetHolder, where);

  for (let a of ans) {
    let alphabet = document.createElement("span");
    alphabet.className = "alphabet";
    alphabet.innerText = a;
    alphabet.onclick = () => {
      responseRegister.clickTime = performance.now();
      responseRegister.current = a.toLowerCase();
    };
    alphabetHolder.appendChild(alphabet);
  }

  document.body.appendChild(alphabetHolder);

  return alphabetHolder;
}

export function removeClickableAlphabet() {
  const ele = document.querySelectorAll(".alphabet-holder");
  ele.forEach((e) => {
    document.body.removeChild(e);
  });
}
