import { describe, expect, it } from "vitest";
import { inferLeaveReason, type LastRoomSnapshot } from "./leave-reason";

const now = new Date("2026-11-21T10:00:00Z");
const future = new Date("2026-11-21T12:00:00Z");
const past = new Date("2026-11-21T09:00:00Z");

const base: LastRoomSnapshot = { status: "active", closeReason: null, expiresAt: future, lastEvent: null };

describe("inferLeaveReason", () => {
  it("no snapshot → unknown", () => {
    expect(inferLeaveReason(null, "u_an", now)).toBe("unknown");
  });

  it("member_kicked targeting me → kicked", () => {
    const snap = { ...base, lastEvent: { type: "member_kicked", targetUid: "u_an", text: null, atMs: null } };
    expect(inferLeaveReason(snap, "u_an", now)).toBe("kicked");
    expect(inferLeaveReason(snap, "u_other", now)).toBe("unknown");
  });

  it("closed with host_left → host_left", () => {
    expect(inferLeaveReason({ ...base, status: "closed", closeReason: "host_left" }, "u_an", now)).toBe("host_left");
  });

  it("AC-12: closed (expired) or expires_at passed → expired", () => {
    expect(inferLeaveReason({ ...base, status: "closed", closeReason: "expired" }, "u_an", now)).toBe("expired");
    expect(inferLeaveReason({ ...base, status: "closed" }, "u_an", now)).toBe("expired");
    expect(inferLeaveReason({ ...base, expiresAt: past }, "u_an", now)).toBe("expired");
    expect(inferLeaveReason({ ...base, expiresAt: now }, "u_an", now)).toBe("expired");
  });

  it("active room still valid → unknown", () => {
    expect(inferLeaveReason(base, "u_an", now)).toBe("unknown");
  });
});
