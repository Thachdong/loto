import "server-only";

import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/core/server/firebase-admin";

/** Firestore (Admin SDK). Chỉ repository trong `db/` được gọi. */
export function firestore() {
  return getFirestore(getAdminApp());
}

/** Realtime Database (Admin SDK) — presence (ADR-06). */
export function rtdb() {
  return getDatabase(getAdminApp());
}
