import { readi18nPhrases } from "./readPhrases";
import { ref, set, get, child } from "firebase/database";
import database, { db } from "./firebase/firebase.js";
import { microphoneInfo } from "./global";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";

export const identifyDevice = async () => {
  try {
    const deviceInfo = {};
    fod.complete(function (data) {
      deviceInfo["IsMobile"] = data.device["ismobile"];
      deviceInfo["HardwareName"] = data.device["hardwarename"];
      deviceInfo["HardwareFamily"] = data.device["hardwarefamily"];
      deviceInfo["HardwareModel"] = data.device["hardwaremodel"];
      deviceInfo["OEM"] = data.device["oem"];
      deviceInfo["HardwareModelVariants"] =
        data.device["hardwaremodelvariants"];
      deviceInfo["DeviceId"] = data.device["deviceid"];
      deviceInfo["PlatformName"] = data.device["platformname"];
      deviceInfo["PlatformVersion"] = data.device["platformversion"];
      deviceInfo["DeviceType"] = data.device["devicetype"];
    });
    return deviceInfo;
  } catch (error) {
    console.error("Error fetching or executing script:", error.message);
    return null;
  }
};

export const getDebugIIR = () => {
  return [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
};

export const getDebugSoundCalibrationResults = () => {
  return {
    outDBSPL1000Values: [103.3, 102.9, 102.0, 95.3, 85.2, 75],
    thdValues: [
      85.7, 82.1, 79.3, 78.2, 76.4, 74.5, 73.4, 70.3, 63.0, -60.1, 47.8, 11.4,
    ],
    outDBSPLValues: [
      85.7, 82.1, 79.3, 78.2, 76.4, 74.5, 73.4, 70.3, 63.0, -60.1, 47.8, 11.4,
    ],
    parameters: {
      T: 100,
      W: 10,
      R: 1000,
      backgroundDBSPL: 18.6,
      gainDBSPL: 125,
      RMSError: 0.1,
    },
  };
};

export const saveLoudSpeakerInfo = async (
  loudSpeakerInfo,
  modelNumber,
  OEM,
  iir,
  ir
) => {
  console.log("Saving LoudSpeaker Info");
  const dbRef = ref(database);
  await set(child(dbRef, `LoudSpeaker/${OEM}/${modelNumber}`), loudSpeakerInfo);
  // save iir
  await set(child(dbRef, `LoudSpeaker/${OEM}/${modelNumber}/iir`), iir);
  // save ir
  await set(child(dbRef, `LoudSpeaker/${OEM}/${modelNumber}/ir`), ir);
};

export const saveLoudSpeakerInfoToFirestore = async (
  loudSpeakerInfo,
  modelNumber,
  OEM,
  iir,
  ir
) => {
  console.log("Saving LoudSpeaker Info");
  const collectionRef = collection(db, "LoudSpeaker", OEM, modelNumber);
  // add doc to collection. save loudSpeakerInfo first then iir and ir
  await addDoc(collectionRef, loudSpeakerInfo);
  // save iir
  await setDoc(doc(collectionRef, "iir"), iir);
  // save ir
  await setDoc(doc(collectionRef, "ir"), ir);
};

export const getInstructionText = (
  thisDevice,
  language,
  isSmartPhone,
  isLoudspeakerCalibration,
  preferredModelNumberText = "model number",
  needPhoneSurvey = false
) => {
  const microphoneInCalibrationLibrary = isLoudspeakerCalibration
    ? isSmartPhone
      ? ""
      : readi18nPhrases(
          "RC_microphoneIsInCalibrationLibrary",
          language
        ).replace(
          "xxx",
          `${microphoneInfo.current.micrFullManufacturerName} ${microphoneInfo.current.micFullName}`
        ) + "<br> <br>"
    : "";
  const needModelNumber = isSmartPhone
    ? needPhoneSurvey
      ? readi18nPhrases("RC_needPhoneModel", language)
      : readi18nPhrases("RC_needPhoneModel", language)
    : readi18nPhrases("RC_needModelNumberAndName", language);
  const preferredModelNumber = preferredModelNumberText;
  const needModelNumberFinal = needModelNumber
    .replace("mmm", preferredModelNumber)
    .replace("xxx", thisDevice.OEM === "Unknown" ? "unknown" : thisDevice.OEM)
    .replace(
      "yyy",
      thisDevice.DeviceType === "Unknown" ? "device" : thisDevice.DeviceType
    );
  const userOS = thisDevice.PlatformName;
  var findModelNumber = "";
  if (userOS === "Android") {
    findModelNumber = readi18nPhrases("RC_findModelAndroid", language);
  } else if (userOS === "iOS") {
    findModelNumber = readi18nPhrases("RC_findModelIOs", language);
  } else if (userOS === "Windows") {
    findModelNumber = readi18nPhrases("RC_findModelWindows", language);
  } else if (userOS === "macOS") {
    findModelNumber = readi18nPhrases("RC_findModelMacOs", language);
  } else if (userOS === "Linux") {
    findModelNumber = readi18nPhrases("RC_findModelLinux", language);
  } else {
    findModelNumber = readi18nPhrases("RC_findModeGeneric", language);
  }

  return isSmartPhone
    ? `${microphoneInCalibrationLibrary}${needModelNumberFinal} ${findModelNumber}`
    : `${microphoneInCalibrationLibrary}${needModelNumberFinal} <br> <br> ${findModelNumber}`;
};

export const getDeviceString = (thisDevice, language) => {
  const userOS = thisDevice.PlatformName;
  var findModelNumber = "";
  if (userOS === "Android") {
    findModelNumber = readi18nPhrases("RC_findModelAndroid", language);
  } else if (userOS === "iOS") {
    findModelNumber = readi18nPhrases("RC_findModelIOs", language);
  } else if (userOS === "Windows") {
    findModelNumber = readi18nPhrases("RC_findModelWindows", language);
  } else if (userOS === "macOS") {
    findModelNumber = readi18nPhrases("RC_findModelMacOs", language);
  }

  return `<b>OEM:</b> ${thisDevice.OEM} <br>
   <b>Device Type:</b> ${thisDevice.DeviceType} <br>
   <b>Platform Name:</b> ${thisDevice.PlatformName} <br>
   <b>Platform Version:</b> ${thisDevice.PlatformVersion} <br>
   <b>Hardware Model:</b> ${thisDevice.HardwareModel} <br>
   <b>Hardware Family:</b> ${thisDevice.HardwareFamily} <br>
   <b>Hardware Name:</b> ${thisDevice.HardwareName} <br>
   <b>Hardware Model Variants:</b> ${thisDevice.HardwareModelVariants} <br><br>`;
};

export const removeElements = (elms) => elms.forEach((el) => el.remove());

// doesMicrophoneExist (from firestore)
// structure: Microphone/{OEM}/{speakerID}/default
export const doesMicrophoneExistInFirestore = async (speakerID, OEM) => {
  const docRef = doc(db, "Microphone", OEM, speakerID, "default");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log("Existsss");
    return true;
  }
  console.log("Does not exist");
  return false;
};

export const doesMicrophoneExist = async (speakerID, OEM) => {
  const dbRef = ref(database);
  const snapshot = await get(child(dbRef, `Microphone2/${OEM}/${speakerID}`));
  if (snapshot.exists()) {
    return true;
  }
  return false;
};

export const addMicrophoneToFirestore = async (
  microphoneID,
  OEM,
  Data,
  isDefault
) => {
  // if default add data to Microphone/{OEM}/{speakerID}/default
  // if not default add data to Microphone/{OEM}/{speakerID}/randomAutoGeneratedID
  const collectionRef = collection(db, "Microphone", OEM, microphoneID);
  if (isDefault) {
    const docRef = doc(collectionRef, "default");
    await setDoc(docRef, Data);
  } else {
    await addDoc(collectionRef, Data);
  }
};

export const addMicrophoneToDatabase = async (microphoneID, OEM, Data) => {
  const dbRef = ref(database);
  await set(child(dbRef, `Microphone2/${OEM}/${microphoneID}`), Data);
};

export const readFrqGainFromFirestore = async (speakerID, OEM) => {
  const docRef = doc(db, "Microphone", OEM, speakerID, "default");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().linear;
  }
  return null;
};

export const readFrqGain = async (speakerID, OEM) => {
  const dbRef = ref(database);
  const snapshot = await get(
    child(dbRef, `Microphone2/${OEM}/${speakerID}/linear`)
  );
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return null;
};

export const getCalibrationFile = async (url) => {
  try {
    const file = await fetch(
      "https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/" + url
    ).then((response) => {
      return response.text();
    });
    if (file.includes("Sens Factor =")) {
      return file;
    }
    return false;
  } catch (error) {
    return false;
  }
};

export const parseCalibrationFile = (file) => {
  // Split the file content into lines
  const lines = file.split("\n");

  // Parse Sens Factor from the first line
  const sensFactorMatch = lines[0].match(/Sens Factor =([\d.-]+)dB/);
  const sensFactor = sensFactorMatch ? parseFloat(sensFactorMatch[1]) : null;

  const frequencies = [];
  const gains = [];
  // Iterate over each line starting from the third line
  for (let i = 2; i < lines.length; i++) {
    // Split the line into values (assuming tab-separated values)
    const values = lines[i].split("\t");

    // Convert the first value to a float and add it to the frequencies array
    const frequency = parseFloat(values[0]);
    const gain = sensFactor
      ? parseFloat(values[1]) + sensFactor - 97.01
      : parseFloat(values[1]) - 97.01;

    if (frequency && gain) {
      frequencies.push(frequency);
      gains.push(gain);
    }
  }

  // Create an object with 'Freq', 'Gain', and 'SensFactor' properties
  const data = { Freq: frequencies, Gain: gains, SensFactor: sensFactor };
  // Convert the object to a JSON string with indentation
  // const jsonString = JSON.stringify(data, null, 2);
  return data;
};

// Function to perform linear interpolation between two points
const interpolate = (x, x0, y0, x1, y1) => {
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
};

export const findGainatFrequency = (frequencies, gains, targetFrequency) => {
  // Find the index of the first frequency in the array greater than the target frequency
  let index = 0;
  while (index < frequencies.length && frequencies[index] < targetFrequency) {
    index++;
  }

  // Handle cases when the target frequency is outside the range of the given data
  if (index === 0) {
    return gains[0];
  } else if (index === frequencies.length) {
    return gains[gains.length - 1];
  } else {
    // Interpolate the gain based on the surrounding frequencies
    const x0 = frequencies[index - 1];
    const y0 = gains[index - 1];
    const x1 = frequencies[index];
    const y1 = gains[index];
    return interpolate(targetFrequency, x0, y0, x1, y1);
  }
};

export const getDeviceDetails = (platformName, lang) => {
  let OS = "";
  let preferredModelNumber = "";
  let findModel = "";
  switch (platformName) {
    case "iOS":
      OS = "IOS";
      break;
    case "macOS":
      OS = "macOS";
      break;
    case "win":
      OS = "Windows";
      break;
    case "Android":
      OS = "Android";
      break;
    case "cros":
      OS = "ChromeOS";
      break;
    case "Linux":
      OS = "Linux";
      break;
    case "openbsd":
      OS = "Open/FreeBSD";
      break;
    case "Fuchsia":
      OS = "Fuchsia";
      break;
    default:
      OS = "GenericOS";
      break;
  }
  if (OS.includes("Android")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberAndroid", lang);
    findModel = readi18nPhrases("RC_findModelAndroid", lang);
  } else if (OS.includes("Bada")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberBada", lang);
    findModel = readi18nPhrases("RC_findModelBada", lang);
  } else if (OS.includes("Blackberry")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberBlackberry", lang);
    findModel = readi18nPhrases("RC_findModelBlackberry", lang);
  } else if (OS.includes("Firefox")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberFirefox", lang);
    findModel = readi18nPhrases("RC_findModelFirefox", lang);
  } else if (OS.includes("IOS")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberIOs", lang);
    findModel = readi18nPhrases("RC_findModelIOs", lang);
  } else if (OS.includes("iPad")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberIPad", lang);
    findModel = readi18nPhrases("RC_findModelIPad", lang);
  } else if (OS.includes("Linux")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberLinux", lang);
    findModel = readi18nPhrases("RC_findModelLinux", lang);
  } else if (OS.includes("macOS")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberMacOS", lang);
    findModel = readi18nPhrases("RC_findModelMacOs", lang);
  } else if (OS.includes("Maemo")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberMaemo", lang);
    findModel = readi18nPhrases("RC_findModelMaemo", lang);
  } else if (OS.includes("Palm")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberPalm", lang);
    findModel = readi18nPhrases("RC_findModelPalm", lang);
  } else if (OS.includes("WebOS")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberWebOS", lang);
    findModel = readi18nPhrases("RC_findModelWebOS", lang);
  } else if (OS.includes("Windows")) {
    preferredModelNumber = readi18nPhrases("RC_modelNumberWindows", lang);
    findModel = readi18nPhrases("RC_findModelWindows", lang);
  } else {
    preferredModelNumber = readi18nPhrases("RC_modelNumber", lang);
    findModel = readi18nPhrases("RC_findModeGeneric", lang);
  }

  return { preferredModelNumber, findModel };
};
