import "server-only";

import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { getAdminAuth } from "./firebase-admin";

/** Tên cookie phiên (ADR-07). Firebase Hosting/App Hosting chỉ chuyển cookie tên `__session`. */
export const SESSION_COOKIE = "__session";
/** 14 ngày (SUP-05). */
export const SESSION_MAX_AGE_SEC = 14 * 24 * 60 * 60;

/**
 * uid của phiên hiện tại, hoặc null khi thiếu / sai / bị thu hồi session cookie.
 * `verifySessionCookie(…, checkRevoked = true)` theo api-contract › Xác thực.
 * Ngoài request scope (VD unit test) cũng coi như không có phiên. Lỗi nội bộ của Next
 * (prerender / dynamic bail-out) được ném lại qua `unstable_rethrow`. Không log giá trị cookie.
 */
export async function getSessionUid(): Promise<string | null> {
  try {
    const value = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!value) return null;
    // verifySessionCookie đọc giờ hệ thống — báo Next đây là dữ liệu theo request (cacheComponents).
    await connection();
    const decoded = await getAdminAuth().verifySessionCookie(value, true);
    return decoded.uid;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/** Đặt cookie `__session` — chỉ gọi trong Server Action / Route Handler. */
export async function setSessionCookie(value: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    // [ASSUMED] dev chạy http://localhost nên chỉ bật secure ở production.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  });
}
