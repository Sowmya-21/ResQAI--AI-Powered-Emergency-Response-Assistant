// Firebase Configuration - Import from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAhFNUckz3DiPpKx3vTM3SO-p1Gr9M21LU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "resqai-fae95.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://resqai-fae95-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "resqai-fae95",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "resqai-fae95.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "756225517163",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:756225517163:web:fedaf0c77145ca8717b32e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5LLFDBXFYD"
};

export default firebaseConfig;
