import { readi18nPhrases } from "./readPhrases";
import { db } from "./firebase/firebase.js";
import {
  calibrateSoundUMIKBase_dB,
  fontSize,
  microphoneInfo,
  invertedImpulseResponse,
  loudspeakerIR,
  allHzCalibrationResults,
  loudspeakerInfo,
  actualBitsPerSample,
  actualSamplingRate,
  currentFirestoreProfileDocumentID,
} from "./global";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { psychoJS } from "./globalPsychoJS";
import { read, utils } from "xlsx";
import Papa from "papaparse";

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

export const saveLoudSpeakerInfoToFirestore = async (
  loudSpeakerInfo,
  ir_time,
  ir,
  iir,
  iir_no_bandpass,
) => {
  const collectionRef = collection(db, "Loudspeakers");
  // add doc to collection. save loudSpeakerInfo first then iir and ir
  // save loudSpeakerInfo first and then in the same document (with a random Id) save iir and ir
  const docRef = await addDoc(collectionRef, loudSpeakerInfo);
  // save iir
  let newDocRef;
  await setDoc(docRef, { ir: ir }, { merge: true });
  newDocRef = doc(db, "Loudspeakers", docRef.id, "impulse response", "ir_time");
  await setDoc(newDocRef, { ir_time: ir_time }, { merge: true });

  newDocRef = doc(
    db,
    "Loudspeakers",
    docRef.id,
    "impulse response",
    "iir_no_bandpass",
  );
  await setDoc(
    newDocRef,
    { iir_no_bandpass: iir_no_bandpass },
    { merge: true },
  );

  newDocRef = doc(db, "Loudspeakers", docRef.id, "impulse response", "iir");
  await setDoc(newDocRef, { iir: iir }, { merge: true });

  currentFirestoreProfileDocumentID.loudspeaker = docRef.id;
  // await setDoc(docRef, { ir_time: ir_time }, { merge: true });
};

export const writeIsSmartPhoneToFirestore = async (
  micID,
  isSmartPhone,
  OEM,
) => {
  const collectionRef = collection(db, "Microphones");
  OEM = OEM.toLowerCase().split(" ").join("");
  const q = query(
    collectionRef,
    where("ID", "==", micID),
    where("lowercaseOEM", "==", OEM),
    where("isDefault", "==", true),
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.size > 0) {
    const docRef = await addDoc(collectionRef, {
      isSmartPhone: isSmartPhone,
      isDefault: false,
    });
    currentFirestoreProfileDocumentID.microphone = docRef.id;
    return docRef.id;
  } else {
    const docRef = await addDoc(collectionRef, {
      isSmartPhone: isSmartPhone,
      isDefault: true,
    });
    currentFirestoreProfileDocumentID.microphone = docRef.id;
    return docRef.id;
  }
};

export const saveSD_GAIN_info = async (
  type,
  filteredMLS_SD,
  RMSError,
  Gain,
) => {
  let id, location;
  if (type === "Microphone") {
    id = currentFirestoreProfileDocumentID.microphone;
    location = "Microphones";
  } else {
    id = currentFirestoreProfileDocumentID.loudspeaker;
    location = "Loudspeakers";
  }

  if (id === undefined) return;
  const docRef = doc(db, location, id);

  await updateDoc(docRef, {
    SD_rec_filt_MLS_dB: filteredMLS_SD,
    gain_model_RMSE_dB: RMSError,
    Gain_of_transducer_profile_at_1000Hz_dB: Gain,
  });

  psychoJS.experiment.addData("SD rec. filt. MLS (in dB)", filteredMLS_SD);
  psychoJS.experiment.addData("gain model RMSE (in dB)", RMSError);
  psychoJS.experiment.addData(
    "Gain of transducer profile at 1000Hz (in dB)",
    Gain,
  );
};

export const writeMicrophoneInfoToFirestore = async (micInfo, documentID) => {
  const docRef = doc(db, "Microphones", documentID);
  await setDoc(docRef, micInfo, { merge: true });
};

export const writeFrqGainToFirestore = async (frq, gain, documentID) => {
  const data = { Freq: frq, Gain: gain };

  const docRef = doc(db, "Microphones", documentID);
  await updateDoc(docRef, {
    linear: data,
  });
};

export const writeGainat1000HzToFirestore = async (gain, documentID) => {
  const docRef = doc(db, "Microphones", documentID);
  await updateDoc(docRef, {
    Gain1000: gain,
  });
};

export const getInstructionText_ = (
  thisDevice,
  language,
  isSmartPhone,
  isLoudspeakerCalibration,
  preferredModelNumberText = "model number",
  needPhoneSurvey = false,
) => {
  const microphoneInCalibrationLibrary = isLoudspeakerCalibration
    ? isSmartPhone
      ? ""
      : readi18nPhrases(
          "RC_microphoneIsInCalibrationLibrary",
          language,
        ).replace(
          "xxx",
          `${microphoneInfo.current.micrFullManufacturerName} ${microphoneInfo.current.micFullName}`,
        ) +
        "<br> <br>" +
        "<b style= 'fontSize: '1rem';'>" +
        readi18nPhrases("RC_BrandDesktopComputer", language).replace(
          "BBB",
          thisDevice.OEM === "Unknown" ? "" : thisDevice.OEM,
        ) +
        "</b> <br>"
    : "";
  const needModelNumber = readi18nPhrases(
    "RC_needModelNumberAndName",
    language,
  );
  const preferredModelNumber = preferredModelNumberText;
  const needModelNumberFinal = needModelNumber
    .replace("mmm", preferredModelNumber)
    .replace("xxx", thisDevice.OEM === "Unknown" ? "unknown" : thisDevice.OEM)
    .replace(
      "yyy",
      thisDevice.DeviceType === "Unknown" ? "device" : thisDevice.DeviceType,
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
    findModelNumber = readi18nPhrases("RC_findModelGeneric", language);
  }

  return isSmartPhone
    ? `${microphoneInCalibrationLibrary}${needModelNumberFinal} ${findModelNumber}`
    : `${microphoneInCalibrationLibrary}${needModelNumberFinal} ${findModelNumber}`;
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

  return `<b>${readi18nPhrases("RC_brand", language)}:</b> ${
    thisDevice.OEM
  } <br>`;
};

export const removeElements = (elems) =>
  elems.forEach((el) => {
    if (el) el.remove();
  });

// doesMicrophoneExist (from firestore)
// structure: Microphone/{OEM}/{speakerID}/default
export const doesMicrophoneExistInFirestore = async (speakerID, OEM) => {
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
    console.log("Existsss");
    return true;
  }
  console.log("Does not exist");
  return false;
};

export const reportBrowserIdentificationToFirestore = async (report) => {
  const collectionRef = collection(db, "BrowserIdentification");
  const docRef = await addDoc(collectionRef, report);
  return docRef.id;
};

export const doesLoudspeakerExistInFirestore = async (speakerID, OEM) => {
  const collectionRef = collection(db, "Loudspeakers");
  // get the document in the collection with the speakerID, OEM and isDefault = true
  const q = query(
    collectionRef,
    where("DeviceId", "==", speakerID),
    where("OEM", "==", OEM),
    orderBy("createDate", "desc"),
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.size > 0) {
    let timestamp = null;
    if (querySnapshot.docs[0].data().createDate) {
      timestamp = new Timestamp(
        querySnapshot.docs[0].data().createDate.seconds,
        querySnapshot.docs[0].data().createDate.nanoseconds,
      );
    }
    return {
      doesLoudspeakerExist: true,
      createDate: timestamp ? timestamp.toDate() : null,
    };
  }
  return { doesLoudspeakerExist: false, createDate: null };
};

export const addMicrophoneToFirestore = async (Data) => {
  const collectionRef = collection(db, "Microphones");
  const docRef = await addDoc(collectionRef, Data);
  return docRef.id;
};

export const readFrqGainFromFirestore = async (speakerID, OEM) => {
  // get the document in the collection with the speakerID, OEM and isDefault = true
  const collectionRef = collection(db, "Microphones");
  const q = query(
    collectionRef,
    where("ID", "==", speakerID),
    where("lowercaseOEM", "==", OEM),
    where("isDefault", "==", true),
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.size > 0) {
    return querySnapshot.docs[0].data().linear;
  }
  return null;
};

export const fetchLoudspeakerGain = async (speakerID, OEM) => {
  const collectionRef = collection(db, "Loudspeakers");
  // get the document in the collection with the speakerID, OEM and isDefault = true
  const q = query(
    collectionRef,
    where("DeviceId", "==", speakerID),
    where("OEM", "==", OEM),
    orderBy("createDate", "desc"),
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.size > 0) {
    allHzCalibrationResults.knownIr = querySnapshot.docs[0].data().ir;
    console.log(querySnapshot.docs[0].data());
    loudspeakerIR.Freq = allHzCalibrationResults.knownIr.Freq;
    loudspeakerIR.Gain = allHzCalibrationResults.knownIr.Gain;
    let timestamp = null;
    if (querySnapshot.docs[0].data().createDate) {
      timestamp = new Timestamp(
        querySnapshot.docs[0].data().createDate.seconds,
        querySnapshot.docs[0].data().createDate.nanoseconds,
      );
    }
    loudspeakerInfo.current = {
      webAudioDeviceNames: querySnapshot.docs[0].data().webAudioDeviceNames,
      PavloviaSessionID: querySnapshot.docs[0].data().PavloviaSessionID,
      userIDs: querySnapshot.docs[0].data().userIDs,
      ModelName: querySnapshot.docs[0].data().ModelName,
      ID: querySnapshot.docs[0].data().ID,
      HardwareName: querySnapshot.docs[0].data().HardwareName,
      HardwareModel: querySnapshot.docs[0].data().HardwareModel,
      HardwareModelVariants: querySnapshot.docs[0].data().HardwareModelVariants,
      HardwareFamily: querySnapshot.docs[0].data().HardwareFamily,
      OEM: querySnapshot.docs[0].data().OEM,
      DeviceType: querySnapshot.docs[0].data().DeviceType,
      DeviceId: querySnapshot.docs[0].data().DeviceId,
      PlatformName: querySnapshot.docs[0].data().PlatformName,
      PlatformVersion: querySnapshot.docs[0].data().PlatformVersion,
      gainDBSPL: querySnapshot.docs[0].data().gainDBSPL,
      createDate: timestamp ? timestamp.toDate() : null,
      fullLoudspeakerModelName:
        querySnapshot.docs[0].data().fullLoudspeakerModelName,
      fullLoudspeakerModelNumber:
        querySnapshot.docs[0].data().fullLoudspeakerModelNumber,
      jsonFileName: querySnapshot.docs[0].data().jsonFileName,
    };
    actualSamplingRate.current =
      querySnapshot.docs[0].data().actualSamplingRate;
    actualBitsPerSample.current =
      querySnapshot.docs[0].data().actualBitsPerSample;
    const newDocRef = collection(
      db,
      "Loudspeakers",
      querySnapshot.docs[0].id,
      "impulse response",
    );
    const subq = query(newDocRef);
    const subquerySnapshot = await getDocs(subq);
    invertedImpulseResponse.current = subquerySnapshot.docs[0].data().iir;

    const iir_no_bandpass_doc_Ref = doc(
      db,
      "Loudspeakers",
      querySnapshot.docs[0].id,
      "impulse response",
      "iir_no_bandpass",
    );
    const iir_no_bandpass_doc = await getDoc(iir_no_bandpass_doc_Ref);

    if (iir_no_bandpass_doc.exists()) {
      allHzCalibrationResults.component.iir_no_bandpass =
        iir_no_bandpass_doc.data().iir_no_bandpass;
    }

    return;
  }
  return;
};

export const getCalibrationFile = async (url) => {
  try {
    const file = await fetch(
      "https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/" + url,
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

export const parseCalibrationFile = (file, type) => {
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
    const base =
      type === "UMIK-1"
        ? calibrateSoundUMIKBase_dB.umik1
        : calibrateSoundUMIKBase_dB.umik2;
    const gain = sensFactor
      ? parseFloat(values[1]) + sensFactor + base
      : parseFloat(values[1]) + base;

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
    findModel = readi18nPhrases("RC_findModelGeneric", lang);
  }

  return { preferredModelNumber, findModel };
};

export const findMinValue = (array) => {
  let minValue = array[0];
  for (let i = 1; i < array.length; i++) {
    if (array[i] < minValue) {
      minValue = array[i];
    }
  }
  return minValue;
};

export const findMaxValue = (array) => {
  let maxValue = array[0];
  for (let i = 1; i < array.length; i++) {
    if (array[i] > maxValue) {
      maxValue = array[i];
    }
  }
  return maxValue;
};

export function safeMin(...args) {
  return Math.min(...args.filter(Number.isFinite));
}

export function safeMax(...args) {
  return Math.max(...args.filter(Number.isFinite));
}

export const parseImpulseResponseFile = async (fileName) => {
  if (!fileName) {
    console.error("No impulse response file name provided");
    return { amplitudes: [], samplingRate: 0, time: [] };
  }

  try {
    // Determine if it's an xlsx or csv file
    const isXlsx = fileName.toLowerCase().endsWith(".xlsx");
    let data;

    // Fetch the file from the impulseResponses folder
    const filePath = `impulseResponses/${fileName}`;
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${filePath}: ${response.status} ${response.statusText}`,
      );
    }

    if (isXlsx) {
      // Handle Excel file
      const arrayBuffer = await response.arrayBuffer();
      const workbook = read(new Uint8Array(arrayBuffer), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      data = utils.sheet_to_json(worksheet, { header: ["time", "amplitude"] });

      // Skip header row if present
      if (isNaN(parseFloat(data[0].time))) {
        data.shift();
      }
    } else {
      // Handle CSV file
      const csvText = await response.text();
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      data = parsed.data;
    }

    // Extract time and amplitude values
    const times = data.map((row) => parseFloat(row.time));
    const amplitudes = data.map((row) => parseFloat(row.amplitude));

    // Calculate sampling rate from time values
    // Assuming uniform time steps, we take the difference between consecutive time points
    const timeSteps = [];
    for (let i = 1; i < times.length; i++) {
      timeSteps.push(times[i] - times[i - 1]);
    }

    // Calculate average time step
    const avgTimeStep =
      timeSteps.reduce((sum, step) => sum + step, 0) / timeSteps.length;
    const samplingRate = Math.round(1 / avgTimeStep);
    console.log("samplingRate", samplingRate);

    return { amplitudes, samplingRate, time: times };
  } catch (error) {
    console.error("Error parsing impulse response file:", error);
    return { amplitudes: [], samplingRate: 0, time: [] };
  }
};
