import { readi18nPhrases } from "./readPhrases";
import { ref, set, get, child } from "firebase/database";
import database from "./firebase/firebase.js";
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

export const getMicrophoneNamesFromDatabase = async () => {
  const dbRef = ref(database);
  const snapshot = await get(child(dbRef, "Microphone"));
  if (snapshot.exists()) {
    return Object.keys(snapshot.val());
  }
  return null;
};

export const isMicrophoneSmartphone = async (microphoneName) => {
  const dbRef = ref(database);
  const snapshot = await get(child(dbRef, `Microphone/${microphoneName}`));
  if (snapshot.exists()) {
    return snapshot.val().isSmartPhone;
  }
  return null;
};

export const saveLoudSpeakerInfo = async (
  loudSpeakerInfo,
  modelNumber,
  OEM
) => {
  console.log("Saving LoudSpeaker Info");
  const dbRef = ref(database);
  await set(child(dbRef, `LoudSpeaker/${OEM}/${modelNumber}`), loudSpeakerInfo);
};

export const matchLoudSpeakerByOEMandModelNumber = async (OEM, modelNumber) => {
  const dbRef = ref(database);
  const snapshot = await get(child(dbRef, `LoudSpeaker/${modelNumber}`));
  if (snapshot.exists()) {
    return snapshot.val().OEM === OEM;
  }
  return null;
};

export const getInstructionText = (thisDevice, language) => {
  const needModelNumber = readi18nPhrases(
    "RC_needModelNumberAndName",
    language
  );
  const needModelNumberFinal =
    thisDevice.OEM === "Unknown" || thisDevice.DeviceType === "Unknown"
      ? needModelNumber.replace("xxx ", "device").replace("yyy", "")
      : needModelNumber
          .replace("xxx", thisDevice.OEM)
          .replace("yyy", thisDevice.DeviceType);
  const userOS = thisDevice.PlatformName;
  var findModelNumber = "";
  if (userOS === "Android") {
    findModelNumber = readi18nPhrases("RC_FindModelAndroid", language);
  } else if (userOS === "iOS") {
    findModelNumber = readi18nPhrases("RC_FindModelIOs", language);
  } else if (userOS === "Windows") {
    findModelNumber = readi18nPhrases("RC_FindModelWindows", language);
  } else if (userOS === "macOS") {
    findModelNumber = readi18nPhrases("RC_FindModelMacOs", language);
  }

  return `${needModelNumberFinal} <br> <br> ${findModelNumber}`;
};

export const getDeviceString = (thisDevice, language) => {
  const needModelNumber = readi18nPhrases(
    "RC_needModelNumberAndName",
    language
  );
  const needModelNumberFinal =
    thisDevice.OEM === "Unknown" || thisDevice.DeviceType === "Unknown"
      ? needModelNumber.replace("xxx ", "device").replace("yyy", "")
      : needModelNumber
          .replace("xxx", thisDevice.OEM)
          .replace("yyy", thisDevice.DeviceType);
  const userOS = thisDevice.PlatformName;
  var findModelNumber = "";
  if (userOS === "Android") {
    findModelNumber = readi18nPhrases("RC_FindModelAndroid", language);
  } else if (userOS === "iOS") {
    findModelNumber = readi18nPhrases("RC_FindModelIOs", language);
  } else if (userOS === "Windows") {
    findModelNumber = readi18nPhrases("RC_FindModelWindows", language);
  } else if (userOS === "macOS") {
    findModelNumber = readi18nPhrases("RC_FindModelMacOs", language);
  }

  return `This device: (#Text to be added to the phrases doc) <br> <b>Platform Name:</b> ${thisDevice.PlatformName} <br>
   <b>Platform Version:</b> ${thisDevice.PlatformVersion} <br>
   <b>Device Id:</b> ${thisDevice.DeviceId} <br>
   <b>Hardware Model Variants:</b> ${thisDevice.HardwareModelVariants} <br>
   <b>OEM:</b> ${thisDevice.OEM} <br>
   <b>Device Type:</b> ${thisDevice.DeviceType} <br>
   <b>Hardware Model:</b> ${thisDevice.HardwareModel} <br>
   <b>Hardware Family:</b> ${thisDevice.HardwareFamily} <br>
   <b>Hardware Name:</b> ${thisDevice.HardwareName} <br>
   <b>Is a Mobile Device:</b> ${thisDevice.IsMobile} <br><br>`;
};

export const removeElements = (elms) => elms.forEach((el) => el.remove());
