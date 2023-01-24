import { switchKind } from "./blockTargetKind";
import {
  showCharacterSetResponse,
  letterConfig,
  readingConfig,
  font as globalFont,
} from "./global";
import { colorRGBASnippetToRGBA, safeExecuteFunc } from "./utils";

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
  characterSetHolder.style.color = colorRGBASnippetToRGBA(globalFont.colorRGBA);
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
  if (targetKind !== "sound")
    scaleFontSizeToFit(characterSetHolder, "characterSet");

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
  for (const a of ans) {
    const characterSet = document.createElement("span");

    if (targetKind == "sound") {
      characterSet.style.fontSize = "1rem";
      characterSet.style.textAlign = "left";
    }

    characterSet.id = `clickableCharacter-${a.toLowerCase()}`;
    characterSet.className = "characterSet";
    if (extraCharClassName.length)
      characterSet.classList.add(extraCharClassName);

    // const addFakeConnection =
    //   letterConfig.spacingRelationToSize === "typographic";
    const addFakeConnection = letterConfig.responseCharacterHasMedialShape;

    if (addFakeConnection)
      characterSet.style.fontVariantLigatures = "discretionary-lig-values";

    characterSet.innerHTML =
      addFakeConnection && targetKind !== "reading" ? `&zwj;${a}&zwj;` : a;
    characterSet.style.direction = globalFont.ltr ? "ltr" : "rtl";

    characterSet.style.color = colorRGBASnippetToRGBA(globalFont.colorRGBA);

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

export const toggleClickedCharacters = () => {
  const clickedCharacterElems =
    showCharacterSetResponse.alreadyClickedCharacters.map((c) =>
      document.getElementById(`clickableCharacter-${c.toLowerCase()}`)
    );
  clickedCharacterElems.forEach((e) => {
    e.style.border = "2px solid black";
    e.style.backgroundColor = "lightgray";
  });
};

/**
 * Scale children font size to maximize space within a container.
 * Specifically, given an element (elem), scale the font-size of
 * elem's children (specified as all elems with class=childrenClass)
 * such that elem takes up all the space of its parent.
 * Used to scale the clickable character set used for responses.
 * @param {HTMLElement} elem
 * @param {string} childrenClass
 */
const scaleFontSizeToFit = (elem, childrenClass) => {
  // TODO support multidimensional?
  const parent = elem.parentNode;
  const startingWidth = elem.offsetWidth;
  const maxNonOverlapSizeForFont = 360; // adding this to avoid thinner fonts like pelli to cover the entire window, as their width woud be <<< screen width and loop will increase the font-size.
  const startingSize = window
    .getComputedStyle(elem, null)
    .getPropertyValue("font-size");
  const containingWidth = parent.offsetWidth;
  const unit = 5;
  let newSize = parseFloat(startingSize);
  if (startingWidth === containingWidth) return;
  const scale = (x) =>
    document
      .querySelectorAll("." + childrenClass)
      .forEach((e) => (e.style["font-size"] = String(x) + "px"));
  elem.style["overflow"] = "hidden";
  elem.style["white-space"] = "nowrap";
  while (
    elem.offsetWidth < containingWidth &&
    newSize + unit < maxNonOverlapSizeForFont
  ) {
    scale(newSize + unit);
    newSize += unit;
  }
  scale(newSize);
};
