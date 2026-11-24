import { describe, expect, it } from "vitest";
import { clampDrawInterval, isValidDrawInterval } from "./draw-interval";

describe("draw interval (BR-15)", () => {
  it("3 and 15 valid, 2 / 16 / 5.5 invalid; clamp", () => {
    expect([3, 15, 8].every(isValidDrawInterval)).toBe(true);
    expect([2, 16, 5.5].some(isValidDrawInterval)).toBe(false);
    expect([clampDrawInterval(1), clampDrawInterval(20), clampDrawInterval(7)]).toEqual([3, 15, 7]);
  });
});
