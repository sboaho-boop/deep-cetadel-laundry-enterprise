import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCpA31eMSoXatW-BixXPuL5u6uzLYHSonQ",
  authDomain: "deep-citadel-laundry.firebaseapp.com",
  projectId: "deep-citadel-laundry",
  storageBucket: "deep-citadel-laundry.firebasestorage.app",
  messagingSenderId: "651474484229",
  appId: "1:651474484229:web:73f9f1ae9d25583807706c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot };
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail };