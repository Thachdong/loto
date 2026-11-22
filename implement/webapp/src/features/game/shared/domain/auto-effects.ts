const SIZE = 9;
const NUMBERS_PER_ROW = 5;

export type AutoEffects = {
  /** Số trên vé đã rao (mode Auto: ô đánh dấu tính từ `called_numbers`). */
  marked: Set<number>;
  /** `lastNumber` nếu có trên vé (viền đỏ + rung), ngược lại null. */
  hit: number | null;
  /** Chỉ số hàng (0–8) còn thiếu đúng 1 số (SUP-10, BR-20) — viền "chờ". */
  waitingRows: number[];
};

/** Hiệu ứng mode Auto cho 1 vé (SCR-04 #12). Tự dò không gọi hàm này. */
export function autoEffects(grid: readonly number[], called: readonly number[], lastNumber: number | null): AutoEffects {
  const calledSet = new Set(called);
  const marked = new Set<number>();
  const waitingRows: number[] = [];
  for (let row = 0; row < SIZE; row++) {
    let rowNumbers = 0;
    let rowMarked = 0;
    for (let col = 0; col < SIZE; col++) {
      const value = grid[row * SIZE + col] ?? 0;
      if (value === 0) continue;
      rowNumbers++;
      if (calledSet.has(value)) {
        rowMarked++;
        marked.add(value);
      }
    }
    if (rowNumbers === NUMBERS_PER_ROW && rowMarked === NUMBERS_PER_ROW - 1) waitingRows.push(row);
  }
  const hit = lastNumber !== null && grid.includes(lastNumber) && lastNumber !== 0 ? lastNumber : null;
  return { marked, hit, waitingRows };
}
