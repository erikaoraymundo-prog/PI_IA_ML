import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your Firebase project's web configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAx-U0aDt5CJtam3EBcRTqveqJndcCico",
  authDomain: "globaltalentbridge-e492e.firebaseapp.com",
  projectId: "globaltalentbridge-e492e",
  storageBucket: "globaltalentbridge-e492e.firebasestorage.app",
  messagingSenderId: "873493041271",
  appId: "1:873493041271:web:a9eb247f40d5aa6ab0b672",
  measurementId: "G-745K1CZ5YS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Próximo passo: Refinamento de UX, Integração de APIs e Testes de Produção