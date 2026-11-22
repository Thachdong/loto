import { MAX_NUMBER } from "@/features/game/shared/constants";

/** Nguồn số nguyên đều trong [0, max). Server tiêm `cryptoRandomInt`, test tiêm bản giả. */
export type RandomInt = (max: number) => number;

/**
 * Chọn số kế tiếp đều trong các số 1–90 chưa rao (BR-14). Trả null khi đã rao đủ 90 số.
 */
export function pickNextNumber(called: readonly number[], randomInt: RandomInt): number | null {
  const taken = new Set(called);
  const remaining: number[] = [];
  for (let n = 1; n <= MAX_NUMBER; n++) if (!taken.has(n)) remaining.push(n);
  if (remaining.length === 0) return null;
  const index = randomInt(remaining.length);
  return remaining[Math.min(remaining.length - 1, Math.max(0, index))];
}
