import { describe, expect, it } from "vitest";
import type { GameStatus, TicketId } from "@/features/room/shared/types";
import { TICKET_IDS } from "@/features/ticket/shared/constants";
import type { PlayerView, TicketView } from "@/features/ticket/shared/types";
import { deriveTicketCards, type DeriveInput } from "./derive-ticket-cards";

const player = (uid: string, ticketIds: TicketId[]): PlayerView => ({ uid, displayName: uid, photoUrl: null, ticketIds });
const derive = (over: Partial<DeriveInput> = {}) =>
  deriveTicketCards({ tickets: [], players: [], presence: {}, gameStatus: "waiting", meUid: "b", ...over });
const card = (board: ReturnType<typeof derive>, id: TicketId) => board.cards.find((c) => c.id === id)!;

describe("deriveTicketCards", () => {
  it("returns 16 cards in fixed color order, A before B", () => {
    const board = derive();
    expect(board.cards.map((c) => c.id)).toEqual([...TICKET_IDS]);
    expect(board.cards.slice(0, 4).map((c) => c.id)).toEqual(["red_a", "red_b", "orange_a", "orange_b"]);
    expect(board.cards[15]!.id).toBe("pink_b");
  });

  it("counts nothing held at the start (AC-1)", () => {
    const board = derive();
    expect(board).toMatchObject({ myCount: 0, heldCount: 0, soldOut: false, locked: false });
    expect(board.cards.every((c) => c.holder === null && c.action === "take")).toBe(true);
  });

  it("marks my tickets and counts mine/held (AC-3, AC-11)", () => {
    const board = derive({ players: [player("b", ["green_a"]), player("c", ["red_a"])] });
    expect(card(board, "green_a")).toMatchObject({ mine: true, action: "release" });
    expect(card(board, "red_a")).toMatchObject({ mine: false, action: "taken", holder: { uid: "c" } });
    expect(board).toMatchObject({ myCount: 1, heldCount: 2 });
  });

  it("locks take at 2 tickets but keeps release (AC-5)", () => {
    const board = derive({ players: [player("b", ["red_a", "pink_b"])] });
    expect(card(board, "orange_a").action).toBe("max");
    expect(card(board, "red_a").action).toBe("release");
  });

  it("uses the first holder when data is inconsistent", () => {
    const board = derive({ players: [player("c", ["red_a"]), player("d", ["red_a"])] });
    expect(card(board, "red_a").holder?.uid).toBe("c");
  });

  it("locks everything when the game is not waiting (AC-9)", () => {
    for (const gameStatus of ["running", "paused", "awaiting_confirm", "finished"] as GameStatus[]) {
      const board = derive({ gameStatus, players: [player("b", ["red_a"])] });
      expect(board.locked).toBe(true);
      expect(board.cards.every((c) => c.action === "running")).toBe(true);
    }
  });

  it("treats an unknown game status as locked", () => {
    expect(derive({ gameStatus: null }).locked).toBe(true);
  });

  it("marks lockedUntilEnd only for holders without a presence node while running (AC-10)", () => {
    const board = derive({
      gameStatus: "running",
      players: [player("b", ["red_a"]), player("c", ["blue_b"]), player("d", ["teal_a"])],
      presence: { b: true, d: false },
    });
    expect(card(board, "blue_b").lockedUntilEnd).toBe(true);
    expect(card(board, "teal_a").lockedUntilEnd).toBe(false); // offline nhưng còn node
    expect(card(board, "red_a").lockedUntilEnd).toBe(false);
  });

  it("does not mark lockedUntilEnd while waiting or before presence is loaded", () => {
    const held = [player("c", ["blue_b"])];
    expect(card(derive({ players: held, presence: {} }), "blue_b").lockedUntilEnd).toBe(false);
    expect(card(derive({ gameStatus: "running", players: held, presence: null }), "blue_b").lockedUntilEnd).toBe(false);
  });

  it("flags soldOut when all 16 tickets have owners (AC-12)", () => {
    const first = TICKET_IDS.slice(0, 8) as TicketId[];
    const second = TICKET_IDS.slice(8) as TicketId[];
    const players = [
      ...first.map((id, i) => player(`u${i}`, [id])),
      ...second.map((id, i) => player(`v${i}`, [id])),
    ];
    const board = derive({ players });
    expect(board.heldCount).toBe(16);
    expect(board.soldOut).toBe(true);
  });

  it("attaches ticket docs and partner ids", () => {
    const ticket: TicketView = { id: "red_a", color: "red", side: "a", grid: [], setNo: 1 };
    const board = derive({ tickets: [ticket] });
    expect(card(board, "red_a")).toMatchObject({ ticket, partnerId: "red_b", color: "red", side: "a" });
    expect(card(board, "red_b").ticket).toBeNull();
  });
});
