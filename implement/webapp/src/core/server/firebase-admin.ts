import "server-only";

import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

export const DEFAULT_PROJECT_ID = "demo-loto";

function projectId(): string {
  return process.env.GCLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? DEFAULT_PROJECT_ID;
}

/**
 * Khởi tạo firebase-admin đúng 1 lần.
 * Có `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_DATABASE_EMULATOR_HOST`,
 * `FIREBASE_STORAGE_EMULATOR_HOST` → SDK tự nối emulator. Production (App Hosting) dùng
 * Application Default Credentials.
 */
export function getAdminApp(): App {
  // Chỉ dùng app mặc định — script/test có thể tạo app tên khác.
  const existing = getApps().find((app) => app.name === "[DEFAULT]");
  if (existing) return existing;

  const id = projectId();
  return initializeApp({
    projectId: id,
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ??
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
      `https://${id}-default-rtdb.asia-southeast1.firebasedatabase.app`,
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      `${id}.appspot.com`,
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}
