// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { initializeFirestore, getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDZopCl6jqND4sFYCSiB1GpCXreXd6-Q9s",
  authDomain: "speaker-calibration.firebaseapp.com",
  databaseURL: "https://speaker-calibration-default-rtdb.firebaseio.com",
  projectId: "speaker-calibration",
  storageBucket: "speaker-calibration.appspot.com",
  messagingSenderId: "322038930574",
  appId: "1:322038930574:web:d10ca9e7d60b6da9bafddf",
  measurementId: "G-3724GD92R6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
// getFirestore(app);

const database = getDatabase(app);

export default database;
