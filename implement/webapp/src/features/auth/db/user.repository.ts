import "server-only";

import { Timestamp, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { firestore } from "@/core/db/firestore";
import type { Me } from "@/features/auth/shared/types";
import type { UserDoc } from "./user.doc";
import { toMe } from "./user.mapper";

const USERS = "users";

function userRef(uid: string): DocumentReference<UserDoc> {
  return firestore().collection(USERS).doc(uid) as DocumentReference<UserDoc>;
}

/** Hồ sơ của chính chủ, hoặc null khi chưa có doc `users/{uid}`. */
export async function getUser(uid: string): Promise<Me | null> {
  const snap = await userRef(uid).get();
  const data = snap.data();
  return data ? toMe(uid, data) : null;
}

/** Hồ sơ công khai tối thiểu (tên + ảnh) — chỉ dùng cho host trên trang mời (NFR-10), không có email. */
export async function getPublicProfile(uid: string): Promise<{ displayName: string; photoUrl: string | null } | null> {
  const data = (await userRef(uid).get()).data();
  return data ? { displayName: data.display_name, photoUrl: data.photo_url } : null;
}

/** `current_room_id` của user, hoặc null (chưa ở phòng / chưa có doc). */
export async function getCurrentRoomId(uid: string): Promise<string | null> {
  return (await userRef(uid).get()).data()?.current_room_id ?? null;
}

export type GoogleProfile = {
  uid: string;
  email: string;
  googleName: string;
  googlePhotoUrl: string | null;
  now: Date;
};

/**
 * Upsert `users/{uid}` từ thông tin Google trong 1 transaction (api-contract › createSession).
 * - Chưa có: tạo đủ field TBL-01.
 * - Đã có: cập nhật `google_*`, `last_active_at`, `updated_at`; đồng bộ `display_name`/`photo_url`
 *   khi `profile_customized = false` (FLOW-01 A3).
 */
export async function upsertUserFromGoogle(
  profile: GoogleProfile,
): Promise<{ me: Me; isNewUser: boolean }> {
  const { uid, email, googleName, googlePhotoUrl } = profile;
  const at = Timestamp.fromDate(profile.now);
  const ref = userRef(uid);

  return firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.data();

    if (!existing) {
      const doc: UserDoc = {
        email,
        google_name: googleName,
        google_photo_url: googlePhotoUrl,
        display_name: googleName,
        photo_url: googlePhotoUrl,
        profile_customized: false,
        current_room_id: null,
        chat_recent_at: [],
        last_active_at: at,
        created_at: at,
        updated_at: at,
      };
      tx.create(ref, doc);
      return { me: toMe(uid, doc), isNewUser: true };
    }

    const patch: Partial<UserDoc> = {
      google_name: googleName,
      google_photo_url: googlePhotoUrl,
      last_active_at: at,
      updated_at: at,
      ...(existing.profile_customized ? {} : { display_name: googleName, photo_url: googlePhotoUrl }),
    };
    tx.update(ref, patch);
    return { me: toMe(uid, { ...existing, ...patch }), isNewUser: false };
  });
}

// ── Dùng trong transaction của feature khác (room…) — repository duy nhất biết `users`. ──

/** Hồ sơ chính chủ đọc trong transaction, hoặc null khi chưa có doc. */
export async function getUserInTx(tx: Transaction, uid: string): Promise<Me | null> {
  const data = (await tx.get(userRef(uid))).data();
  return data ? toMe(uid, data) : null;
}

/** uid của mọi user có `current_room_id == roomId` (index single tự có). */
export async function findUidsInRoomInTx(tx: Transaction, roomId: string): Promise<string[]> {
  const snap = await tx.get(firestore().collection(USERS).where("current_room_id", "==", roomId));
  return snap.docs.map((d) => d.id);
}

/** Đặt `current_room_id` (BR-02) + `updated_at`, `last_active_at`. */
export function setCurrentRoomInTx(tx: Transaction, uid: string, roomId: string, now: Date): void {
  const at = Timestamp.fromDate(now);
  const patch: Partial<UserDoc> = { current_room_id: roomId, updated_at: at, last_active_at: at };
  tx.update(userRef(uid), patch);
}

/** `current_room_id = null` cho các user (phòng đóng / rời phòng). */
export function clearCurrentRoomInTx(tx: Transaction, uids: readonly string[], now: Date): void {
  const at = Timestamp.fromDate(now);
  const patch: Partial<UserDoc> = { current_room_id: null, updated_at: at };
  for (const uid of uids) tx.update(userRef(uid), patch);
}
