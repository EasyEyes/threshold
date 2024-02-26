import { getInstructionText } from "./compatibilityCheck.js";
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
  img
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
      if (input.value === "Apple" && deviceDetails.PlatformName == "iOS") {
        img.style.visibility = "visible";
      } else {
        img.style.visibility = "hidden";
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
          if (input.value === "Apple" && deviceDetails.PlatformName == "iOS") {
            img.style.visibility = "visible";
          } else {
            img.style.visibility = "hidden";
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

export const matchPhoneModelInDatabase = async (
  brand,
  modelName,
  modelNumber,
  smallerSize,
  biggerSize,
  OS
) => {
  let result = {
    type: "none",
    Manufacturer: false,
    ModelName: false,
    ModelNumber: false,
    OS: false,
    size: false,
  };

  const brandsInDatabase = filterModelsByBrand(PhoneModelsInDatabase, brand);
  if (brandsInDatabase.length === 0) {
    return result;
  }
  result.Manufacturer = true; // brand is in database

  // Check if model name is in database
  const modelNames = brandsInDatabase.map((model) => model["Model Name"]);
  const modelNamesLowerCase = modelNames.map((model) => model.toLowerCase());
  const index = modelNamesLowerCase.indexOf(modelName.toLowerCase());
  if (index === -1) {
    result.type = "partial";
    return result;
  }
  result.ModelName = true;

  // Check if model number is in database
  // Each model object has a property "Model Numbers" which is an array of model numbers
  const modelNumbers = brandsInDatabase[index]["Model Numbers"];
  const modelNumbersLowerCase = modelNumbers.map((model) =>
    model.toLowerCase()
  );
  const index2 = modelNumbersLowerCase.indexOf(modelNumber.toLowerCase());
  if (index2 === -1) {
    result.type = "partial";
    return result;
  }
  result.ModelNumber = true;

  // Check if OS is in database
  // Each model object has a property "OS" which is a string. compare the lowercase version
  const os = brandsInDatabase[index]["OS"];
  if (os.toLowerCase() !== OS.toLowerCase()) {
    result.type = "partial";
    return result;
  }
  result.OS = true;

  // Check if size is in database
  // Each model object has properties "Smaller Size (Pixels)" and "Bigger Size (Pixels)" which are just numbers
  // both have to match for the size to be correct
  const smallerSizes = brandsInDatabase[index]["Smaller Size (Pixels)"];
  const biggerSizes = brandsInDatabase[index]["Bigger Size (Pixels)"];
  if (smallerSizes !== smallerSize || biggerSizes !== biggerSize) {
    result.type = "partial";
    return result;
  }
  result.size = true;
  result.type = "full";
  return result;
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

  cantReadButton.classList.add("btn", "btn-secondary", "btn-sm");
  preferNotToReadButton.classList.add("btn", "btn-secondary", "btn-sm");
  noSmartphoneButton.classList.add("btn", "btn-secondary", "btn-sm");

  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.flexDirection = "column";
  buttonContainer.style.marginTop = "13px";
  buttonContainer.style.marginBottom = "13px";
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
