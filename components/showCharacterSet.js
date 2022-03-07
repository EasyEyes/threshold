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

export function setupClickableCharacterSet(
  ans,
  font,
  where,
  responseRegister,
  extraFunction = null,
  extraCharClassName = ""
) {
  const characterSetHolder = document.createElement("div");
  characterSetHolder.id = "characterSet-holder";
  characterSetHolder.className = "characterSet-holder";
  characterSetHolder.style.fontFamily = `"${font}"`;
  getCharacterSetShowPos(characterSetHolder, where);

  pushCharacterSet(
    ans,
    characterSetHolder,
    responseRegister,
    extraFunction,
    extraCharClassName
  );

  document.body.appendChild(characterSetHolder);

  return characterSetHolder;
}

export function removeClickableCharacterSet(responseRegister) {
  responseRegister.current = null;
  responseRegister.onsetTime = 0;
  responseRegister.clickTime = 0;

  const ele = document.querySelectorAll(".characterSet-holder");
  ele.forEach((e) => {
    document.body.removeChild(e);
  });
}

export function updateClickableCharacterSet(
  ans,
  responseRegister,
  extraFunction = null,
  extraCharClassName = ""
) {
  const characterSetHolder = document.querySelector(".characterSet-holder");
  while (characterSetHolder.firstChild) {
    characterSetHolder.removeChild(characterSetHolder.firstChild);
  }

  pushCharacterSet(
    ans,
    characterSetHolder,
    responseRegister,
    extraFunction,
    extraCharClassName
  );
  return characterSetHolder;
}

/* -------------------------------------------------------------------------- */

const pushCharacterSet = (
  ans,
  characterSetHolder,
  responseRegister,
  extraFunction = null,
  extraCharClassName = ""
) => {
  for (let a of ans) {
    let characterSet = document.createElement("span");
    characterSet.className = "characterSet";
    if (extraCharClassName.length)
      characterSet.classList.add(extraCharClassName);

    characterSet.innerText = a;
    characterSet.onclick = () => {
      responseRegister.clickTime = performance.now();
      responseRegister.current = a.toLowerCase();
      if (extraFunction) extraFunction(a); // TEMP? For reading response
    };
    characterSetHolder.appendChild(characterSet);
  }
};
