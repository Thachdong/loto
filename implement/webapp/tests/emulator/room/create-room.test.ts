import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rtdb } from "@/core/db/firestore";
import { resetClock, setClock } from "@/core/server/clock";
import { getAdminApp } from "@/core/server/firebase-admin";
import { createRoomAction } from "@/features/room/server/actions/create-room.action";
import { createRoom } from "@/features/room/server/services/room.service";
import { INVITE_CODE_PATTERN, ROOM_CODE_PATTERN } from "@/features/room/shared/constants";
import { clearFirestoreAndAuth, createCookieStore } from "../auth/google-token";
import { attachSession, createSignedInUser, writeUserDoc } from "./session-cookie";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
// connection() chỉ chạy trong request Next — no-op trong test.
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

const db = getFirestore(getAdminApp());
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const COLORS = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"];
const TICKET_IDS = COLORS.flatMap((c) => [`${c}_a`, `${c}_b`]).sort();

const roomCount = async () => (await db.collection("rooms").get()).size;
const data = async (path: string) => (await db.doc(path).get()).data();
const millis = (v: unknown) => (v as Timestamp).toMillis();

async function signIn(email = "an@example.com", name = "An Nguyễn", currentRoomId: string | null = null) {
  const user = await createSignedInUser({ email, name, currentRoomId });
  attachSession(cookieStore, user);
  return user;
}

/** Phòng thô cho test (field tối thiểu service đọc). */
async function writeRoom(
  roomId: string,
  opts: { hostUid: string; status?: string; expiresAt: Date; gameStatus?: string; joinCode?: string },
) {
  const at = Timestamp.fromMillis(opts.expiresAt.getTime() - 8 * HOUR);
  await db.doc(`rooms/${roomId}`).set({
    name: `Phòng ${roomId}`,
    host_uid: opts.hostUid,
    status: opts.status ?? "active",
    member_count: 2,
    blocked_uids: [],
    invite_code: "a".repeat(22),
    join_code: opts.joinCode ?? "ZZZ999",
    invite_expires_at: Timestamp.fromDate(opts.expiresAt),
    expires_at: Timestamp.fromDate(opts.expiresAt),
    draw_interval_sec: 5,
    called_numbers: [],
    current_game_id: "g1",
    game_count: 1,
    ticket_set_no: 1,
    last_event: null,
    created_by: opts.hostUid,
    created_at: at,
    updated_at: at,
    closed_at: null,
    close_reason: null,
    expire_at: Timestamp.fromMillis(at.toMillis() + 31 * DAY),
  });
  await db.doc(`rooms/${roomId}/games/g1`).set({ seq_no: 1, status: opts.gameStatus ?? "waiting", claims: [] });
}

beforeEach(async () => {
  await clearFirestoreAndAuth();
  await rtdb().ref().remove();
  cookieStore.reset();
  resetClock();
});

afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("createRoomAction", () => {
  it("AC-2, AC-3, AC-4, AC-18: creates room, game 1, 16 tickets, current_room_id, presence_access", async () => {
    const fixed = new Date("2026-11-21T03:00:00.000Z");
    setClock(() => fixed);
    const { uid } = await signIn();

    const result = await createRoomAction({ name: "Lô tô Tết" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const created = result.data;
    expect(created).toMatchObject({ name: "Lô tô Tết", drawIntervalSec: 5, expiresAt: "2026-11-21T11:00:00.000Z" });
    expect(created.inviteCode).toMatch(INVITE_CODE_PATTERN);
    expect(created.roomCode).toMatch(ROOM_CODE_PATTERN);
    expect(created.inviteUrl).toBe(`http://localhost:3000/join/${created.inviteCode}`);

    const room = await data(`rooms/${created.roomId}`);
    expect(room).toMatchObject({
      name: "Lô tô Tết",
      host_uid: uid,
      created_by: uid,
      status: "active",
      member_count: 1,
      blocked_uids: [],
      invite_code: created.inviteCode,
      join_code: created.roomCode,
      draw_interval_sec: 5,
      called_numbers: [],
      current_game_id: created.currentGameId,
      game_count: 1,
      ticket_set_no: 1,
      last_event: null,
      closed_at: null,
      close_reason: null,
    });
    const createdAt = millis(room?.created_at);
    expect(createdAt).toBe(fixed.getTime());
    expect(millis(room?.expires_at)).toBe(createdAt + 8 * HOUR);
    expect(millis(room?.invite_expires_at)).toBe(createdAt + 8 * HOUR);
    expect(millis(room?.updated_at)).toBe(createdAt);
    expect(millis(room?.expire_at)).toBe(createdAt + 31 * DAY);

    const game = await data(`rooms/${created.roomId}/games/${created.currentGameId}`);
    expect(game).toEqual({
      seq_no: 1,
      status: "waiting",
      pause_reason: null,
      next_call_at: null,
      claims: [],
      resume_status: null,
      winners: [],
      result: null,
      player_count: 0,
      started_at: null,
      ended_at: null,
      confirmed_by: null,
      created_at: room?.created_at,
      expire_at: room?.expire_at,
    });
    expect((await db.collection(`rooms/${created.roomId}/games`).get()).size).toBe(1);

    const tickets = await db.collection(`rooms/${created.roomId}/tickets`).get();
    expect(tickets.docs.map((d) => d.id).sort()).toEqual(TICKET_IDS);
    const grids = new Map<string, number[]>();
    for (const t of tickets.docs) {
      const doc = t.data();
      expect(doc).toMatchObject({ color: t.id.split("_")[0], side: t.id.split("_")[1], set_no: 1 });
      expect(millis(doc.expire_at)).toBe(createdAt + 31 * DAY);
      expect(doc.grid).toHaveLength(81);
      for (let r = 0; r < 9; r++) {
        expect(doc.grid.slice(r * 9, r * 9 + 9).filter((n: number) => n > 0)).toHaveLength(5);
      }
      grids.set(t.id, doc.grid);
    }
    for (const color of COLORS) {
      const merged = [...grids.get(`${color}_a`)!, ...grids.get(`${color}_b`)!].filter((n) => n > 0);
      expect(merged.sort((a, b) => a - b)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
    }

    const user = await data(`users/${uid}`);
    expect(user?.current_room_id).toBe(created.roomId);
    expect(millis(user?.updated_at)).toBe(createdAt);
    expect(millis(user?.last_active_at)).toBe(createdAt);

    expect((await rtdb().ref(`presence_access/${created.roomId}/${uid}`).get()).val()).toBe(true);
  });

  it("AC-6: no name → 'Phòng của {display_name}'", async () => {
    await signIn();
    const result = await createRoomAction({});
    expect(result.ok && result.data.name).toBe("Phòng của An Nguyễn");
  });

  it("AC-6: long display_name → default name cut to 50 characters", async () => {
    await signIn("long@example.com", "N".repeat(60));
    const result = await createRoomAction({});
    expect(result.ok && [...result.data.name].length).toBe(50);
  });

  it("AC-7: name of 51 characters or only spaces → ROOM_NAME_INVALID, no doc created", async () => {
    const { uid } = await signIn();
    for (const name of ["x".repeat(51), "   "]) {
      const result = await createRoomAction({ name });
      expect(result).toMatchObject({ ok: false, error: { code: "ROOM_NAME_INVALID" } });
    }
    expect(await roomCount()).toBe(0);
    expect((await data(`users/${uid}`))?.current_room_id).toBeNull();
  });

  it("name is trimmed; 50 characters accepted", async () => {
    await signIn();
    const result = await createRoomAction({ name: `  ${"é".repeat(50)}  ` });
    expect(result.ok && result.data.name).toBe("é".repeat(50));
  });

  it("VALIDATION_FAILED: unknown field or wrong type", async () => {
    await signIn();
    expect(await createRoomAction({ name: "A", extra: 1 })).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED" },
    });
    expect(await createRoomAction({ name: 42 })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(await roomCount()).toBe(0);
  });

  it("AC-8: already in an active room → ALREADY_IN_ROOM with currentRoomId, no new room", async () => {
    const { uid } = await signIn("cuc@example.com", "Cúc", "r_old");
    await writeRoom("r_old", { hostUid: uid, expiresAt: new Date(Date.now() + 8 * HOUR) });

    const result = await createRoomAction({ name: "Phòng mới" });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "ALREADY_IN_ROOM",
        message: "Bạn đang ở một phòng khác, hãy rời phòng đó trước",
        details: [{ code: "current_room", currentRoomId: "r_old" }],
      },
    });
    expect(await roomCount()).toBe(1);
    expect((await data(`users/${uid}`))?.current_room_id).toBe("r_old");
  });

  it("AC-8: room in 'closing' → ALREADY_IN_ROOM", async () => {
    const { uid } = await signIn("cuc@example.com", "Cúc", "r_old");
    await writeRoom("r_old", {
      hostUid: uid,
      status: "closing",
      gameStatus: "running",
      expiresAt: new Date(Date.now() - HOUR),
    });
    const result = await createRoomAction({});
    expect(result).toMatchObject({ ok: false, error: { code: "ALREADY_IN_ROOM" } });
    expect(await roomCount()).toBe(1);
  });

  it("expired room with game running → ALREADY_IN_ROOM and room is marked closing (lazy expiry kept)", async () => {
    const { uid } = await signIn("cuc@example.com", "Cúc", "r_old");
    await writeRoom("r_old", { hostUid: uid, gameStatus: "running", expiresAt: new Date(Date.now() - HOUR) });

    const result = await createRoomAction({});

    expect(result).toMatchObject({
      ok: false,
      error: { code: "ALREADY_IN_ROOM", details: [{ currentRoomId: "r_old" }] },
    });
    const room = await data("rooms/r_old");
    expect(room?.status).toBe("closing");
    expect(room?.last_event?.type).toBe("room_closing");
    expect(await roomCount()).toBe(1);
  });

  it("AC-9: current room expired with game waiting → old room closed, game cancelled, members cleared, new room created", async () => {
    const { uid: dao } = await signIn("dao@example.com", "Đào", "r_expired");
    await writeUserDoc("u_em", { email: "em@example.com", name: "Em", currentRoomId: "r_expired" });
    await writeRoom("r_expired", { hostUid: dao, expiresAt: new Date(Date.now() - 60_000) });
    await rtdb().ref("presence_access/r_expired").set({ [dao]: true, u_em: true });
    await rtdb().ref("presence/r_expired").set({ u_em: { online: true } });

    const result = await createRoomAction({ name: "Phòng mới" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const old = await data("rooms/r_expired");
    expect(old).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
    expect(old?.closed_at).toBeInstanceOf(Timestamp);
    expect(old?.last_event?.type).toBe("room_closed");
    const oldGame = await data("rooms/r_expired/games/g1");
    expect(oldGame).toMatchObject({ status: "cancelled", result: "cancelled" });
    expect(oldGame?.ended_at).toBeInstanceOf(Timestamp);
    expect((await data("users/u_em"))?.current_room_id).toBeNull();
    expect((await data(`users/${dao}`))?.current_room_id).toBe(result.data.roomId);
    expect((await rtdb().ref("presence_access/r_expired").get()).exists()).toBe(false);
    expect((await rtdb().ref("presence/r_expired").get()).exists()).toBe(false);
    expect((await rtdb().ref(`presence_access/${result.data.roomId}/${dao}`).get()).val()).toBe(true);
  });

  it("AC-9 (clock): room created earlier expires once the server clock passes expires_at", async () => {
    const { uid } = await signIn();
    const t0 = Date.now();
    setClock(() => new Date(t0));
    const first = await createRoomAction({ name: "Phòng 1" });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    setClock(() => new Date(t0 + 7 * HOUR));
    expect(await createRoomAction({})).toMatchObject({ ok: false, error: { code: "ALREADY_IN_ROOM" } });

    setClock(() => new Date(t0 + 8 * HOUR));
    const second = await createRoomAction({ name: "Phòng 2" });
    expect(second.ok).toBe(true);
    expect((await data(`rooms/${first.data.roomId}`))?.status).toBe("closed");
    expect((await data(`users/${uid}`))?.current_room_id).toBe(second.ok && second.data.roomId);
  });

  it("current_room_id points to a closed or missing room → treated as empty", async () => {
    const { uid } = await signIn("cuc@example.com", "Cúc", "r_closed");
    await writeRoom("r_closed", { hostUid: uid, status: "closed", expiresAt: new Date(Date.now() - HOUR) });
    expect((await createRoomAction({})).ok).toBe(true);

    await writeUserDoc(uid, { email: "cuc@example.com", name: "Cúc", currentRoomId: "r_missing" });
    expect((await createRoomAction({})).ok).toBe(true);
  });

  it("AC-21: no session cookie → UNAUTHENTICATED", async () => {
    const result = await createRoomAction({ name: "Lô tô" });
    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect(await roomCount()).toBe(0);
  });

  it("valid session but no users doc → UNAUTHENTICATED", async () => {
    const user = await createSignedInUser({ email: "x@example.com", name: "X", withUserDoc: false });
    attachSession(cookieStore, user);
    expect(await createRoomAction({})).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect(await roomCount()).toBe(0);
  });
});

describe("createRoom join_code (BR-30)", () => {
  it("AC-22: generated code held by an active room → regenerated; closed room holding it does not block", async () => {
    const { uid: host } = await signIn("host@example.com", "Host");
    await writeRoom("r_active", { hostUid: host, joinCode: "AAAAAA", expiresAt: new Date(Date.now() + HOUR) });
    await writeRoom("r_closing", {
      hostUid: host,
      status: "closing",
      joinCode: "BBBBBB",
      expiresAt: new Date(Date.now() - HOUR),
    });
    await writeRoom("r_closed", {
      hostUid: host,
      status: "closed",
      joinCode: "CCCCCC",
      expiresAt: new Date(Date.now() - HOUR),
    });

    const { uid: an } = await createSignedInUser({ email: "an@example.com", name: "An" });
    const codes = ["AAAAAA", "BBBBBB", "DDDDDD"];
    const gen = vi.fn(() => codes.shift()!);
    const created = await createRoom(an, {}, { generateJoinCode: gen });
    expect(created.roomCode).toBe("DDDDDD");
    expect(gen).toHaveBeenCalledTimes(3);

    const { uid: binh } = await createSignedInUser({ email: "binh@example.com", name: "Bình" });
    const reused = await createRoom(binh, {}, { generateJoinCode: () => "CCCCCC" });
    expect(reused.roomCode).toBe("CCCCCC");
    expect((await data(`rooms/${reused.roomId}`))?.join_code).toBe("CCCCCC");
  });

  it("AC-22: 5 collisions in a row → INTERNAL_ERROR, nothing written", async () => {
    const { uid: host } = await signIn("host@example.com", "Host");
    await writeRoom("r_active", { hostUid: host, joinCode: "AAAAAA", expiresAt: new Date(Date.now() + HOUR) });
    const { uid: an } = await createSignedInUser({ email: "an@example.com", name: "An" });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const gen = vi.fn(() => "AAAAAA");

    await expect(createRoom(an, {}, { generateJoinCode: gen })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(gen).toHaveBeenCalledTimes(5);
    expect(await roomCount()).toBe(1);
    expect((await data(`users/${an}`))?.current_room_id).toBeNull();
    expect(log.mock.calls.some((c) => String(c[0]).includes("join_code_exhausted"))).toBe(true);
  });
});
