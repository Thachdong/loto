import { describe, expect, it } from "vitest";
import { isValidDrawInterval, stepDrawInterval } from "./draw-interval";

describe("draw interval (BR-15, Q-070)", () => {
  it("only 5, 10, 15 are valid", () => {
    expect([5, 10, 15].every(isValidDrawInterval)).toBe(true);
    expect([3, 4, 6, 8, 16, 7.5].some(isValidDrawInterval)).toBe(false);
  });

  it("steps 5 ↔ 10 ↔ 15, stays at the ends; legacy values snap to the next option", () => {
    expect([stepDrawInterval(5, 1), stepDrawInterval(10, 1), stepDrawInterval(15, 1)]).toEqual([10, 15, 15]);
    expect([stepDrawInterval(15, -1), stepDrawInterval(10, -1), stepDrawInterval(5, -1)]).toEqual([10, 5, 5]);
    expect([stepDrawInterval(3, 1), stepDrawInterval(3, -1), stepDrawInterval(8, -1)]).toEqual([5, 3, 5]);
  });
});
