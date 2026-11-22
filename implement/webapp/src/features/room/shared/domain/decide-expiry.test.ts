import { describe, expect, it } from "vitest";
import type { GameStatus, RoomStatus } from "@/features/room/shared/types";
import { decideExpiry } from "./decide-expiry";

const expiresAt = new Date("2026-11-21T10:00:00Z");
const after = new Date(expiresAt.getTime() + 1000);
const before = new Date(expiresAt.getTime() - 1);
const d = (roomStatus: RoomStatus | null, gameStatus: GameStatus | null, now = after) =>
  decideExpiry({ roomStatus, gameStatus, now, expiresAt });

describe("decideExpiry", () => {
  it("not yet expired → none; exactly at expires_at → expired", () => {
    expect(d("active", "waiting", before)).toBe("none");
    expect(d("active", "waiting", expiresAt)).toBe("cancel_and_close");
  });
  it("waiting / finished / cancelled / no game → cancel_and_close", () => {
    for (const g of ["waiting", "finished", "cancelled", null] as const) expect(d("active", g)).toBe("cancel_and_close");
  });
  it("running / paused → mark_closing", () => {
    expect(d("active", "running")).toBe("mark_closing");
    expect(d("active", "paused")).toBe("mark_closing");
  });
  it("awaiting_confirm → finish_and_close", () => {
    expect(d("active", "awaiting_confirm")).toBe("finish_and_close");
  });
  it("closing + game finished/cancelled → close; closing + game in progress → none", () => {
    expect(d("closing", "finished", before)).toBe("close");
    expect(d("closing", "cancelled")).toBe("close");
    expect(d("closing", "running")).toBe("none");
    expect(d("closing", "awaiting_confirm")).toBe("none");
  });
  it("closed / missing room → none", () => {
    expect(d("closed", "cancelled")).toBe("none");
    expect(d(null, null)).toBe("none");
  });
});
