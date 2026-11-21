import { describe, expect, it } from "vitest";
import { formatInviteExpiry } from "./format-invite-expiry";

describe("formatInviteExpiry (AC-1, NFR-16)", () => {
  it("same day in GMT+7 → HH:mm", () => {
    // 2026-11-21 13:00Z = 20:00 GMT+7; now 09:00Z = 16:00 GMT+7
    expect(formatInviteExpiry(new Date("2026-11-21T13:00:00Z"), new Date("2026-11-21T09:00:00Z"))).toBe("20:00");
  });

  it("different day in GMT+7 → HH:mm dd/MM", () => {
    // 2026-11-21 18:30Z = 01:30 ngày 22/11 GMT+7
    expect(formatInviteExpiry(new Date("2026-11-21T18:30:00Z"), new Date("2026-11-21T09:00:00Z"))).toBe("01:30 22/11");
  });

  it("uses GMT+7 for the day boundary, not UTC", () => {
    // now 2026-11-21 17:30Z = 00:30 ngày 22/11 GMT+7; expiry 2026-11-22 05:00Z = 12:00 ngày 22/11 GMT+7
    expect(formatInviteExpiry(new Date("2026-11-22T05:00:00Z"), new Date("2026-11-21T17:30:00Z"))).toBe("12:00");
  });
});
