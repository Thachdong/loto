/** BR-15: nhịp quay 3–15 giây, mặc định 5, bước 1. */
export const DRAW_INTERVAL_MIN = 3;
export const DRAW_INTERVAL_MAX = 15;
export const DRAW_INTERVAL_DEFAULT = 5;

export function isValidDrawInterval(n: number): boolean {
  return Number.isInteger(n) && n >= DRAW_INTERVAL_MIN && n <= DRAW_INTERVAL_MAX;
}

export function clampDrawInterval(n: number): number {
  return Math.min(DRAW_INTERVAL_MAX, Math.max(DRAW_INTERVAL_MIN, Math.round(n)));
}
