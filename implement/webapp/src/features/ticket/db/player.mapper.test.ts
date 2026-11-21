import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { newPlayerDoc, playerFromDoc } from "./player.mapper";

describe("player mapper", () => {
  it("newPlayerDoc has every TBL-06 field with expire_at = room created + 31 days", () => {
    const joinedAt = new Date("2026-11-21T10:05:00Z");
    const roomCreatedAt = new Date("2026-11-21T10:00:00Z");
    const doc = newPlayerDoc({ displayName: "B", photoUrl: null, ticketId: "red_a", joinedAt, roomCreatedAt });
    expect(doc.display_name).toBe("B");
    expect(doc.photo_url).toBeNull();
    expect(doc.ticket_ids).toEqual(["red_a"]);
    expect(doc.joined_at.toMillis()).toBe(joinedAt.getTime());
    expect(doc.expire_at.toMillis()).toBe(roomCreatedAt.getTime() + 31 * 86_400_000);
  });

  it("playerFromDoc maps snake_case to camelCase", () => {
    const at = Timestamp.now();
    const record = playerFromDoc("u_b", {
      display_name: "B",
      photo_url: "http://x/p.png",
      ticket_ids: ["red_a", "pink_b"],
      joined_at: at,
      expire_at: at,
    });
    expect(record).toEqual({ uid: "u_b", displayName: "B", photoUrl: "http://x/p.png", ticketIds: ["red_a", "pink_b"] });
  });
});
