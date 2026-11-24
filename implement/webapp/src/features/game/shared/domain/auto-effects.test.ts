import { describe, expect, it } from "vitest";
import { autoEffects } from "./auto-effects";

/** Mỗi hàng r có 5 số ở cột 0,2,4,6,8: r*10 + 1.. r*10 + 5 (hàng 0: 1–5, hàng 1: 11–15…). */
const grid = Array.from({ length: 81 }, (_, i) => {
  const row = Math.floor(i / 9);
  const col = i % 9;
  return col % 2 === 0 ? row * 10 + col / 2 + 1 : 0;
});

describe("autoEffects", () => {
  it("marks only called numbers present on the ticket", () => {
    const fx = autoEffects(grid, [1, 2, 99], null);
    expect([...fx.marked].sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it("hit is the last number when it is on the ticket, else null", () => {
    expect(autoEffects(grid, [1, 2], 2).hit).toBe(2);
    expect(autoEffects(grid, [1, 2, 77], 77).hit).toBeNull();
    expect(autoEffects(grid, [], null).hit).toBeNull();
  });

  it("waiting rows = rows missing exactly one number", () => {
    expect(autoEffects(grid, [1, 2, 3, 4], 4).waitingRows).toEqual([0]);
    expect(autoEffects(grid, [1, 2, 3, 4, 11, 12, 13, 14], 14).waitingRows).toEqual([0, 1]);
  });

  it("a complete row or a row missing two is not waiting", () => {
    expect(autoEffects(grid, [1, 2, 3, 4, 5], 5).waitingRows).toEqual([]);
    expect(autoEffects(grid, [1, 2, 3], 3).waitingRows).toEqual([]);
  });

  it("empty ticket has no effects", () => {
    const fx = autoEffects(new Array(81).fill(0), [1, 2, 3], 3);
    expect(fx.marked.size).toBe(0);
    expect(fx.hit).toBeNull();
    expect(fx.waitingRows).toEqual([]);
  });
});
