import { describe, expect, it } from "vitest";
import { checkClaim } from "./check-claim";

/** Lưới 9×9, mỗi hàng 5 số ở cột 0,2,4,6,8 (số r*10+... không quan trọng, chỉ cần khác nhau). */
function grid(): number[] {
  const g = new Array<number>(81).fill(0);
  for (let r = 0; r < 9; r++) for (let k = 0; k < 5; k++) g[r * 9 + k * 2] = r * 9 + k * 2 + 1;
  return g;
}
const rowNumbers = (g: number[], r: number) => g.slice(r * 9, r * 9 + 9).filter((n) => n !== 0);

describe("checkClaim", () => {
  it("no number called → miss", () => {
    expect(checkClaim(grid(), [])).toEqual({ win: false, row: null });
  });

  it("row missing one number → miss", () => {
    const g = grid();
    expect(checkClaim(g, rowNumbers(g, 3).slice(1))).toEqual({ win: false, row: null });
  });

  it("full row → win with that row", () => {
    const g = grid();
    expect(checkClaim(g, [...rowNumbers(g, 4), 90, 89])).toEqual({ win: true, row: 4 });
  });

  it("AC-24: two full rows → smallest row", () => {
    const g = grid();
    expect(checkClaim(g, [...rowNumbers(g, 7), ...rowNumbers(g, 2)])).toEqual({ win: true, row: 2 });
  });

  it("numbers from different rows do not combine", () => {
    const g = grid();
    expect(checkClaim(g, [...rowNumbers(g, 0).slice(0, 3), ...rowNumbers(g, 1).slice(0, 3)]).win).toBe(false);
  });

  it("empty row (no numbers) is never a win", () => {
    expect(checkClaim(new Array<number>(81).fill(0), [1, 2, 3])).toEqual({ win: false, row: null });
  });
});
