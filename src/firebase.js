import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyCeRZ_OatuuI3FAzmoGPf044JUIdIztG54",
  authDomain: "yagulchat.firebaseapp.com",
  databaseURL: "https://yagulchat-default-rtdb.firebaseio.com",
  projectId: "yagulchat",
  storageBucket: "yagulchat.appspot.com",
  messagingSenderId: "480387784899",
  appId: "1:480387784899:web:c808caafce9a81de9b4276"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth();
export const db =getFirestore();