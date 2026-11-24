/** BR-15 (Q-070): nhịp quay chỉ 5 → 10 → 15 giây, mặc định 5. */
export const DRAW_INTERVAL_OPTIONS = [5, 10, 15] as const;
export const DRAW_INTERVAL_MIN = DRAW_INTERVAL_OPTIONS[0];
export const DRAW_INTERVAL_MAX = DRAW_INTERVAL_OPTIONS[DRAW_INTERVAL_OPTIONS.length - 1];
export const DRAW_INTERVAL_DEFAULT = 5;

export function isValidDrawInterval(n: number): boolean {
  return (DRAW_INTERVAL_OPTIONS as readonly number[]).includes(n);
}

/**
 * Mức kế tiếp theo hướng bấm (−/+). Giá trị cũ ngoài danh sách (VD phòng seed 3 giây) → mức gần nhất theo hướng
 * đó; không còn mức → giữ nguyên.
 */
export function stepDrawInterval(value: number, delta: 1 | -1): number {
  const options = DRAW_INTERVAL_OPTIONS as readonly number[];
  if (delta > 0) return options.find((o) => o > value) ?? value;
  const lower = options.filter((o) => o < value);
  return lower.length > 0 ? lower[lower.length - 1] : value;
}
