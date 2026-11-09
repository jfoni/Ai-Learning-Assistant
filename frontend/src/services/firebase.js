import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDEiXflU9h2IoyVXFwHeemRDQdR2PNWH_4",
  authDomain: "ai-learning-assistant-fece6.firebaseapp.com",
  projectId: "ai-learning-assistant-fece6",
  storageBucket: "ai-learning-assistant-fece6.firebasestorage.app",
  messagingSenderId: "448152347231",
  appId: "1:448152347231:web:2954c9d3be6bae5fa8f1ea",
  measurementId: "G-KJ8YTMYZ1M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const analytics = getAnalytics(app);