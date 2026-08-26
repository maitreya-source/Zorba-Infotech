import { initializeApp, getApps } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFunctions } from "firebase/functions";

import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID || "zorba-infotech-web"}-default-rtdb.firebaseio.com`,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "asia-south1");

let rtdbInstance: Database | null = null;
try {
  rtdbInstance = getDatabase(app);
} catch (e) {
  console.warn("RTDB initialization skipped:", e);
}
export const rtdb = rtdbInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
