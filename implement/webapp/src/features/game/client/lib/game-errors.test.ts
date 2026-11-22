import { describe, expect, it } from "vitest";
import { vi } from "@/core/shared/i18n/vi";
import { gameErrorMessage, NETWORK_ERROR } from "./game-errors";

describe("gameErrorMessage", () => {
  it("maps SCR-04 error codes to the specified toasts", () => {
    expect(gameErrorMessage("start", { code: "NO_TICKETS_HELD" })).toBe(vi.err.noTickets);
    expect(gameErrorMessage("start", { code: "ROOM_CLOSING" })).toBe(vi.err.roomClosing);
    expect(gameErrorMessage("claim", { code: "NOT_TICKET_HOLDER" })).toBe(vi.err.notTicketHolder);
    expect(gameErrorMessage("claim", { code: "TICKET_ALREADY_CLAIMED" })).toBe(vi.err.ticketAlreadyClaimed);
    expect(gameErrorMessage("claim", { code: "CLAIMS_CLOSED" })).toBe(vi.err.claimsClosed);
  });
  it("state races are ignored (listener updates the UI)", () => {
    expect(gameErrorMessage("pause", { code: "GAME_NOT_RUNNING" })).toBeNull();
    expect(gameErrorMessage("resume", { code: "GAME_NOT_PAUSED" })).toBeNull();
    expect(gameErrorMessage("start", { code: "GAME_NOT_WAITING" })).toBeNull();
  });
  it("network / unknown: claim → 'Chưa gửi được KINH, bấm lại', others generic", () => {
    expect(gameErrorMessage("claim", { code: NETWORK_ERROR })).toBe(vi.err.claimNetwork);
    expect(gameErrorMessage("start", { code: NETWORK_ERROR })).toBe(vi.err.generic);
    expect(gameErrorMessage("claim", { code: "INTERNAL_ERROR" })).toBe(vi.err.claimNetwork);
  });
});
