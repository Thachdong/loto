import "client-only";

/** `[ASSUMED]` (plan §6.1): `loto:sound` ≠ "off" → Bật (mặc định); sessionStorage `loto:soundUnlocked` = đã chạm bật tiếng trong phiên. */
export const SOUND_KEY = "loto:sound";
export const SOUND_UNLOCKED_KEY = "loto:soundUnlocked";

export function isSoundOn(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
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
