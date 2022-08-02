import { initializeApp } from "../node_modules/firebase/app";
import {
  getDatabase,
  ref,
  update,
  get,
  set,
} from "../node_modules/firebase/database";

//TODO: change config keys to Netlify environment variables
const firebaseConfig = {
  apiKey: "AIzaSyBz3kA2F828i9Cvtnn1fUjDbtnQu3onqWM",
  authDomain: "easyeyeslog.firebaseapp.com",
  databaseURL: "https://easyeyeslog-default-rtdb.firebaseio.com",
  projectId: "easyeyeslog",
  storageBucket: "easyeyeslog.appspot.com",
  messagingSenderId: "376871008708",
  appId: "1:376871008708:web:63e19bec80810805d94c91",
  measurementId: "G-N94KHWW4YZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// get log File for experiment from experimentID and scientistPavloviaID
export const getLogFile = async (experimentID) => {
  experimentID = experimentID.split("/");
  experimentID = experimentID.join("|");
  experimentID = experimentID.split(".");
  experimentID = experimentID.join("*");
  console.log(experimentID);
  return await getData("/" + experimentID);
};

// set initial Data for a specific user in a specific experiment by a specific scientist : uses scientistPavloviaID experimentId and pavloviaID
export const setInitialData = (
  experimentID,
  userPavloviaID = "",
  userProlificID = "",
  compatibleBool,
  cores,
  browser,
  startingTimestamp,
  userID
) => {
  // console.log("experimentId", experimentID)
  experimentID = experimentID.split("/");
  experimentID = experimentID.join("|");
  experimentID = experimentID.split(".");
  experimentID = experimentID.join("*");
  const data = {
    [experimentID]: {
      [userID]: {
        userProlificID: userProlificID,
        userPavloviaID: userPavloviaID,
        compatibleBool: compatibleBool,
        cores: cores,
        browser: browser,
        startingTimestamp: startingTimestamp,
      },
    },
  };
  get(ref(db, "/" + experimentID)).then(async (snapshot) => {
    if (snapshot.exists()) {
      await addData("/" + experimentID, data[experimentID]);
    } else {
      await addData("/", data);
    }
  });
};

//add data to databse given location and data
const addData = (location, data) => {
  return update(ref(db, location), data);
};

//get data from databse given location
const getData = async (location) => {
  return await get(ref(db, location)).then((snapshot) => {
    // console.log("snapshot", snapshot)
    // console.log("location", location)
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  });
};

//Update blockCompleted for a specific user in a specific experiment from a specific scientist : uses scientistProlificID, experimentId and userProlificID
export const updateBlockCompleted = async (
  userID,
  blockCompleted,
  experimentID
) => {
  experimentID = experimentID.split("/");
  experimentID = experimentID.join("|");
  experimentID = experimentID.split(".");
  experimentID = experimentID.join("*");
  return await get(ref(db, `/${experimentID}/${userID}/blockCompleted`)).then(
    async (snapshot) => {
      const array = { current: undefined };
      if (snapshot.exists()) {
        array.current = snapshot.val();
        // console.log(array);
        array.current.push(blockCompleted);
      } else {
        console.log("No data available");
        array.current = [];
        array.current.push(blockCompleted);
      }
      return await set(
        ref(db, `/${experimentID}/${userID}/blockCompleted`),
        array.current
      );
    }
  );
};
