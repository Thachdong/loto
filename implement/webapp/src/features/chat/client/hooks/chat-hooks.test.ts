import { describe, expect, it, vi } from "vitest";
import { mergeMessages, type ChatMessage } from "./use-chat-messages";
import { countUnread } from "./use-chat-unread";

vi.mock("@/core/client/firebase", () => ({ getClientAuth: vi.fn(), getClientFirestore: vi.fn() }));

const m = (id: string, at: number, senderUid = "u_a"): ChatMessage => ({ id, senderUid, senderName: "A", senderPhotoUrl: null, text: id, createdAt: new Date(at) });

describe("mergeMessages", () => {
  it("dedupes by id and sorts old → new", () => {
    expect(mergeMessages([m("a", 1), m("b", 2)], [m("b", 2), m("c", 3)]).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("countUnread (AC-12)", () => {
  it("counts others' messages after seenAt", () => {
    const list = [m("1", 10), m("2", 20), m("3", 30, "me"), m("4", 40)];
    expect(countUnread(list, "me", 15)).toBe(2);
    expect(countUnread(list, "me", 0)).toBe(3);
    expect(countUnread(list, "me", 40)).toBe(0);
  });
});
