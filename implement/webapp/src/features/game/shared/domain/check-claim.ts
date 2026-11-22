import { GRID_SIZE } from "@/features/room/shared/domain/generate-ticket-set";

export type ClaimCheck = { win: boolean; row: number | null };

/**
 * KINH (BR-17): vé thắng khi có một hàng mà mọi số (ô khác 0) đều đã rao. `grid` 81 phần tử theo hàng,
 * 0 = ô trống. Nhiều hàng đủ → trả hàng nhỏ nhất (0-based). Chỉ là gợi ý của hệ thống (Q-055).
 */
export function checkClaim(grid: readonly number[], called: readonly number[]): ClaimCheck {
  const set = new Set(called);
  for (let row = 0; row < GRID_SIZE; row++) {
    const cells = grid.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE).filter((n) => n !== 0);
    if (cells.length > 0 && cells.every((n) => set.has(n))) return { win: true, row };
  }
  return { win: false, row: null };
}
