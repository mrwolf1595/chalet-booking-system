// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCdo5EhKdwoiw7cyjzIDnMXEVvzgNDFVdY",
  authDomain: "chalet-booking-75258.firebaseapp.com",
  projectId: "chalet-booking-75258",
  storageBucket: "chalet-booking-75258.appspot.com",
  messagingSenderId: "644187367457",
  appId: "1:644187367457:web:xxxxx"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

console.log("Firebase initialized successfully!");