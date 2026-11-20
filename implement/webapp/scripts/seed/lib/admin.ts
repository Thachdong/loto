import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { projectId } from "./env";

function app(): App {
  const existing = getApps().find((a) => a.name === "seed");
  if (existing) return existing;
  const id = projectId();
  const dbHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000";
  return initializeApp(
    {
      projectId: id,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? `http://${dbHost}/?ns=${id}`,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${id}.appspot.com`,
    },
    "seed",
  );
}

export const seedFirestore = () => getFirestore(app());
export const seedAuth = () => getAuth(app());
export const seedDatabase = () => getDatabase(app());
export const seedStorage = () => getStorage(app());
