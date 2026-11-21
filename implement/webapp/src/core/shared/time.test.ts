import { describe, expect, it } from "vitest";
import { formatTimeVN } from "./time";

describe("formatTimeVN", () => {
  it("AC-9: converts UTC to GMT+7 across midnight", () => {
    expect(formatTimeVN(new Date("2026-11-18T17:30:00Z"), "HH:mm")).toBe("00:30");
    expect(formatTimeVN(new Date("2026-11-18T17:30:00Z"), "dd/MM HH:mm")).toBe("19/11 00:30");
  });

  it("pads hours and keeps 24h clock", () => {
    expect(formatTimeVN(Date.UTC(2026, 0, 1, 1, 5), "HH:mm")).toBe("08:05");
    expect(formatTimeVN(Date.UTC(2026, 0, 1, 15, 59), "dd/MM HH:mm")).toBe("01/01 22:59");
  });
});
