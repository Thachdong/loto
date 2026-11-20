import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import type { UserDoc } from "./user.doc";
import { toMe } from "./user.mapper";

const ts = Timestamp.fromMillis(1_700_000_000_000);

const doc: UserDoc = {
  email: "an@example.com",
  google_name: "An Nguyễn",
  google_photo_url: "https://example.com/a.png",
  display_name: "An lô tô",
  photo_url: null,
  profile_customized: true,
  current_room_id: "r_1",
  chat_recent_at: [ts],
  last_active_at: ts,
  created_at: ts,
  updated_at: ts,
};

describe("toMe", () => {
  it("maps snake_case doc to camelCase Me", () => {
    expect(toMe("u_an", doc)).toEqual({
      uid: "u_an",
      email: "an@example.com",
      displayName: "An lô tô",
      photoUrl: null,
      googleName: "An Nguyễn",
      googlePhotoUrl: "https://example.com/a.png",
      profileCustomized: true,
      currentRoomId: "r_1",
    });
  });

  it("does not expose chat_recent_at, last_active_at or timestamps", () => {
    const me = toMe("u_an", doc) as Record<string, unknown>;
    for (const key of ["chatRecentAt", "chat_recent_at", "lastActiveAt", "last_active_at", "createdAt", "updatedAt"]) {
      expect(me).not.toHaveProperty(key);
    }
  });

  it("normalizes missing nullable fields to null", () => {
    const partial = { ...doc, photo_url: undefined, google_photo_url: undefined, current_room_id: undefined };
    const me = toMe("u_an", partial as unknown as UserDoc);
    expect(me.photoUrl).toBeNull();
    expect(me.googlePhotoUrl).toBeNull();
    expect(me.currentRoomId).toBeNull();
  });
});
