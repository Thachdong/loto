import { describe, expect, it } from "vitest";
import { drawFireAt } from "./draw-fire-at";

describe("drawFireAt", () => {
  const next = 1_000_000;
  it("host fires at next_call_at", () => {
    expect(drawFireAt({ nextCallAt: next, role: "host", serverOffsetMs: 0 })).toBe(next);
  });
  it("backup k fires at next_call_at + 5k seconds", () => {
    expect(drawFireAt({ nextCallAt: next, role: { backupIndex: 1 }, serverOffsetMs: 0 })).toBe(next + 5000);
    expect(drawFireAt({ nextCallAt: next, role: { backupIndex: 2 }, serverOffsetMs: 0 })).toBe(next + 10_000);
  });
  it("converts server time to local time: server ahead by 2s → fire 2s earlier locally", () => {
    expect(drawFireAt({ nextCallAt: new Date(next), role: "host", serverOffsetMs: 2000 })).toBe(next - 2000);
    expect(drawFireAt({ nextCallAt: next, role: "host", serverOffsetMs: -1500 })).toBe(next + 1500);
  });
  it("clamps backupIndex below 1 to 1", () => {
    expect(drawFireAt({ nextCallAt: next, role: { backupIndex: 0 }, serverOffsetMs: 0 })).toBe(next + 5000);
  });
});
