import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxeOD7lxJZUQmzuIPPYOfdDqtuFVIOeEQ",
  authDomain: "dantewada-attedence.firebaseapp.com",
  projectId: "dantewada-attedence",
  storageBucket: "dantewada-attedence.firebasestorage.app",
  messagingSenderId: "895037918162",
  appId: "1:895037918162:web:b5591f6eeadb829454d60b",
  measurementId: "G-8TQ97YFEN8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, googleProvider };
