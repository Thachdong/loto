import "server-only";

/** NFR-11: dữ liệu phòng giữ 31 ngày rồi TTL xóa (ADR-10). */
export const RETENTION_MS = 31 * 24 * 60 * 60 * 1000;

/** `expire_at` cho mọi doc thuộc phòng = `rooms.created_at + 31 ngày`. */
export function expireAtFrom(createdAt: Date): Date {
  return new Date(createdAt.getTime() + RETENTION_MS);
}
