// Import the functions you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';

// Your Firebase config (replace with your own)
const firebaseConfig = {
  apiKey: "AIzaSyAfHOr3t3eo0kWKSXBIh2AMc1m2o5vTxN0",
  authDomain: "secondstar-aeb60.firebaseapp.com",
  projectId: "secondstar-aeb60",
  storageBucket: "secondstar-aeb60.firebasestorage.app",
  messagingSenderId: "496111190896",
  appId: "1:496111190896:web:8f33eabb631a570cf9c5b5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth + Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);