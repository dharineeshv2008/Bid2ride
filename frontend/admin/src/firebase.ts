import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCxxjJCtn6BZcTvXmi8c-nbitz79yzmOCs",
  authDomain: "bid2ride-4d071.firebaseapp.com",
  projectId: "bid2ride-4d071",
  storageBucket: "bid2ride-4d071.firebasestorage.app",
  messagingSenderId: "86187088898",
  appId: "1:86187088898:web:44b66ee18c1e65d1331b1b",
  measurementId: "G-2Y79TNGTSD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Enable local persistence so sessions are restored automatically across refreshes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set Firebase persistence:", err);
});

export { app, auth, initializeApp, getAuth, RecaptchaVerifier, signInWithPhoneNumber };
