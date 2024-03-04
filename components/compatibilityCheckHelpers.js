import {
  getInstructionText,
  getPreferredModelNumberAndName,
} from "./compatibilityCheck.js";
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
  preferredModelNumber,
  deviceDetails,
  lang,
  needPhoneSurvey,
  p,
  img,
  modelNameInput,
  modelNumberInput
) => {
  const suggestionContainer = document.createElement("div");
  suggestionContainer.classList.add("autocomplete-items");
  input.addEventListener("input", () => {
    if (input.value === "") {
      suggestionContainer.innerHTML = "";
      return;
    }
    if (AllBrands.includes(input.value) && type === "Brand") {
      const inst = getInstructionText(
        deviceDetails,
        lang,
        true,
        false,
        preferredModelNumber,
        needPhoneSurvey,
        input.value
      );
      p.innerHTML = inst.replace(/(?:\r\n|\r|\n)/g, "<br>");

      if (input.value === "Apple") {
        img.style.visibility = "visible";
        preferredModelNumber = getPreferredModelNumberAndName(
          "Apple",
          "iOS",
          lang
        )["preferredModelNumber"];
        modelNumberInput.placeholder = preferredModelNumber;
      } else {
        img.style.visibility = "hidden";
        preferredModelNumber = getPreferredModelNumberAndName(
          input.value,
          "",
          lang
        )["preferredModelNumber"];
        modelNumberInput.placeholder = preferredModelNumber;
      }
    }
    const brandSuggestions = suggestions.filter((brand) =>
      brand.toLowerCase().includes(input.value.toLowerCase())
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
        if (AllBrands.includes(input.value)) {
          const inst = getInstructionText(
            deviceDetails,
            lang,
            true,
            false,
            preferredModelNumber,
            needPhoneSurvey,
            input.value
          );
          p.innerHTML = inst.replace(/(?:\r\n|\r|\n)/g, "<br>");
          if (input.value === "Apple") {
            img.style.visibility = "visible";
            preferredModelNumber = getPreferredModelNumberAndName(
              "Apple",
              "iOS",
              lang
            )["preferredModelNumber"];
            modelNumberInput.placeholder = preferredModelNumber;
          } else {
            img.style.visibility = "hidden";
            preferredModelNumber = getPreferredModelNumberAndName(
              input.value,
              "",
              lang
            )["preferredModelNumber"];
            modelNumberInput.placeholder = preferredModelNumber;
          }
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
    where("isDefault", "==", true)
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.size > 0) {
    console.log("Existsss");
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
  OS
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
    lowercaseOEM
  );
  if (doesMicrophoneExistInLibrary) {
    r.phoneModelNameInLibraryBool = true;
    if (r.phoneModelKnownBool) {
      r.phoneModelProfiledBool = true;
    }
  }
  return r;
};

export const addQRSkipButtons = (lang, QRElem) => {
  const container = document.createElement("div");
  container.style.display = "flex";
  const cantReadButton = document.createElement("button");
  const preferNotToReadButton = document.createElement("button");
  const noSmartphoneButton = document.createElement("button");

  cantReadButton.innerHTML = readi18nPhrases("RC_cantReadQR_Button", lang);
  preferNotToReadButton.innerHTML = readi18nPhrases(
    "RC_preferNotToReadQR_Button",
    lang
  );
  noSmartphoneButton.innerHTML = readi18nPhrases(
    "RC_noSmartphone_Button",
    lang
  );

  cantReadButton.classList.add("needs-page-button");
  preferNotToReadButton.classList.add("needs-page-button");
  noSmartphoneButton.classList.add("needs-page-button");

  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.flexDirection = "column";
  buttonContainer.style.margin = "13px";
  buttonContainer.style.justifyContent = "space-between";

  buttonContainer.appendChild(cantReadButton);
  buttonContainer.appendChild(preferNotToReadButton);
  buttonContainer.appendChild(noSmartphoneButton);

  container.appendChild(QRElem);
  container.appendChild(buttonContainer);

  const explanation = document.createElement("p");
  explanation.innerHTML = readi18nPhrases("RC_skipQR_Explanation", lang);
  const qrContainer = document.createElement("div");
  qrContainer.appendChild(container);
  qrContainer.appendChild(explanation);

  return {
    qrContainer,
    cantReadButton,
    preferNotToReadButton,
    noSmartphoneButton,
  };
};
