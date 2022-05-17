// Import the functions you need from the SDKs you need
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyDI4KNbn2krQf6xZ9AV2ViZEo9anEz13Xs',
  authDomain: 'seemeet-700c2.firebaseapp.com',
  projectId: 'seemeet-700c2',
  storageBucket: 'seemeet-700c2.appspot.com',
  messagingSenderId: '706808024455',
  appId: '1:706808024455:web:905328213c0db168975722',
  measurementId: 'G-MHDY04Z1C6',
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

module.exports = { firebaseApp, firebaseAuth, firebaseConfig };
