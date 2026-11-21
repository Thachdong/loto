/**
 * Helper test action cần phiên: tạo user Google trên Auth emulator + doc `users/{uid}` + session cookie thật.
 * Dùng chung với cookie store giả của `google-token.ts`.
 */
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/core/server/firebase-admin";
import { SESSION_COOKIE } from "@/core/server/session";
import { googleIdToken, type createCookieStore } from "../auth/google-token";

export type TestUser = {
  email: string;
  name: string;
  /** Mặc định = name. */
  displayName?: string;
  currentRoomId?: string | null;
  /** false → không tạo doc `users/{uid}`. */
  withUserDoc?: boolean;
};

export type SignedInUser = { uid: string; cookie: string };

/** Doc `users/{uid}` đủ field TBL-01. */
export async function writeUserDoc(uid: string, user: TestUser): Promise<void> {
  const at = Timestamp.now();
  await getFirestore(getAdminApp())
    .doc(`users/${uid}`)
    .set({
      email: user.email,
      google_name: user.name,
      google_photo_url: null,
      display_name: user.displayName ?? user.name,
      photo_url: null,
      profile_customized: false,
      current_room_id: user.currentRoomId ?? null,
      chat_recent_at: [],
      last_active_at: at,
      created_at: at,
      updated_at: at,
    });
}

export async function createSignedInUser(user: TestUser): Promise<SignedInUser> {
  const { idToken, localId } = await googleIdToken({ email: user.email, name: user.name });
  const cookie = await getAuth(getAdminApp()).createSessionCookie(idToken, { expiresIn: 60 * 60 * 1000 });
  if (user.withUserDoc !== false) await writeUserDoc(localId, user);
  return { uid: localId, cookie };
}

/** Đặt cookie `__session` vào cookie store giả (như trình duyệt gửi kèm request). */
export function attachSession(store: ReturnType<typeof createCookieStore>, session: SignedInUser): void {
  store.jar.set(SESSION_COOKIE, session.cookie);
}
