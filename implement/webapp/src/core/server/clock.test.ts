import { afterEach, describe, expect, it } from "vitest";
import { now, resetClock, setClock } from "./clock";

afterEach(resetClock);

describe("clock", () => {
  it("can be replaced in tests and reset", () => {
    const fixed = new Date("2026-11-18T17:30:00Z");
    setClock(() => fixed);
    expect(now()).toBe(fixed);
    resetClock();
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(1000);
  });
});
