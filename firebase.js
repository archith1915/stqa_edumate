// firebase.js
// USE THIS EXACT VERSION (DO NOT MODIFY URLs)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// 🔥 Your actual config here
const firebaseConfig = {
  apiKey: "AIzaSyBPdqGREBAipfRsTZvGipbc638bN3lKiqE",
  authDomain: "edumate-81035.firebaseapp.com",
  projectId: "edumate-81035",
  storageBucket: "edumate-81035.firebasestorage.app",
  messagingSenderId: "782100907144",
  appId: "1:782100907144:web:da0b5de9c301a1ae14cb3d",
  measurementId: "G-TKYRDCJN7M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where
};
