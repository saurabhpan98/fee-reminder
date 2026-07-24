// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore

const firebaseConfig = {
  apiKey: "AIzaSyCJQ0my--nMpYmz703S9p-FrNueeod58GI",
  authDomain: "fee-reminder-27524.firebaseapp.com",
  projectId: "fee-reminder-27524",
  storageBucket: "fee-reminder-27524.firebasestorage.app",
  messagingSenderId: "591195430063",
  appId: "1:591195430063:web:7c7905ed21db915a51485a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); // Initialize Firestore