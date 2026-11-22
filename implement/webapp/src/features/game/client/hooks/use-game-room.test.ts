import { describe, expect, it } from "vitest";
import { mapPlayerDoc, mapTicketDoc } from "./use-game-room";

describe("use-game-room mappers", () => {
  it("mapPlayerDoc keeps only valid ticket ids", () => {
    expect(mapPlayerDoc({ display_name: "Bình", ticket_ids: ["red_a", "nope", "blue_b"] }, "u_b")).toEqual({
      uid: "u_b",
      displayName: "Bình",
      photoUrl: null,
      ticketIds: ["red_a", "blue_b"],
    });
  });
  it("mapTicketDoc derives color/side from id when missing", () => {
    expect(mapTicketDoc({ grid: [1, 0] }, "teal_b")).toMatchObject({ id: "teal_b", color: "teal", side: "b", grid: [1, 0], setNo: 0 });
  });
});
