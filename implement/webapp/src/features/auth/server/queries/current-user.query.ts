import "server-only";

import { redirect } from "next/navigation";
import { getSessionUid } from "@/core/server/session";
import { getUser } from "@/features/auth/db/user.repository";
import type { Me } from "@/features/auth/shared/types";

/** Hồ sơ người đang đăng nhập, hoặc null khi không có phiên hợp lệ / chưa có doc `users`. */
export async function getCurrentUser(): Promise<Me | null> {
  const uid = await getSessionUid();
  if (!uid) return null;
  return getUser(uid);
}

/** Cho Server Component cần phiên: không có → `redirect('/login')`. */
export async function requireUser(): Promise<Me> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return me;
}
