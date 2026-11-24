import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rtdb } from "@/core/db/firestore";
import { resetClock, setClock } from "@/core/server/clock";
import { leaveRoomAction } from "@/features/room/server/actions/leave-room.action";
import { createCookieStore } from "../auth/google-token";
import { db, millis } from "../invite/invite-fixtures";
import { GAME, gameDoc, NOW, patchGame, ROOM, roomDoc, ts, userDoc } from "../game/game-fixtures";
import { createCast, players, resetAll, signInAs, writePlayer, writePresence, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;
const leave = () => leaveRoomAction({ roomId: ROOM });
const exists = async (path: string) => (await rtdb().ref(path).get()).exists();

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
  await writePlayer(cast.C.uid, "Cúc C", ["blue_a"]);
  const access = { [cast.H.uid]: true, [cast.B.uid]: true, [cast.C.uid]: true };
  await rtdb().ref(`presence_access/${ROOM}`).set(access);
  for (const u of [cast.H, cast.B, cast.C]) await writePresence(u.uid, true);
});

afterEach(() => resetClock());

describe("leaveRoomAction", () => {
  it("no session → UNAUTHENTICATED; not a member → NOT_ROOM_MEMBER", async () => {
    expect(await leave()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.X);
    expect(await leave()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("AC-33: player leaves while waiting → player doc deleted, member_count − 1, member_left, RTDB removed", async () => {
    signInAs(cookieStore, cast.B);
    expect(await leave()).toEqual({ ok: true, data: null });
    expect((await userDoc(cast.B.uid))?.current_room_id).toBeNull();
    expect((await players().doc(cast.B.uid).get()).exists).toBe(false);
    expect((await players().doc(cast.C.uid).get()).exists).toBe(true);
    const room = await roomDoc();
    expect(room).toMatchObject({ member_count: 2, status: "active" });
    expect(room?.last_event).toMatchObject({ type: "member_left", text: "Bình B đã rời phòng", actor_uid: cast.B.uid });
    expect(await exists(`presence/${ROOM}/${cast.B.uid}`)).toBe(false);
    expect(await exists(`presence_access/${ROOM}/${cast.B.uid}`)).toBe(false);
    expect(await exists(`presence/${ROOM}/${cast.C.uid}`)).toBe(true);
    expect(await exists(`presence_access/${ROOM}/${cast.C.uid}`)).toBe(true);
  });

  it("AC-34: player leaves mid-game → player doc and claims kept, game untouched; second leave → NOT_ROOM_MEMBER", async () => {
    const claim = { uid: cast.B.uid, display_name: "Bình B", ticket_id: "red_a", color: "red", result: "miss", row: null, claimed_at: ts(NOW) };
    await patchGame({ status: "awaiting_confirm", resume_status: "running", claims: [claim] });
    signInAs(cookieStore, cast.B);
    expect(await leave()).toEqual({ ok: true, data: null });
    expect((await players().doc(cast.B.uid).get()).data()?.ticket_ids).toEqual(["red_a"]);
    const game = await gameDoc();
    expect(game).toMatchObject({ status: "awaiting_confirm" });
    expect(game?.claims).toHaveLength(1);
    expect((await roomDoc())?.member_count).toBe(2);
    expect(await leave()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("AC-34b: host leaves → game cancelled, room closed host_left, everyone released, presence of the room removed", async () => {
    await patchGame({ status: "running", next_call_at: ts(NOW) });
    signInAs(cookieStore, cast.H);
    expect(await leave()).toEqual({ ok: true, data: null });
    expect(await gameDoc()).toMatchObject({ status: "cancelled", result: "cancelled" });
    const room = await roomDoc();
    expect(room).toMatchObject({ status: "closed", close_reason: "host_left", member_count: 0 });
    expect(millis(room?.closed_at)).toBe(NOW.getTime());
    expect(room?.last_event).toMatchObject({ type: "room_closed", text: "Host đã đóng phòng", actor_uid: cast.H.uid });
    for (const u of [cast.H, cast.B, cast.C]) expect((await userDoc(u.uid))?.current_room_id).toBeNull();
    expect(await exists(`presence/${ROOM}`)).toBe(false);
    expect(await exists(`presence_access/${ROOM}`)).toBe(false);
    expect((await players().doc(cast.B.uid).get()).exists).toBe(true);
  });

  it("AC-34b: host leaves a finished game → game stays finished", async () => {
    await patchGame({ status: "finished", result: "no_winner" });
    signInAs(cookieStore, cast.H);
    await leave();
    expect(await gameDoc()).toMatchObject({ status: "finished", result: "no_winner" });
    expect(await roomDoc()).toMatchObject({ status: "closed", close_reason: "host_left" });
  });

  it("room already past expires_at → lazily closed, caller gets NOT_ROOM_MEMBER", async () => {
    await db.doc(`rooms/${ROOM}`).update({ expires_at: ts(new Date(NOW.getTime() - 1000)) });
    signInAs(cookieStore, cast.B);
    expect(await leave()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    expect(await roomDoc()).toMatchObject({ status: "closed", close_reason: "expired" });
  });

  it("running room past expires_at: player leave also marks the room closing", async () => {
    await patchGame({ status: "running", next_call_at: ts(NOW) });
    await db.doc(`rooms/${ROOM}`).update({ expires_at: ts(new Date(NOW.getTime() - 1000)) });
    signInAs(cookieStore, cast.B);
    expect(await leave()).toEqual({ ok: true, data: null });
    expect(await roomDoc()).toMatchObject({ status: "closing", member_count: 2 });
  });
});

void GAME;
