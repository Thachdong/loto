import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rtdb } from "@/core/db/firestore";
import { resetClock, setClock } from "@/core/server/clock";
import { joinRoomAction } from "@/features/invite/server/actions/join-room.action";
import { joinRoom } from "@/features/invite/server/services/join-room.service";
import { clearFirestoreAndAuth, createCookieStore } from "../auth/google-token";
import { attachSession, createSignedInUser, writeUserDoc } from "../room/session-cookie";
import { data, db, INVITE, JOIN, millis, NOW, writeRoom } from "./invite-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

const byInvite = { inviteCode: INVITE };
const byCode = { roomCode: JOIN };
const past = new Date(NOW.getTime() - 60_000);

async function signIn(email = "minh@example.com", name = "Minh", currentRoomId: string | null = null) {
  const user = await createSignedInUser({ email, name, currentRoomId });
  attachSession(cookieStore, user);
  return user;
}

const presence = async (roomId: string) => (await rtdb().ref(`presence_access/${roomId}`).get()).val();

beforeEach(async () => {
  await clearFirestoreAndAuth();
  await rtdb().ref().remove();
  cookieStore.reset();
  setClock(() => NOW);
});

afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("joinRoomAction", () => {
  it("AC-19: no session → UNAUTHENTICATED, nothing written", async () => {
    await writeRoom("r_ok");
    const result = await joinRoomAction(byInvite);
    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect((await data("rooms/r_ok"))?.member_count).toBe(1);
  });

  it("AC-3: invalid payloads (both keys, none, malformed) → VALIDATION_FAILED", async () => {
    await signIn();
    for (const bad of [{}, { inviteCode: INVITE, roomCode: JOIN }, { inviteCode: "short" }, { roomCode: "k7m2qx" }, { roomCode: "O0I1AB" }]) {
      expect(await joinRoomAction(bad)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    }
  });

  it("AC-3, AC-4: join by invite → current_room_id, member_count+1, last_event, presence_access, no players", async () => {
    await writeRoom("r_ok", { memberCount: 3 });
    const { uid } = await signIn("minh@example.com", "Minh");
    const before = millis((await data("rooms/r_ok"))?.created_at);

    const result = await joinRoomAction(byInvite);

    expect(result).toEqual({ ok: true, data: { roomId: "r_ok", alreadyMember: false } });
    const room = await data("rooms/r_ok");
    expect(room?.member_count).toBe(4);
    expect(room?.last_event).toMatchObject({
      type: "member_joined",
      text: "Minh đã vào phòng",
      actor_uid: uid,
      target_uid: null,
    });
    expect(millis(room?.last_event.at)).toBe(NOW.getTime());
    expect(millis(room?.updated_at)).toBe(NOW.getTime());
    expect(millis(room?.created_at)).toBe(before);
    const user = await data(`users/${uid}`);
    expect(user?.current_room_id).toBe("r_ok");
    expect(await presence("r_ok")).toEqual({ [uid]: true });
    expect((await db.collection("rooms/r_ok/players").get()).size).toBe(0);
  });

  it("AC-22: join by roomCode behaves like inviteCode", async () => {
    await writeRoom("r_ok", { memberCount: 3 });
    const { uid } = await signIn();
    expect(await joinRoomAction(byCode)).toEqual({ ok: true, data: { roomId: "r_ok", alreadyMember: false } });
    expect((await data("rooms/r_ok"))?.member_count).toBe(4);
    expect((await data(`users/${uid}`))?.current_room_id).toBe("r_ok");
  });

  it("AC-6: already in this room → alreadyMember, no write", async () => {
    await writeRoom("r_ok", { memberCount: 3 });
    const { uid } = await signIn("minh@example.com", "Minh", "r_ok");
    const before = await data("rooms/r_ok");
    for (const input of [byInvite, byCode]) {
      expect(await joinRoomAction(input)).toEqual({ ok: true, data: { roomId: "r_ok", alreadyMember: true } });
    }
    expect(await data("rooms/r_ok")).toEqual(before);
    expect((await data(`users/${uid}`))?.current_room_id).toBe("r_ok");
    expect(await presence("r_ok")).toBeNull();
  });

  it("AC-9: unknown invite → INVITE_INVALID; AC-23: unknown room code → ROOM_CODE_INVALID", async () => {
    await signIn();
    expect(await joinRoomAction({ inviteCode: "ZZZZZZZZZZZZZZZZZZZZZZ" })).toMatchObject({
      ok: false,
      error: { code: "INVITE_INVALID" },
    });
    expect(await joinRoomAction({ roomCode: "ZZZZ22" })).toMatchObject({ ok: false, error: { code: "ROOM_CODE_INVALID" } });
  });

  it("AC-7: invite_expires_at passed (room not otherwise expired) → INVITE_EXPIRED, no write", async () => {
    await writeRoom("r_ok", { inviteExpiresAt: past });
    const { uid } = await signIn();
    expect(await joinRoomAction(byInvite)).toMatchObject({ ok: false, error: { code: "INVITE_EXPIRED" } });
    expect((await data("rooms/r_ok"))?.member_count).toBe(1);
    expect((await data(`users/${uid}`))?.current_room_id).toBeNull();
  });

  it("AC-7, AC-23: closed room → INVITE_EXPIRED by link, ROOM_CODE_INVALID by code", async () => {
    await writeRoom("r_ok", { status: "closed", memberCount: 0 });
    await signIn();
    expect(await joinRoomAction(byInvite)).toMatchObject({ ok: false, error: { code: "INVITE_EXPIRED" } });
    expect(await joinRoomAction(byCode)).toMatchObject({ ok: false, error: { code: "ROOM_CODE_INVALID" } });
  });

  it("AC-7, AC-23: closing room → INVITE_EXPIRED by link, ROOM_CODE_INVALID by code", async () => {
    await writeRoom("r_ok", { status: "closing", gameStatus: "running" });
    await signIn();
    expect(await joinRoomAction(byInvite)).toMatchObject({ ok: false, error: { code: "INVITE_EXPIRED" } });
    expect(await joinRoomAction(byCode)).toMatchObject({ ok: false, error: { code: "ROOM_CODE_INVALID" } });
  });

  it("AC-7: active room past expires_at (game waiting) → lazily closed and committed, then INVITE_EXPIRED", async () => {
    await writeRoom("r_ok", { expiresAt: past, memberCount: 2 });
    await writeUserDoc("u_host", { email: "host@example.com", name: "An", currentRoomId: "r_ok" });
    await rtdb().ref("presence_access/r_ok").set({ u_host: true });
    const { uid } = await signIn();

    expect(await joinRoomAction(byInvite)).toMatchObject({ ok: false, error: { code: "INVITE_EXPIRED" } });

    expect(await data("rooms/r_ok")).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
    expect((await data("rooms/r_ok/games/g1"))?.status).toBe("cancelled");
    expect((await data("users/u_host"))?.current_room_id).toBeNull();
    expect((await data(`users/${uid}`))?.current_room_id).toBeNull();
    expect(await presence("r_ok")).toBeNull();
  });

  it("AC-23: expired active room by code → ROOM_CODE_INVALID and still lazily closed", async () => {
    await writeRoom("r_ok", { expiresAt: past });
    await signIn();
    expect(await joinRoomAction(byCode)).toMatchObject({ ok: false, error: { code: "ROOM_CODE_INVALID" } });
    expect(await data("rooms/r_ok")).toMatchObject({ status: "closed", close_reason: "expired" });
  });

  it("AC-7: expired active room with a running game → closing (not closed), error returned", async () => {
    await writeRoom("r_ok", { expiresAt: past, gameStatus: "running" });
    await signIn();
    expect(await joinRoomAction(byInvite)).toMatchObject({ ok: false, error: { code: "INVITE_EXPIRED" } });
    expect(await data("rooms/r_ok")).toMatchObject({ status: "closing" });
    expect((await data("rooms/r_ok"))?.last_event?.type).toBe("room_closing");
  });

  it("AC-10: blocked uid → BLOCKED_FROM_ROOM, no write", async () => {
    await writeRoom("r_ok", { memberCount: 3 });
    const { uid } = await signIn();
    await db.doc("rooms/r_ok").update({ blocked_uids: [uid] });
    for (const input of [byInvite, byCode]) {
      expect(await joinRoomAction(input)).toMatchObject({ ok: false, error: { code: "BLOCKED_FROM_ROOM" } });
    }
    expect((await data("rooms/r_ok"))?.member_count).toBe(3);
    expect((await data(`users/${uid}`))?.current_room_id).toBeNull();
  });

  it("AC-11, AC-26: in another open room → ALREADY_IN_ROOM with currentRoomId, nothing changes", async () => {
    await writeRoom("r_ok", { memberCount: 3 });
    await writeRoom("r_other", { inviteCode: "B".repeat(22), joinCode: "LAN234", memberCount: 2 });
    const { uid } = await signIn("lan@example.com", "Lan", "r_other");
    for (const input of [byInvite, byCode]) {
      expect(await joinRoomAction(input)).toMatchObject({
        ok: false,
        error: { code: "ALREADY_IN_ROOM", details: [{ code: "current_room", currentRoomId: "r_other" }] },
      });
    }
    expect((await data("rooms/r_ok"))?.member_count).toBe(3);
    expect((await data("rooms/r_other"))?.member_count).toBe(2);
    expect((await data(`users/${uid}`))?.current_room_id).toBe("r_other");
  });

  it("AC-11: current room just expired with a running game → closing committed, ALREADY_IN_ROOM", async () => {
    await writeRoom("r_ok");
    await writeRoom("r_other", { inviteCode: "B".repeat(22), joinCode: "LAN234", expiresAt: past, gameStatus: "running" });
    const { uid } = await signIn("lan@example.com", "Lan", "r_other");
    expect(await joinRoomAction(byInvite)).toMatchObject({
      ok: false,
      error: { code: "ALREADY_IN_ROOM", details: [{ currentRoomId: "r_other" }] },
    });
    expect((await data("rooms/r_other"))?.status).toBe("closing");
    expect((await data(`users/${uid}`))?.current_room_id).toBe("r_other");
  });

  it("AC-11, AC-12: current room expired (waiting) → closed lazily, user joins the new room", async () => {
    await writeRoom("r_ok", { memberCount: 3 });
    await writeRoom("r_other", { inviteCode: "B".repeat(22), joinCode: "LAN234", expiresAt: past, memberCount: 2 });
    await writeUserDoc("u_peer", { email: "p@example.com", name: "Peer", currentRoomId: "r_other" });
    await rtdb().ref("presence_access/r_other").set({ u_peer: true });
    const { uid } = await signIn("lan@example.com", "Lan", "r_other");

    expect(await joinRoomAction(byInvite)).toEqual({ ok: true, data: { roomId: "r_ok", alreadyMember: false } });

    expect(await data("rooms/r_other")).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
    expect((await data("users/u_peer"))?.current_room_id).toBeNull();
    expect((await data(`users/${uid}`))?.current_room_id).toBe("r_ok");
    expect((await data("rooms/r_ok"))?.member_count).toBe(4);
    expect(await presence("r_other")).toBeNull();
    expect(await presence("r_ok")).toEqual({ [uid]: true });
  });

  it("AC-11: stale current_room_id pointing to a closed room → join succeeds", async () => {
    await writeRoom("r_ok");
    await writeRoom("r_other", { inviteCode: "B".repeat(22), joinCode: "LAN234", status: "closed", memberCount: 0 });
    const { uid } = await signIn("lan@example.com", "Lan", "r_other");
    expect(await joinRoomAction(byInvite)).toMatchObject({ ok: true });
    expect((await data(`users/${uid}`))?.current_room_id).toBe("r_ok");
  });

  it("AC-12: stale current_room_id pointing to a missing room → join succeeds", async () => {
    await writeRoom("r_ok");
    const { uid } = await signIn("lan@example.com", "Lan", "r_gone");
    expect(await joinRoomAction(byCode)).toMatchObject({ ok: true });
    expect((await data(`users/${uid}`))?.current_room_id).toBe("r_ok");
  });

  it("AC-13, AC-26: full room → ROOM_FULL for both inputs, no write", async () => {
    await writeRoom("r_ok", { memberCount: 16 });
    const { uid } = await signIn();
    for (const input of [byInvite, byCode]) {
      expect(await joinRoomAction(input)).toMatchObject({ ok: false, error: { code: "ROOM_FULL" } });
    }
    expect((await data("rooms/r_ok"))?.member_count).toBe(16);
    expect((await data(`users/${uid}`))?.current_room_id).toBeNull();
  });

  it("AC-13: ROOM_FULL after current room lazily closed → commit closes it and clears the user's current_room_id", async () => {
    await writeRoom("r_ok", { memberCount: 16 });
    await writeRoom("r_other", { inviteCode: "B".repeat(22), joinCode: "LAN234", expiresAt: past });
    const { uid } = await signIn("lan@example.com", "Lan", "r_other");
    expect(await joinRoomAction(byInvite)).toMatchObject({ ok: false, error: { code: "ROOM_FULL" } });
    expect((await data("rooms/r_other"))?.status).toBe("closed");
    expect((await data(`users/${uid}`))?.current_room_id).toBeNull();
  });

  it("AC-26: error order — not found > already member > expired > blocked > other room > full", async () => {
    const { uid } = await signIn("lan@example.com", "Lan", "r_other");
    await writeRoom("r_other", { inviteCode: "B".repeat(22), joinCode: "LAN234" });
    // blocked + other room + full + invite expired → expired wins
    await writeRoom("r_ok", { memberCount: 16, blockedUids: [uid], inviteExpiresAt: past });
    expect(await joinRoomAction(byInvite)).toMatchObject({ error: { code: "INVITE_EXPIRED" } });
    // blocked + other room + full → blocked wins
    await writeRoom("r_ok", { memberCount: 16, blockedUids: [uid] });
    expect(await joinRoomAction(byInvite)).toMatchObject({ error: { code: "BLOCKED_FROM_ROOM" } });
    // other room + full → ALREADY_IN_ROOM wins
    await writeRoom("r_ok", { memberCount: 16 });
    expect(await joinRoomAction(byInvite)).toMatchObject({ error: { code: "ALREADY_IN_ROOM" } });
  });

  it("AC-15: re-joining after leaving counts as a fresh join and creates no players", async () => {
    await writeRoom("r_ok", { memberCount: 3 });
    const { uid } = await signIn();
    await joinRoomAction(byInvite);
    // tự rời phòng (giả lập): xóa current_room_id và giảm số người
    await db.doc(`users/${uid}`).update({ current_room_id: null });
    await db.doc("rooms/r_ok").update({ member_count: 3 });
    expect(await joinRoomAction(byInvite)).toEqual({ ok: true, data: { roomId: "r_ok", alreadyMember: false } });
    expect((await data("rooms/r_ok"))?.member_count).toBe(4);
    expect((await db.collection("rooms/r_ok/players").get()).size).toBe(0);
  });

  it("presence_access failure is only logged; join still succeeds", async () => {
    await writeRoom("r_ok");
    const { uid } = await signIn();
    const ref = vi.spyOn(rtdb(), "ref").mockImplementation(() => {
      throw new Error("rtdb down");
    });
    const result = await joinRoomAction(byInvite);
    ref.mockRestore();
    expect(result).toMatchObject({ ok: true });
    expect((await data(`users/${uid}`))?.current_room_id).toBe("r_ok");
  });
});

describe("joinRoom concurrency (AC-14)", () => {
  for (let run = 1; run <= 5; run++) {
    it(`two parallel joins with 1 seat left → exactly one wins (run ${run})`, async () => {
      await clearFirestoreAndAuth();
      await rtdb().ref().remove();
      await writeRoom("r_ok", { memberCount: 15 });
      await writeUserDoc("u_a", { email: "a@example.com", name: "A" });
      await writeUserDoc("u_b", { email: "b@example.com", name: "B" });

      const results = await Promise.allSettled([joinRoom("u_a", byInvite), joinRoom("u_b", byCode)]);

      const ok = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0]?.reason).toMatchObject({ code: "ROOM_FULL" });
      expect((await data("rooms/r_ok"))?.member_count).toBe(16);
      const inRoom = (await db.collection("users").where("current_room_id", "==", "r_ok").get()).size;
      expect(inRoom).toBe(1);
    });
  }
});
