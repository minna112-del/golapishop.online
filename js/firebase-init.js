import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
  import {
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, updateProfile
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
  import {
    getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc,
    updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot,
    serverTimestamp, increment, runTransaction
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
  import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

  const firebaseConfig = {
    apiKey: "AIzaSyBdtIlcoPFFqzkI6X9KOIH-f4QAyEfH4o8",
    authDomain: "golapishoponline.firebaseapp.com",
    projectId: "golapishoponline",
    storageBucket: "golapishoponline.firebasestorage.app",
    messagingSenderId: "871653454194",
    appId: "1:871653454194:web:67e207a7df46503169edeb",
    measurementId: "G-EZX9JH30DB"
  };

  const app = initializeApp(firebaseConfig);
  analyticsIsSupported().then(ok => { if (ok) getAnalytics(app); }).catch(()=>{});
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  window.__fb = {
    auth, db, storage, GoogleAuthProvider,
    onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, signInWithPopup, updateProfile,
    collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, runTransaction,
    storageRef, uploadBytes, getDownloadURL
  };
  window.dispatchEvent(new Event('firebase-ready'));