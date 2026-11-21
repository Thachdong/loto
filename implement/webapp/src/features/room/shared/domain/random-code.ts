/** Bảng base62 cho `invite_code` (ADR-09). */
export const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Số nguyên ngẫu nhiên đều trong [0, max). Server truyền `crypto.randomInt` (NFR-08). */
export type RandomInt = (max: number) => number;

/** Chuỗi `length` ký tự lấy đều từ `alphabet` — hàm thuần, nguồn ngẫu nhiên do người gọi truyền vào. */
export function randomCode(alphabet: string, length: number, randomInt: RandomInt): string {
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}
