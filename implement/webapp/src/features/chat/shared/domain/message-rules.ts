/** BR-23: tin 1–500 ký tự sau trim (đếm code point — emoji = 1). */
export const MESSAGE_MAX = 500;
/** SCR-06 #4: bộ đếm hiện khi n ≥ 450. */
export const MESSAGE_COUNTER_FROM = 450;
/** SUP-07: tối đa 5 tin / 10 giây / người. */
export const CHAT_RATE_MAX = 5;
export const CHAT_RATE_WINDOW_MS = 10_000;

/** Độ dài theo code point sau trim — dùng chung client (bộ đếm, khóa nút) và server. */
export function messageLength(text: string): number {
  return Array.from(text.trim()).length;
}

export type NormalizedMessage = { ok: true; text: string } | { ok: false; code: "MESSAGE_EMPTY" | "MESSAGE_TOO_LONG" };

export function normalizeMessage(text: string): NormalizedMessage {
  const trimmed = text.trim();
  const length = Array.from(trimmed).length;
  if (length === 0) return { ok: false, code: "MESSAGE_EMPTY" };
  if (length > MESSAGE_MAX) return { ok: false, code: "MESSAGE_TOO_LONG" };
  return { ok: true, text: trimmed };
}

/**
 * SUP-07: `recent` = mốc gửi gần đây (`users.chat_recent_at`). Đủ 5 mốc trong 10 giây (tính cả biên) → từ chối;
 * ngược lại thêm `now`, giữ tối đa 5 mốc mới nhất.
 */
export function checkChatRate(recent: readonly Date[], now: Date): { allowed: boolean; nextRecent: Date[] } {
  const inWindow = recent.filter((d) => now.getTime() - d.getTime() < CHAT_RATE_WINDOW_MS);
  if (inWindow.length >= CHAT_RATE_MAX) return { allowed: false, nextRecent: [...recent] };
  const nextRecent = [...recent, now].sort((a, b) => a.getTime() - b.getTime()).slice(-CHAT_RATE_MAX);
  return { allowed: true, nextRecent };
}
