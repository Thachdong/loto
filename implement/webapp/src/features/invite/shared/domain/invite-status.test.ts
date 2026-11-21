import { describe, expect, it } from "vitest";
import { computeInviteStatus } from "./invite-status";

const expires = new Date("2026-11-21T10:00:00Z");
const before = new Date(expires.getTime() - 1);
const room = { status: "active" as const, memberCount: 3, inviteExpiresAt: expires };

describe("computeInviteStatus (AC-1, AC-7, AC-8, AC-13)", () => {
  it("active, not expired, not full → valid", () => {
    expect(computeInviteStatus(room, before)).toBe("valid");
    expect(computeInviteStatus({ ...room, memberCount: 15 }, before)).toBe("valid");
  });

  it("closed wins over everything", () => {
    expect(computeInviteStatus({ ...room, status: "closed", memberCount: 16 }, expires)).toBe("closed");
  });

  it("closing → expired", () => {
    expect(computeInviteStatus({ ...room, status: "closing" }, before)).toBe("expired");
  });

  it("now ≥ invite_expires_at → expired, even when full", () => {
    expect(computeInviteStatus(room, expires)).toBe("expired");
    expect(computeInviteStatus({ ...room, memberCount: 16 }, new Date(expires.getTime() + 1))).toBe("expired");
  });

  it("16 members → full", () => {
    expect(computeInviteStatus({ ...room, memberCount: 16 }, before)).toBe("full");
  });
});
