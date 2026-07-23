import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
  import {
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, updateProfile,
    signInWithPhoneNumber, RecaptchaVerifier
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
  import {
    getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc,
    updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot,
    serverTimestamp, increment, runTransaction
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
  import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
  import { getMessaging, getToken, isSupported as messagingIsSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";


  const firebaseConfig = {
    apiKey: "AIzaSyBdtIlcoPFFqzkI6X9KOIH-f4QAyEfH4o8",
    authDomain: "golapishoponline.firebaseapp.com",
    projectId: "golapishoponline",
    storageBucket: "golapishoponline.firebasestorage.app",
    messagingSenderId: "871653454194",
    appId: "1:871653454194:web:67e207a7df46503169edeb",
    measurementId: "G-EZX9JH30DB"
  };

  try{
    const app = initializeApp(firebaseConfig);
    setTimeout(() => { analyticsIsSupported().then(ok => { if (ok) getAnalytics(app); }).catch(()=>{}); }, 5000); // Analytics আর critical path-এ নেই — ৫সে পরে নীরবে চালু হয়
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    window.__fb = {
      auth, db, storage, GoogleAuthProvider,
      onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
      signOut, signInWithPopup, updateProfile,
      signInWithPhoneNumber, RecaptchaVerifier,
      collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
      query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, runTransaction,
      storageRef, uploadBytes, getDownloadURL
    };
    window.dispatchEvent(new Event('firebase-ready'));

  /* ---------- FCM: customer push token capture ---------- */
  /* VAPID key — Firebase Console > Project Settings > Cloud Messaging > Web Push certificates */
  const VAPID_KEY = 'BPRxIznMoYaznW3dnf-OcB-MSplrzV6xA2bWWbPENH37-iAelbKjcwO50XbGMirLpNu6w4XZBr7kwZLPepf9KRQ';

  async function registerPushToken(userId){
    try{
      const supported = await messagingIsSupported();
      if(!supported || !('Notification' in window)) return;
      // ⚠️ আগে login হলেই স্বয়ংক্রিয়ভাবে notification permission popup আসতো —
      // অনেক mobile browser এটা block করে বা বিরক্তিকর মনে করে। এখন শুধু
      // permission আগে থেকেই 'granted' থাকলে (আগে কখনো manually অনুমতি দেওয়া
      // হয়েছিল) নীরবে token রেজিস্টার হয় — নতুন করে prompt কখনো auto-দেখানো হয় না,
      // সেটা এখন শুধু "নোটিফিকেশন চালু করুন" বাটনে ট্যাপ করলেই হয় (NotifHelper)।
      if(Notification.permission !== 'granted') return;
      const messaging = getMessaging(app);
      const swReg = await navigator.serviceWorker.getRegistration('/');
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
      if(token){
        await setDoc(doc(db,'fcmTokens', userId), { token, updatedAt: serverTimestamp() }, { merge:true });
      }
    }catch(e){ console.warn('FCM token error', e.message); }
  }
  window.__fb.registerPushToken = registerPushToken;

  onAuthStateChanged(auth, user=>{
    if(user) registerPushToken(user.uid);
  });
  
  }catch(initErr){
    console.error('Firebase initialization failed:', initErr);
  }