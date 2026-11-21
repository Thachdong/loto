import { FieldValue } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firestore, rtdb } from "@/core/db/firestore";
import { resetClock, setClock } from "@/core/server/clock";
import { getInvite } from "@/features/invite/server/queries/get-invite.query";
import { clearFirestoreAndAuth } from "../auth/google-token";
import { writeUserDoc } from "../room/session-cookie";
import { db, HOUR, INVITE, NOW, writeRoom } from "./invite-fixtures";

vi.mock("next/server", () => ({ connection: async () => undefined }));

async function snapshot() {
  const out: Record<string, unknown> = {};
  for (const col of ["rooms", "users"]) {
    for (const d of (await db.collection(col).get()).docs) out[d.ref.path] = d.data();
  }
  return out;
}

async function seedHost() {
  await writeUserDoc("u_host", {
    email: "host@example.com",
    name: "An Nguyễn",
    currentRoomId: "r_ok",
  });
  await db.doc("users/u_host").update({ photo_url: "https://example.com/a.png" });
}

beforeEach(async () => {
  await clearFirestoreAndAuth();
  await rtdb().ref().remove();
  setClock(() => NOW);
});

afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("getInvite", () => {
  it("AC-1, AC-18: anonymous valid invite returns exactly the InvitePreview keys, viewer null", async () => {
    await seedHost();
    await writeRoom("r_ok", { name: "Lô tô Tết nhà Ngoại", memberCount: 7 });

    const preview = await getInvite(INVITE);

    expect(Object.keys(preview).sort()).toEqual(["room", "status", "viewer"]);
    expect(Object.keys(preview.room).sort()).toEqual(
      ["expiresAt", "hostName", "hostPhotoUrl", "maxMembers", "memberCount", "name"].sort(),
    );
    expect(preview).toEqual({
      status: "valid",
      room: {
        name: "Lô tô Tết nhà Ngoại",
        hostName: "An Nguyễn",
        hostPhotoUrl: "https://example.com/a.png",
        memberCount: 7,
        maxMembers: 16,
        expiresAt: new Date(NOW.getTime() + 8 * HOUR).toISOString(),
      },
      viewer: null,
    });
    const json = JSON.stringify(preview);
    for (const secret of ["u_host", "host@example.com", INVITE, "blocked"]) expect(json).not.toContain(secret);
  });

  it("AC-9: malformed code → INVITE_INVALID without touching the database", async () => {
    const collection = vi.spyOn(firestore(), "collection");
    for (const bad of ["abc", "", "OKOKOKOKOKOKOKOKOKOKO", "OKOKOKOKOKOKOKOKOKOKOK!", "OKOKOKOKOKOKOKOKOKOKOKK"]) {
      await expect(getInvite(bad)).rejects.toMatchObject({ code: "INVITE_INVALID" });
    }
    expect(collection).not.toHaveBeenCalled();
  });

  it("AC-9: well-formed but unknown code → INVITE_INVALID", async () => {
    await expect(getInvite("ZZZZZZZZZZZZZZZZZZZZZZ")).rejects.toMatchObject({ code: "INVITE_INVALID" });
  });

  it("AC-7: expired link → status expired (still no write)", async () => {
    await seedHost();
    await writeRoom("r_ok", { expiresAt: new Date(NOW.getTime() - 60_000) });
    const before = await snapshot();
    expect((await getInvite(INVITE)).status).toBe("expired");
    expect(await snapshot()).toEqual(before);
  });

  it("AC-7: closing room → expired; closed room → closed", async () => {
    await seedHost();
    await writeRoom("r_ok", { status: "closing" });
    expect((await getInvite(INVITE)).status).toBe("expired");
    await writeRoom("r_ok", { status: "closed", memberCount: 0 });
    expect((await getInvite(INVITE)).status).toBe("closed");
  });

  it("AC-8: 16 members → full", async () => {
    await seedHost();
    await writeRoom("r_ok", { memberCount: 16 });
    const preview = await getInvite(INVITE);
    expect(preview.status).toBe("full");
    expect(preview.room.memberCount).toBe(16);
  });

  it("AC-13: viewer reflects in-this-room, other room, blocked, none", async () => {
    await seedHost();
    await writeRoom("r_ok", { blockedUids: ["u_blocked"] });
    await writeUserDoc("u_in", { email: "in@example.com", name: "In", currentRoomId: "r_ok" });
    await writeUserDoc("u_other", { email: "o@example.com", name: "O", currentRoomId: "r_other" });
    await writeUserDoc("u_blocked", { email: "b@example.com", name: "B" });
    await writeUserDoc("u_free", { email: "f@example.com", name: "F" });

    expect((await getInvite(INVITE, "u_in")).viewer).toEqual({ inThisRoom: true, currentRoomId: "r_ok", blocked: false });
    expect((await getInvite(INVITE, "u_other")).viewer).toEqual({
      inThisRoom: false,
      currentRoomId: "r_other",
      blocked: false,
    });
    expect((await getInvite(INVITE, "u_blocked")).viewer).toEqual({
      inThisRoom: false,
      currentRoomId: null,
      blocked: true,
    });
    expect((await getInvite(INVITE, "u_free")).viewer).toEqual({ inThisRoom: false, currentRoomId: null, blocked: false });
    expect((await getInvite(INVITE, "u_nodoc")).viewer).toEqual({ inThisRoom: false, currentRoomId: null, blocked: false });
  });

  it("AC-18: never writes (documents unchanged, updated_at untouched)", async () => {
    await seedHost();
    await writeRoom("r_ok");
    await db.doc("rooms/r_ok").update({ updated_at: FieldValue.delete() });
    const before = await snapshot();
    await getInvite(INVITE, "u_host");
    expect(await snapshot()).toEqual(before);
  });
});
