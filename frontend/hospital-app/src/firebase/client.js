import { initializeApp, getApp, getApps } from "firebase/app";
import { browserSessionPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

let firebaseApp = null;
let persistencePromise = null;

function requireEnv(name) {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です。Firebase の接続設定を確認してください。`);
  }
  return value;
}

function getFirebaseConfig() {
  return {
    apiKey: requireEnv("VITE_FIREBASE_API_KEY"),
    authDomain: requireEnv("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: requireEnv("VITE_FIREBASE_PROJECT_ID"),
    appId: requireEnv("VITE_FIREBASE_APP_ID"),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  };
}

export function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
  return firebaseApp;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}

export function ensureFirebaseSessionPersistence() {
  if (!persistencePromise) {
    persistencePromise = setPersistence(getFirebaseAuth(), browserSessionPersistence).catch((error) => {
      persistencePromise = null;
      throw error;
    });
  }

  return persistencePromise;
}
