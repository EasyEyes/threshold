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
    findModelNumber = readi18nPhrases("RC_findModelAndroid", language);
  } else if (userOS === "iOS") {
    findModelNumber = readi18nPhrases("RC_findModelIOs", language);
  } else if (userOS === "Windows") {
    findModelNumber = readi18nPhrases("RC_findModelWindows", language);
  } else if (userOS === "macOS") {
    findModelNumber = readi18nPhrases("RC_findModelMacOs", language);
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
    findModelNumber = readi18nPhrases("RC_findModelAndroid", language);
  } else if (userOS === "iOS") {
    findModelNumber = readi18nPhrases("RC_findModelIOs", language);
  } else if (userOS === "Windows") {
    findModelNumber = readi18nPhrases("RC_findModelWindows", language);
  } else if (userOS === "macOS") {
    findModelNumber = readi18nPhrases("RC_findModelMacOs", language);
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

export const doesMicrophoneExist = async (speakerID, OEM) => {
  const dbRef = ref(database);
  const snapshot = await get(child(dbRef, `Microphone2/${OEM}/${speakerID}`));
  if (snapshot.exists()) {
    return true;
  }
  return false;
};

export const addMicrophoneToDatabase = async (microphoneID, OEM, Data) => {
  const dbRef = ref(database);
  await set(child(dbRef, `Microphone2/${OEM}/${microphoneID}`), Data);
};

export const getCalibrationFile = async (url) => {
  try {
    const file = await fetch(url).then((response) => {
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
    const gain = parseFloat(values[1]);

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
