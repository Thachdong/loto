import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, ROOM_CODE_PATTERN } from "@/features/room/shared/constants";

/**
 * Chuẩn hóa mã phòng gõ tay (SCR-02 #10, BR-30): in hoa, bỏ khoảng trắng và mọi ký tự ngoài bảng
 * `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (O/0/I/1 không có), cắt còn 6 ký tự.
 */
export function normalizeRoomCode(raw: string): string {
  return Array.from(raw.toUpperCase())
    .filter((char) => ROOM_CODE_ALPHABET.includes(char))
    .slice(0, ROOM_CODE_LENGTH)
    .join("");
}

export function isRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(value);
}
