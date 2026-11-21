import { ROOM_NAME_MAX } from "@/features/room/shared/constants";

/** Số ký tự Unicode (code point) — khớp bộ đếm `x/50` ở SCR-02. */
export function charCount(value: string): number {
  return [...value].length;
}

/** Tên mặc định "Phòng của {display_name}", cắt còn 50 ký tự (TBL-02). */
export function defaultRoomName(displayName: string): string {
  return [...`Phòng của ${displayName.trim()}`].slice(0, ROOM_NAME_MAX).join("");
}

/**
 * Tên phòng cuối cùng (api-contract › RoomCreate):
 * - không gửi `name` → tên mặc định;
 * - có gửi → trim; rỗng hoặc > 50 ký tự → `null` (service ném `ROOM_NAME_INVALID`).
 */
export function resolveRoomName(raw: string | undefined, displayName: string): string | null {
  if (raw === undefined) return defaultRoomName(displayName);
  const name = raw.trim();
  const length = charCount(name);
  if (length < 1 || length > ROOM_NAME_MAX) return null;
  return name;
}
