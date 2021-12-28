function getCharacterSetShowPos(ele, showWhere) {
  switch (showWhere) {
    case "bottom":
      ele.style.bottom = "10%";
      break;
    default:
      ele.style.bottom = "10%";
      break;
  }
}

export function getCharacterSetShowText(valid) {
  return valid.join(" ");
}

export function setupClickableCharacterSet(ans, font, where, responseRegister) {
  const characterSetHolder = document.createElement("div");
  characterSetHolder.id = "characterSet-holder";
  characterSetHolder.className = "characterSet-holder";
  characterSetHolder.style.fontFamily = `"${font}"`;
  getCharacterSetShowPos(characterSetHolder, where);

  for (let a of ans) {
    let characterSet = document.createElement("span");
    characterSet.className = "characterSet";
    characterSet.innerText = a;
    characterSet.onclick = () => {
      responseRegister.clickTime = performance.now();
      responseRegister.current = a.toLowerCase();
    };
    characterSetHolder.appendChild(characterSet);
  }

  document.body.appendChild(characterSetHolder);

  return characterSetHolder;
}

export function removeClickableCharacterSet() {
  const ele = document.querySelectorAll(".characterSet-holder");
  ele.forEach((e) => {
    document.body.removeChild(e);
  });
}
