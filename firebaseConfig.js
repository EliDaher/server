// src/firebaseConfig.js
const { initializeApp } = require("firebase/app");
const { getDatabase } = require("firebase/database");
require('dotenv').config(); // تحميل متغيرات البيئة


// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_apiKey,
  authDomain: process.env.FIREBASE_authDomain,
  databaseURL: process.env.FIREBASE_databaseURL,
  projectId:process.env.FIREBASE_projectId,
  storageBucket:process.env.FIREBASE_storageBucket,
  messagingSenderId:process.env.FIREBASE_messagingSenderId,
  appId:process.env.FIREBASE_appId,
  measurementId:process.env.FIREBASE_measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
const database = getDatabase(app);

module.exports = { database };
