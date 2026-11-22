import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { claimFromDoc, claimToDoc, finishedGamePatch, resultOfClaims, winnerFromClaim, type ClaimRecord } from "./game.mapper";

const at = new Date("2026-11-21T10:00:00Z");
const win: ClaimRecord = { uid: "u1", displayName: "An", ticketId: "red_a", color: "red", result: "win", row: 2, claimedAt: at };
const miss: ClaimRecord = { ...win, uid: "u2", displayName: "Bình", ticketId: "blue_b", color: "blue", result: "miss", row: null };

describe("game.mapper", () => {
  it("claim round-trips through the doc shape (snake_case)", () => {
    const doc = claimToDoc(win);
    expect(doc).toMatchObject({ uid: "u1", display_name: "An", ticket_id: "red_a", color: "red", result: "win", row: 2 });
    expect((doc.claimed_at as Timestamp).toMillis()).toBe(at.getTime());
    expect(claimFromDoc(doc)).toEqual(win);
  });

  it("winnerFromClaim keeps the claim fields", () => {
    expect(winnerFromClaim(win)).toMatchObject({ uid: "u1", display_name: "An", ticket_id: "red_a", row: 2 });
  });

  it("AC-38: resultOfClaims → won with winners when any win, else no_winner", () => {
    const won = resultOfClaims([miss, win]);
    expect(won.result).toBe("won");
    expect(won.winners.map((w) => w.uid)).toEqual(["u1"]);
    expect(resultOfClaims([miss])).toEqual({ result: "no_winner", winners: [] });
    expect(resultOfClaims([])).toEqual({ result: "no_winner", winners: [] });
  });

  it("finishedGamePatch stops the game and clears pending state", () => {
    const patch = finishedGamePatch({ result: "no_winner", winners: [] }, at);
    expect(patch).toMatchObject({ status: "finished", result: "no_winner", winners: [], next_call_at: null, pause_reason: null, resume_status: null });
    expect((patch.ended_at as Timestamp).toMillis()).toBe(at.getTime());
  });
});
