import "client-only";

/** `[ASSUMED]` (plan §6.1): `loto:sound` ≠ "off" → Bật (mặc định); sessionStorage `loto:soundUnlocked` = đã chạm bật tiếng trong phiên. */
export const SOUND_KEY = "loto:sound";
export const SOUND_UNLOCKED_KEY = "loto:soundUnlocked";

/** localStorage bị chặn → giữ giá trị trong bộ nhớ trang (SCR-11.A1 lỗi). */
let memorySound: boolean | null = null;

export function isSoundOn(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return memorySound ?? true;
  }
}

export function wasSoundUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(SOUND_UNLOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSoundUnlocked(): void {
  try {
    window.sessionStorage.setItem(SOUND_UNLOCKED_KEY, "1");
  } catch {
    // storage bị chặn → lớp chạm hiện lại lần sau, không sao.
  }
}

/** Sự kiện cùng tab khi đổi bật/tắt tiếng. */
export const SOUND_EVENT = "loto:sound-change";

/** Nút "Tắt tiếng"/"Bật tiếng" ở thanh KINH: lưu `loto:sound` (on/off). */
export function setSoundOn(on: boolean): void {
  memorySound = on;
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* bỏ qua */
  }
  window.dispatchEvent(new Event(SOUND_EVENT));
}
