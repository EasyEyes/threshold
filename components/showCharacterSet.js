import { switchKind } from "./blockTargetKind";
import { letterConfig, readingConfig, font as globalFont } from "./global";
import { safeExecuteFunc } from "./utils";

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
  extraCharClassName = "",
  targetKind = ""
) {
  const characterSetHolder = document.createElement("div");
  characterSetHolder.id = "characterSet-holder";
  characterSetHolder.className = "characterSet-holder";

  characterSetHolder.style.fontFamily = `"${font}"`;
  characterSetHolder.style.direction = globalFont.ltr ? "ltr" : "rtl";

  if (targetKind == "sound") {
    characterSetHolder.style.display = "grid";
    //characterSetHolder.style.flexWrap = "wrap";
    characterSetHolder.style.gridTemplateColumns = "repeat(4,20vw)";
    characterSetHolder.style.gridTemplateRows = "repeat(7,7vh)";
    characterSetHolder.style.gridAutoFlow = "column";
  }

  getCharacterSetShowPos(characterSetHolder, where);

  pushCharacterSet(
    ans,
    characterSetHolder,
    responseRegister,
    extraFunction,
    extraCharClassName,
    targetKind
  );

  document.body.appendChild(characterSetHolder);

  return characterSetHolder;
}

export function removeClickableCharacterSet(responseRegister) {
  responseRegister.current = [];
  responseRegister.onsetTime = 0;
  responseRegister.clickTime = [];

  const ele = document.querySelectorAll(".characterSet-holder");
  ele.forEach((e) => {
    document.body.removeChild(e);
  });
}

export function updateClickableCharacterSet(
  ans,
  responseRegister,
  extraFunction = null,
  extraCharClassName = "",
  targetKind = ""
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
    extraCharClassName,
    targetKind
  );
  return characterSetHolder;
}

/* -------------------------------------------------------------------------- */

const pushCharacterSet = (
  ans,
  characterSetHolder,
  responseRegister,
  extraFunction = null,
  extraCharClassName = "",
  targetKind = ""
) => {
  for (let a of ans) {
    let characterSet = document.createElement("span");

    if (targetKind == "sound") {
      characterSet.style.fontSize = "1rem";
      characterSet.style.textAlign = "left";
    }

    characterSet.className = "characterSet";
    if (extraCharClassName.length)
      characterSet.classList.add(extraCharClassName);

    const addFakeConnection =
      letterConfig.spacingRelationToSize === "typographic";

    if (addFakeConnection)
      characterSet.style.fontVariantLigatures = "discretionary-lig-values";

    characterSet.innerHTML =
      addFakeConnection && targetKind !== "reading" ? `&zwj;${a}&zwj;` : a;
    characterSet.style.direction = globalFont.ltr ? "ltr" : "rtl";

    // TODO customize for letter config
    characterSet.style.fontSize = "2rem";

    switchKind(targetKind, {
      reading: () => {
        if (readingConfig.height !== undefined)
          characterSet.style.fontSize = `${readingConfig.height}px`;
        else characterSet.style.fontSize = "2rem";
      },
    });

    characterSet.onclick = () => {
      responseRegister.clickTime.push(performance.now());
      responseRegister.current.push(a.toLowerCase());
      safeExecuteFunc(extraFunction, a); // TEMP? For reading response
      characterSet.style.border = "2px solid black";
      characterSet.style.backgroundColor = "lightgray";
    };
    characterSetHolder.appendChild(characterSet);
  }
};
