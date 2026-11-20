import "client-only";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase, type Database } from "firebase/database";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

type ClientServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  database: Database;
  storage: FirebaseStorage;
};

let services: ClientServices | null = null;

/** Next chỉ inline biến NEXT_PUBLIC_* khi truy cập trực tiếp `process.env.NAME`. */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";

/**
 * Firebase JS SDK (modular) khởi tạo 1 lần. Client chỉ ĐỌC (listener) — ghi đi qua Server Action (ADR-03),
 * trừ presence RTDB (ADR-06) và upload avatar Storage (ADR-12).
 */
function init(): ClientServices {
  if (services) return services;

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const database = getDatabase(app);
  const storage = getStorage(app);

  if (useEmulator) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    connectDatabaseEmulator(database, "127.0.0.1", 9000);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }

  services = { app, auth, firestore, database, storage };
  return services;
}

export const getClientAuth = () => init().auth;
export const getClientFirestore = () => init().firestore;
export const getClientDatabase = () => init().database;
export const getClientStorage = () => init().storage;
