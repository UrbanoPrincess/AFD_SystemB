import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; 


const firebaseConfig = {
  apiKey: "AIzaSyDNGNakXXmB89nR5-JOYcMOMAEDCTS9WjE",
  authDomain: "integratedsystem-4040b.firebaseapp.com",
  projectId: "integratedsystem-4040b",
  storageBucket: "integratedsystem-4040b.firebasestorage.app",
  messagingSenderId: "529987505201",
  appId: "1:529987505201:web:e36fd3e66c584da48f1910",
  measurementId: "G-4QT0RK92C0"
};


// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Authentication
const auth = getAuth(app); // Add authentication initialization

// Initialize Analytics only in the browser
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

// Export the Firestore database, Auth, and Firebase config
export { db, auth, firebaseConfig };
