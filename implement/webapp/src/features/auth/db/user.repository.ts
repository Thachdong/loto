import "server-only";

import { Timestamp, type DocumentReference } from "firebase-admin/firestore";
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
