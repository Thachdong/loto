import { describe, expect, it } from "vitest";
import { pickNextNumber } from "./pick-next-number";

describe("pickNextNumber", () => {
  it("picks from the remaining numbers using the injected random", () => {
    expect(pickNextNumber([], () => 0)).toBe(1);
    expect(pickNextNumber([], (max) => max - 1)).toBe(90);
    expect(pickNextNumber([1, 2, 3], () => 0)).toBe(4);
  });

  it("passes the count of remaining numbers as max", () => {
    let seen = 0;
    pickNextNumber([5, 6], (max) => ((seen = max), 0));
    expect(seen).toBe(88);
  });

  it("AC-03: never repeats — drawing 90 times yields a permutation of 1..90", () => {
    let state = 12345;
    const rng = (max: number) => ((state = (state * 1103515245 + 12345) % 2 ** 31), state % max);
    const called: number[] = [];
    for (let i = 0; i < 90; i++) {
      const n = pickNextNumber(called, rng);
      expect(n).not.toBeNull();
      called.push(n as number);
    }
    expect([...called].sort((a, b) => a - b)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
    expect(pickNextNumber(called, rng)).toBeNull();
  });
});
