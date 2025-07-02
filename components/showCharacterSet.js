import { paramReader } from "../threshold";
import { switchKind } from "./blockTargetKind";
import {
  showCharacterSetResponse,
  letterConfig,
  readingConfig,
  font as globalFont,
  displayOptions,
  correctAns,
} from "./global";
import {
  colorRGBASnippetToRGBA,
  safeExecuteFunc,
  xyPxOfDeg,
  logger,
} from "./utils";
import { canClick } from "./response";
import { XYPxOfDeg } from "./multiple-displays/utils.ts";

function getCharacterSetShowPos(ele, showWhere, font = "") {
  switch (showWhere) {
    case "bottom":
      ele.style.bottom = "10%";
      break;
    default:
      ele.style.bottom = "10%";
      break;
  }
  if (font == "Pelli.woff2") {
    ele.style["height"] = "45%";
  }
}

export function getCharacterSetShowText(valid) {
  return valid.join(" ");
}

export function setupClickableCharacterSet(
  ans,
  font,
  letterSpacing,
  where,
  responseRegister,
  extraFunction = null,
  extraCharClassName = "",
  targetKind = "",
  blockOrCondition,
  responseType,
) {
  const characterSetHolder = document.createElement("div");
  characterSetHolder.id = "characterSet-holder";
  characterSetHolder.className = "characterSet-holder";

  characterSetHolder.style.fontFamily = `"${font}"`;

  // Set color based on specified instruction color
  let color = paramReader.read("instructionFontColorRGBA", blockOrCondition);
  if (Array.isArray(color)) color = color[0];
  color = colorRGBASnippetToRGBA(color);
  characterSetHolder.style.color = color;

  characterSetHolder.style.direction = globalFont.ltr ? "ltr" : "rtl";
  if (
    letterSpacing === 0 ||
    !["string", "number"].includes(typeof letterSpacing)
  )
    characterSetHolder.style.letterSpacing = "normal";
  else {
    characterSetHolder.style.letterSpacing = String(letterSpacing) + "em";
  }

  if (targetKind == "sound") {
    characterSetHolder.style.display = "grid";
    // characterSetHolder.style.flexWrap = "wrap";
    characterSetHolder.style.gridTemplateColumns = "repeat(4,20vw)";
    characterSetHolder.style.gridTemplateRows = "repeat(7,7vh)";
    characterSetHolder.style.gridAutoFlow = "column";
  }

  getCharacterSetShowPos(characterSetHolder, where, font);

  pushCharacterSet(
    ans,
    characterSetHolder,
    responseRegister,
    extraFunction,
    extraCharClassName,
    targetKind,
    blockOrCondition,
    responseType,
    letterSpacing,
  );

  document.body.appendChild(characterSetHolder);
  if (!["sound", "reading"].includes(targetKind))
    scaleFontSizeToFit(
      characterSetHolder,
      "characterSet",
      targetKind === "vernier" ? 0.2 : 0.8,
    );

  return characterSetHolder;
}

export function removeClickableCharacterSet(
  responseRegister,
  characterSetStim,
) {
  responseRegister.current = [];
  responseRegister.onsetTime = 0;
  responseRegister.clickTime = [];
  characterSetStim?.setAutoDraw(false);

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
  targetKind = "",
  blockOrCondition,
  responseType,
  letterSpacing = 0,
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
    targetKind,
    blockOrCondition,
    responseType,
    letterSpacing,
  );
  return characterSetHolder;
}

const shuffleArray = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
/* -------------------------------------------------------------------------- */

const pushCharacterSet = (
  ans,
  characterSetHolder,
  responseRegister,
  extraFunction = null,
  extraCharClassName = "",
  targetKind = "",
  blockOrCondition,
  responseType,
  letterSpacing = 0,
) => {
  // make sure ans is unique
  const uniqueAns = [...new Set(ans)];
  let uniqueAnsLimited = uniqueAns;

  if (
    targetKind === "letter" &&
    letterConfig.responseMaxOptions > 0 &&
    letterConfig.responseMaxOptions < uniqueAns.length &&
    correctAns.current.length > 0
  ) {
    const maxTotalOptions = letterConfig.responseMaxOptions;
    const correct = uniqueAns.find(
      (a) => a.toLowerCase() === correctAns.current[0].toLowerCase(),
    );
    const others = uniqueAns.filter((a) => a !== correct);
    const foils = shuffleArray(others).slice(0, maxTotalOptions - 1);
    uniqueAnsLimited = [correct, ...foils].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }
  for (const a of uniqueAnsLimited) {
    const characterSet = document.createElement("span");
    characterSet.id = `clickableCharacter-${a.toLowerCase()}`;
    characterSet.className = "characterSet";
    if (extraCharClassName.length)
      characterSet.classList.add(extraCharClassName);

    // const addFakeConnection =
    //   letterConfig.spacingRelationToSize === "typographic";
    const addFakeConnection = globalFont.medialShapeResponse;

    if (addFakeConnection)
      characterSet.style.fontVariantLigatures = "discretionary-lig-values";

    characterSet.innerHTML =
      addFakeConnection && targetKind !== "reading" ? `&zwj;${a}&zwj;` : a;
    characterSet.style.direction = globalFont.ltr ? "ltr" : "rtl";

    // Set color based on specified instruction color
    let color = paramReader.read("instructionFontColorRGBA", blockOrCondition);
    if (Array.isArray(color)) color = color[0];
    color = colorRGBASnippetToRGBA(color);
    characterSet.style.color = color;

    // TODO customize for letter config
    characterSet.style.fontSize = "2rem";

    switchKind(targetKind, {
      reading: () => {
        if (readingConfig.height !== undefined)
          characterSet.style.fontSize = `${readingConfig.height}px`;
        else characterSet.style.fontSize = "2rem";
      },
      sound: () => {
        characterSet.style.fontSize = "1rem";
        characterSet.style.textAlign = "left";
      },
    });

    if (
      letterSpacing === 0 ||
      !["string", "number"].includes(typeof letterSpacing)
    ) {
      characterSet.style.letterSpacing = "normal";
    } else {
      characterSet.style.letterSpacing = `${String(letterSpacing)}em`;
    }

    if (canClick(responseType)) {
      characterSet.onclick = () => {
        responseRegister.clickTime.push(performance.now());
        responseRegister.current.push(a.toLowerCase());
        safeExecuteFunc(extraFunction, a); // TEMP? For reading response
        characterSet.style.border = "2px solid black";
        characterSet.style.backgroundColor = "lightgray";
      };
    }
    characterSetHolder.appendChild(characterSet);
  }
};

export const toggleClickedCharacters = () => {
  const clickedCharacterElems =
    showCharacterSetResponse.alreadyClickedCharacters.map((c) =>
      document.getElementById(`clickableCharacter-${c.toLowerCase()}`),
    );
  clickedCharacterElems.forEach((e) => {
    if (e) {
      e.style.border = "2px solid black";
      e.style.backgroundColor = "lightgray";
    }
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
export const scaleFontSizeToFit = (
  elem,
  childrenClass,
  allowedHeightRatio = 0.85,
) => {
  // TODO support multidimensional?
  const minFontSize = getMinFontSize();
  const parent = elem.parentNode;
  const startingWidth = elem.offsetWidth;
  const containingWidth = parent.clientWidth;
  const containingHeight = parent.clientHeight;
  if (startingWidth === containingWidth) return;
  const scale = (x) =>
    document
      .querySelectorAll("." + childrenClass)
      .forEach((e) => (e.style["font-size"] = String(x) + "px"));
  const unit = 1;
  const maxNonOverlapSizeForFont = 260; // adding this to avoid thinner fonts like pelli to cover the entire window, as their width woud be <<< screen width and loop will increase the font-size.
  let newSize = minFontSize; // Start with smallest ADA complient font
  scale(newSize);
  elem.style["overflow"] = "hidden";
  elem.style["white-space"] = "nowrap";
  if (elem.style["font-family"] === '"Pelli.woff2"') {
    document
      .querySelectorAll("." + childrenClass)
      .forEach((e) => (e.style["height"] = "100%"));
  }
  while (
    elem.offsetWidth < containingWidth &&
    elem.offsetHeight < containingHeight * allowedHeightRatio &&
    newSize + unit < maxNonOverlapSizeForFont
  ) {
    newSize += unit;
    scale(newSize);
  }
  // Scale back down to the last size that fits
  const sizeToUse = Math.max(minFontSize, newSize - unit);
  scale(sizeToUse);
  return sizeToUse;
};

export const getMinFontSize = () => {
  try {
    if (letterConfig.targetMinimumPix) {
      return letterConfig.targetMinimumPix;
    } else {
      const distanceBasedMinSize = Math.ceil(XYPxOfDeg(0, [0.15, 0])[0]);
      return Math.max(distanceBasedMinSize, 12);
    }
  } catch (e) {
    return 12;
  }
};
