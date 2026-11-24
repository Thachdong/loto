import { describe, expect, it } from "vitest";
import { sortHistory, toHistoryCard, type HistoryGame } from "./history-card";

const utc = (s: string) => new Date(`2026-11-24T${s}:00Z`);
const base: HistoryGame = {
  id: "g1",
  seqNo: 1,
  status: "finished",
  result: "won",
  winners: [{ uid: "u_c", displayName: "cúc", ticketId: "blue_a", color: "blue" }],
  startedAt: utc("16:00"),
  endedAt: utc("16:30"),
  createdAt: utc("15:50"),
};

describe("toHistoryCard", () => {
  it("won: start–end in GMT+7 (UTC 16:30 → 23:30), winner with photo or initial", () => {
    const card = toHistoryCard(base, { u_c: "https://x/c.png" });
    expect(card.time).toEqual({ kind: "range", from: "23:00", to: "23:30" });
    expect(card.outcome).toBe("won");
    expect(card.winners[0]).toMatchObject({ displayName: "cúc", ticketId: "blue_a", photoUrl: "https://x/c.png", initial: "C" });
    expect(toHistoryCard(base).winners[0].photoUrl).toBeNull();
  });

  it("two winners kept in order", () => {
    const g = { ...base, winners: [...base.winners, { uid: "u_b", displayName: "Bình", ticketId: "red_b" as const, color: "red" as const }] };
    expect(toHistoryCard(g).winners.map((w) => w.uid)).toEqual(["u_c", "u_b"]);
  });

  it("no_winner and cancelled-before-start (only the cancel time, falls back to created_at)", () => {
    expect(toHistoryCard({ ...base, result: "no_winner", winners: [] }).outcome).toBe("no_winner");
    const cancelled = toHistoryCard({ ...base, status: "cancelled", result: null, startedAt: null, endedAt: null });
    expect(cancelled).toMatchObject({ outcome: "cancelled", winners: [], time: { kind: "cancelled", at: "22:50" } });
  });

  it("sortHistory: newest seq first", () => {
    expect(sortHistory([{ seqNo: 1 }, { seqNo: 3 }, { seqNo: 2 }]).map((g) => g.seqNo)).toEqual([3, 2, 1]);
  });
});
