// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCufeuyxlhqRCyuxqGqA_V9smEy9lIwSCI",
  authDomain: "proofingapp1.firebaseapp.com",
  projectId: "proofingapp1",
  storageBucket: "proofingapp1.firebasestorage.app",
  messagingSenderId: "242269508692",
  appId: "1:242269508692:web:33da52e1b18d235a5009c1",
  measurementId: "G-915HDLWE8N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);