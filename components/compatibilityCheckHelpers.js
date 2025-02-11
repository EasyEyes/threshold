import {
  getInstructionText,
  getPreferredModelNumberAndName,
} from "./compatibilityCheck.js";
import Swal from "sweetalert2";
import { db } from "./firebase/firebase.js";
import { collection, getDocs, query, where } from "firebase/firestore";
import { readi18nPhrases } from "./readPhrases.js";

export const PhoneModelsInDatabase = [];
export const AllModelNames = [];
export const AllModelNumbers = [];
export const AllBrands = [];

export const getAutoCompleteSuggestionElements = (
  type,
  suggestions,
  input,
  preferredModelNumberLowercase,
  deviceDetails,
  lang,
  needPhoneSurvey,
  p,
  img,
  modelNameInput,
  modelNumberInput,
  showSuggestionBool = true,
) => {
  const suggestionContainer = document.createElement("div");
  suggestionContainer.classList.add("autocomplete-items");
  input.addEventListener("input", () => {
    if (input.value === "") {
      suggestionContainer.innerHTML = "";
      return;
    }
    if (
      (input.value === "Apple" || AllBrands.includes(input.value)) &&
      type === "Brand"
    ) {
      const inst = getInstructionText(
        deviceDetails,
        lang,
        true,
        false,
        preferredModelNumberLowercase,
        needPhoneSurvey,
        input.value,
      );
      p.innerHTML = inst.replace(/(?:\r\n|\r|\n)/g, "<br>");

      if (input.value === "Apple") {
        img.style.display = "block";
        const { preferredModelNumber, preferredModelName } =
          getPreferredModelNumberAndName("Apple", "iOS", lang);
        modelNumberInput.placeholder = preferredModelNumber;

        modelNameInput.placeholder = preferredModelName;
      } else {
        img.style.display = "none";
        const { preferredModelNumber, preferredModelName } =
          getPreferredModelNumberAndName(input.value, "", lang);

        modelNumberInput.placeholder = preferredModelNumber;
        modelNameInput.placeholder = preferredModelName;
      }
    } else if (type === "Brand") {
      const inst = getInstructionText(
        deviceDetails,
        lang,
        true,
        false,
        preferredModelNumberLowercase,
        needPhoneSurvey,
        input.value,
      );
      p.innerHTML = inst.replace(/(?:\r\n|\r|\n)/g, "<br>");
      img.style.display = "none";
      const { preferredModelNumber, preferredModelName } =
        getPreferredModelNumberAndName(input.value, "", lang);
      modelNumberInput.placeholder = preferredModelNumber;

      modelNameInput.placeholder = preferredModelName;
    }
    if (!showSuggestionBool) {
      suggestionContainer.innerHTML = "";
      return;
    }
    const brandSuggestions = suggestions.filter((brand) =>
      brand.toLowerCase().includes(input.value.toLowerCase()),
    );
    suggestionContainer.innerHTML = "";
    if (brandSuggestions.length === 0) {
      const noResult = document.createElement("div");
      noResult.classList.add("autocomplete-item");
      // noResult.style.color = "#ff0000";
      noResult.innerHTML = readi18nPhrases("EE_notRecognized", lang);
      suggestionContainer.appendChild(noResult);
      return;
    }
    brandSuggestions.forEach((brand) => {
      const suggestion = document.createElement("div");
      suggestion.classList.add("autocomplete-item");
      // highlight the matching part of the brand
      const index = brand.toLowerCase().indexOf(input.value.toLowerCase());
      const matchingPart = brand.slice(index, index + input.value.length);
      const rest = brand.slice(index + input.value.length);
      const firstPart = brand.slice(0, index);
      suggestion.innerHTML =
        firstPart +
        '<span class="highlight">' +
        matchingPart +
        "</span>" +
        rest;
      suggestion.addEventListener("click", () => {
        input.value = brand;
        suggestionContainer.innerHTML = "";
        if (AllBrands.includes(input.value) && type === "Brand") {
          const inst = getInstructionText(
            deviceDetails,
            lang,
            true,
            false,
            preferredModelNumberLowercase,
            needPhoneSurvey,
            input.value,
          );
          p.innerHTML = inst.replace(/(?:\r\n|\r|\n)/g, "<br>");
          if (input.value === "Apple") {
            img.style.display = "block";
            const { preferredModelNumber, preferredModelName } =
              getPreferredModelNumberAndName("Apple", "iOS", lang);
            modelNumberInput.placeholder = preferredModelNumber;

            modelNameInput.placeholder = preferredModelName;
          } else {
            img.style.display = "none";
            const { preferredModelNumber, preferredModelName } =
              getPreferredModelNumberAndName(input.value, "", lang);

            modelNumberInput.placeholder = preferredModelNumber;
            modelNameInput.placeholder = preferredModelName;
          }
        } else if (type === "Brand") {
          const inst = getInstructionText(
            deviceDetails,
            lang,
            true,
            false,
            preferredModelNumberLowercase,
            needPhoneSurvey,
            input.value,
          );
          p.innerHTML = inst.replace(/(?:\r\n|\r|\n)/g, "<br>");
          img.style.display = "none";
          const { preferredModelNumber, preferredModelName } =
            getPreferredModelNumberAndName(input.value, "", lang);
          modelNumberInput.placeholder = preferredModelNumber;

          modelNameInput.placeholder = preferredModelName;
        }
      });
      suggestionContainer.appendChild(suggestion);
    });
  });
  document.addEventListener("click", function (event) {
    const isClickInsideAutocomplete = event.target.closest(".autocomplete");

    if (!isClickInsideAutocomplete) {
      // Clear suggestions when clicked outside the autocomplete container
      suggestionContainer.innerHTML = "";
      //   check if input is not empty and recalculate instruction text
      if (input.value !== "") {
        const instruction = document.getElementById("instruction");
      }
    }
  });
  return suggestionContainer;
};

const fetchModelsByBrand = async (brand) => {
  const q = query(collection(db, "PhoneModels"), where("Brand", "==", brand));
  const querySnapshot = await getDocs(q);
  const models = [];
  querySnapshot.forEach((doc) => {
    models.push(doc.data());
  });
  return models;
};
export const fetchAllPhoneModels = async () => {
  const q = query(collection(db, "PhoneModels"));
  const querySnapshot = await getDocs(q);
  const models = [];
  querySnapshot.forEach((doc) => {
    models.push(doc.data());
  });
  // return models;
  // append to PhoneModelsInDatabase
  models.forEach((model) => {
    PhoneModelsInDatabase.push(model);
    //   push to AllBrands, AllModelNames, AllModelNumbers (make sure no duplicates)
    if (!AllBrands.includes(model["Brand"])) {
      AllBrands.push(model["Brand"].trim());
    }
    if (!AllModelNames.includes(model["Model Name"])) {
      AllModelNames.push(model["Model Name"].trim());
    }
    model["Model Numbers"].forEach((modelNumber) => {
      if (!AllModelNumbers.includes(modelNumber)) {
        AllModelNumbers.push(modelNumber.trim());
      }
    });
  });
};

const filterModelsByBrand = (models, brand) => {
  // return models where Brand==brand
  return models.filter((model) => model["Brand"] === brand);
};

const doesMicrophoneExistInFirestore = async (speakerID, OEM) => {
  const collectionRef = collection(db, "Microphones");
  // get the document in the collection with the speakerID, OEM and isDefault = true
  const q = query(
    collectionRef,
    where("ID", "==", speakerID),
    where("lowercaseOEM", "==", OEM),
    where("isDefault", "==", true),
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.size > 0) {
    return true;
  }
  console.log("Does not exist");
  return false;
};

export const matchPhoneModelInDatabase = async (
  brand,
  modelName,
  modelNumber,
  smallerSize,
  biggerSize,
) => {
  const r = {
    phoneModelNameKnownBool: false,
    phoneModelNumberKnownBool: false,
    phoneModelPixelsKnownBool: false,
    phoneModelNameAndNumberAgreeBool: false,
    phoneModelNumberAndPixelsAgreeBool: false,
    phoneModelKnownBool: false,
    phoneModelNameInLibraryBool: false,
    phoneModelProfiledBool: false,
  };

  //check if ModelName and ModelNumber are known
  AllModelNames.forEach((name) => {
    if (name.toLowerCase() === modelName.toLowerCase()) {
      r.phoneModelNameKnownBool = true;
    }
  });
  AllModelNumbers.forEach((number) => {
    if (number.toLowerCase() === modelNumber.toLowerCase()) {
      r.phoneModelNumberKnownBool = true;
    }
  });
  PhoneModelsInDatabase.forEach((model) => {
    if (
      model["Model Name"].toLowerCase() === modelName.toLowerCase() &&
      model["Model Numbers"].includes(modelNumber)
    ) {
      r.phoneModelNameAndNumberAgreeBool = true;
    }
    if (
      model["Smaller Size (Pixels)"] === smallerSize &&
      model["Bigger Size (Pixels)"] === biggerSize
    ) {
      r.phoneModelPixelsKnownBool = true;
    }
    if (
      model["Model Numbers"].includes(modelNumber) &&
      model["Smaller Size (Pixels)"] === smallerSize &&
      model["Bigger Size (Pixels)"] === biggerSize
    ) {
      r.phoneModelNumberAndPixelsAgreeBool = true;
    }
  });
  if (
    r.phoneModelNameAndNumberAgreeBool &&
    r.phoneModelNumberAndPixelsAgreeBool
  ) {
    r.phoneModelKnownBool = true;
  }
  const lowercaseOEM = brand.toLowerCase().split(" ").join("");
  const doesMicrophoneExistInLibrary = await doesMicrophoneExistInFirestore(
    modelNumber,
    lowercaseOEM,
  );
  if (doesMicrophoneExistInLibrary) {
    r.phoneModelNameInLibraryBool = true;
    if (r.phoneModelKnownBool) {
      r.phoneModelProfiledBool = true;
    }
  }
  return r;
};

export const addQRSkipButtons = (
  lang,
  QRElem,
  qrlink = "[]",
  needPhoneSurvey = true,
) => {
  // Main container with 3 columns
  const container = document.createElement("div");
  container.style.display = "flex";
  // container.style.justifyContent = "space-between";
  container.style.alignItems = "flex-start";
  container.style.paddingTop = "8px";
  container.id = "skipQRContainer";

  // Column 1: QR Code
  const qrColumn = document.createElement("div");
  qrColumn.style.flex = "0 0 auto";
  // qrColumn.style.padding = "10px";
  QRElem.style.display = "block";
  qrColumn.appendChild(QRElem);

  // Column 2: Explanation Text
  const textColumn = document.createElement("div");
  textColumn.style.flex = "1";
  textColumn.style.padding = "0 20px";
  textColumn.style.maxWidth = "560px"; // Adjust as needed

  const explanation = document.createElement("p");
  explanation.id = "skipQRExplanation";
  explanation.style.margin = "0";
  explanation.style.textAlign = "left";
  explanation.innerHTML = formatLineBreak(
    readi18nPhrases(
      needPhoneSurvey
        ? "RC_skipQR_Explanation"
        : "RC_skipQR_ExplanationWithoutPreferNot",
      lang,
    ),
    readi18nPhrases("RC_checkInternetConnection", lang),
  )
    .replace("xxx", `<b>${qrlink}</b>`)
    .replace("XXX", `<b>${qrlink}</b>`);

  const checkConnection = document.createElement("a");
  checkConnection.id = "check-connection";
  checkConnection.href = "#";
  checkConnection.innerHTML = "check the phone's internet connection";
  checkConnection.addEventListener("click", function (event) {
    event.preventDefault();
    createAndShowPopup(lang);
  });
  explanation.querySelector("a#check-connection").replaceWith(checkConnection);
  textColumn.appendChild(explanation);

  // Column 3: Buttons
  const buttonColumn = document.createElement("div");
  buttonColumn.style.display = "flex";
  buttonColumn.style.flexDirection = "column";
  buttonColumn.style.gap = "10px";
  buttonColumn.style.flex = "0 0 auto";
  buttonColumn.style.alignItems = "flex-end";

  const createButton = (id, phraseKey) => {
    const button = document.createElement("button");
    button.id = id;
    button.classList.add("needs-page-button");
    button.innerHTML = readi18nPhrases(phraseKey, lang).replace(" ", "<br>");
    return button;
  };

  const cantReadButton = createButton("cantReadButton", "RC_cantReadQR_Button");
  const preferNotToReadButton = createButton(
    "preferNotToReadButton",
    "RC_preferNotToReadQR_Button",
  );
  const noSmartphoneButton = createButton(
    "noSmartphoneButton",
    "RC_noSmartphone_Button",
  );

  buttonColumn.appendChild(cantReadButton);
  if (needPhoneSurvey) {
    buttonColumn.appendChild(preferNotToReadButton);
  }
  buttonColumn.appendChild(noSmartphoneButton);

  // Assemble the columns
  container.appendChild(qrColumn);
  container.appendChild(textColumn);
  container.appendChild(buttonColumn);

  return {
    qrContainer: container,
    cantReadButton,
    preferNotToReadButton,
    noSmartphoneButton,
    explanation,
  };
};

export const formatLineBreak = (inputStr, checkInternetConnection) => {
  let finalStr = inputStr
    .replace(/\n/g, "<br>")
    .replace(
      "LLL",
      `<a href="#" id="check-connection">${checkInternetConnection}</a>`,
    );

  console.log(finalStr);

  return finalStr;
};

const createAndShowPopup = (language) => {
  Swal.fire({
    html: `
    <div style="text-align: left;"> 
    ${convertAsterisksToList(
      readi18nPhrases("RC_NeedInternetConnectedPhone", language).replace(
        /\n/g,
        "<br>",
      ),
    )}
    </div>
      <div class="col-3" style="margin-top:10px;">
        <button id="okaybtn" class="btn btn-lg btn-dark">
          ${readi18nPhrases("EE_ok", language)}
        </button>
      </div>`,
    showConfirmButton: false,
    position: "bottom",
    width: "40%",
    customClass: {
      container: "no-background",
    },
    showClass: {
      popup: "fade-in",
    },
    hideClass: {
      popup: "",
    },
    didOpen: () => {
      const okayBtn = document.getElementById("okaybtn");
      okayBtn.style.display = "flex";
      okayBtn.addEventListener("click", () => {
        Swal.close(); // Close the Swal popup
      });
    },
  });
};

export function convertAsterisksToList(content) {
  // Replace * with <li> and convert line breaks to </li><li>
  console.log(content);
  let result = content
    .replace(/\* (.*?)(<br>|$)/g, "<li>$1</li>")
    .replace(/(<li>)(<\/li>)\s*$/, "") // Remove trailing </li>
    .replace("<li>", '<ul style="padding-left:40px"> <br> <li>');
  result = result.replace(/<\/li>(\d+\.)/, "</li></ul>$1");
  return result;
}
