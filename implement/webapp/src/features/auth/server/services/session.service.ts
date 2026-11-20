import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { getAdminAuth } from "@/core/server/firebase-admin";
import { SESSION_MAX_AGE_SEC, setSessionCookie } from "@/core/server/session";
import { upsertUserFromGoogle } from "@/features/auth/db/user.repository";
import type { SessionResult } from "@/features/auth/shared/types";

/** [ASSUMED] Firebase khuyến nghị chỉ tạo session cookie từ lần đăng nhập gần đây. */
const MAX_AUTH_AGE_MS = 5 * 60 * 1000;

async function verifyGoogleIdToken(idToken: string): Promise<DecodedIdToken> {
  let decoded: DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken, true);
  } catch {
    // Không log token.
    throw new AppError("GOOGLE_TOKEN_INVALID");
  }
  // BR-01: chỉ Google.
  if (decoded.firebase?.sign_in_provider !== "google.com") throw new AppError("GOOGLE_TOKEN_INVALID");
  if (now().getTime() - decoded.auth_time * 1000 > MAX_AUTH_AGE_MS) throw new AppError("GOOGLE_TOKEN_INVALID");
  if (!decoded.email) throw new AppError("GOOGLE_TOKEN_INVALID");
  return decoded;
}

/**
 * api-contract › createSession: verify ID token Google → upsert `users/{uid}` → cookie `__session` 14 ngày.
 */
export async function createSession(idToken: string): Promise<SessionResult> {
  const decoded = await verifyGoogleIdToken(idToken);

  const { me, isNewUser } = await upsertUserFromGoogle({
    uid: decoded.uid,
    email: decoded.email!,
    googleName: typeof decoded.name === "string" && decoded.name ? decoded.name : decoded.email!,
    googlePhotoUrl: typeof decoded.picture === "string" && decoded.picture ? decoded.picture : null,
    now: now(),
  });

  let sessionCookie: string;
  try {
    sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SEC * 1000,
    });
  } catch {
    throw new AppError("GOOGLE_TOKEN_INVALID");
  }
  await setSessionCookie(sessionCookie);

  return { me, isNewUser };
}
