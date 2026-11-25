/**
 * Nhịp rao theo audio (ADR-05 sửa đổi — bỏ nhịp 5/10/15 giây): mỗi số có clip riêng; số chỉ hiện khi clip của nó
 * gần hết. Server chọn trước "số chờ" (stream phát ngay), lần `drawNumber` kế tiếp (`next_call_at`) mới đưa nó vào
 * `called_numbers` rồi chọn số chờ mới.
 */

/** Clip thiếu / không đo được → coi như dài chừng này. */
export const FALLBACK_CALL_MS = 3000;
/** Sau tiếp tục ván (resume / bác KINH): clip số chờ thường đã phát xong khi tạm dừng → hiện sau chừng này. */
export const RESUME_REVEAL_MS = 1500;
/** Lần gọi trễ hơn giờ hẹn quá mức này (tab ngủ, mất mạng) → tính giờ hẹn mới từ lúc gọi, không từ giờ hẹn cũ. */
export const MAX_REVEAL_DRIFT_MS = 3000;

/**
 * Giờ hiện số chờ mới = giờ hẹn trước + độ dài clip mới (stream phát nối tiếp nên clip mới bắt đầu đúng lúc clip trước
 * hết — neo vào giờ hẹn để trễ mạng không cộng dồn). Gọi trễ quá `MAX_REVEAL_DRIFT_MS` → neo vào lúc gọi.
 */
export function nextRevealAt(previous: Date | null, at: Date, durationMs: number): Date {
  const prev = previous?.getTime() ?? null;
  const base = prev !== null && at.getTime() - prev <= MAX_REVEAL_DRIFT_MS ? Math.max(prev, at.getTime() - MAX_REVEAL_DRIFT_MS) : at.getTime();
  return new Date(base + Math.max(0, durationMs));
}
