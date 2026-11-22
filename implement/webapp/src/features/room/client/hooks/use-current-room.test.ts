import { describe, expect, it } from "vitest";
import { mapGameDoc, mapRoomDoc } from "./use-current-room";

describe("mapGameDoc", () => {
  it("maps claims, resume_status, pause_reason and next_call_at", () => {
    const g = mapGameDoc(
      {
        seq_no: 2,
        status: "awaiting_confirm",
        pause_reason: null,
        resume_status: "running",
        next_call_at: null,
        player_count: 3,
        claims: [
          { uid: "u_c", display_name: "Cúc", ticket_id: "blue_a", color: "blue", result: "win", row: 0, claimed_at: new Date(5000) },
          { uid: "u_b", display_name: "Bình", ticket_id: "red_a", color: "red", result: "miss", row: null, claimed_at: new Date(6000) },
        ],
      },
      "g1",
    );
    expect(g).toMatchObject({ id: "g1", seqNo: 2, status: "awaiting_confirm", resumeStatus: "running", nextCallAt: null, playerCount: 3 });
    expect(g.claims).toEqual([
      { uid: "u_c", displayName: "Cúc", ticketId: "blue_a", color: "blue", result: "win", row: 0, claimedAtMs: 5000 },
      { uid: "u_b", displayName: "Bình", ticketId: "red_a", color: "red", result: "miss", row: null, claimedAtMs: 6000 },
    ]);
  });

  it("defaults: no claims, waiting", () => {
    expect(mapGameDoc({}, "g")).toMatchObject({ status: "waiting", claims: [], resumeStatus: null, pauseReason: null });
  });
});

describe("mapRoomDoc", () => {
  it("maps draw interval and called numbers", () => {
    const r = mapRoomDoc({ draw_interval_sec: 3, called_numbers: [5, 7, "x"], expires_at: new Date(1000) }, "r1");
    expect(r.drawIntervalSec).toBe(3);
    expect(r.calledNumbers).toEqual([5, 7]);
    expect(mapRoomDoc({}, "r").drawIntervalSec).toBe(5);
  });
});
