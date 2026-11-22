import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rtdb } from "@/core/db/firestore";
import { resetClock, setClock } from "@/core/server/clock";
import { drawNumberAction } from "@/features/game/server/actions/draw-number.action";
import { createCookieStore } from "../auth/google-token";
import { db, millis } from "../invite/invite-fixtures";
import { createCast, players, resetAll, signInAs, writePlayer, writePresence, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";
import { GAME, gameDoc, NOW, patchGame, patchRoom, ROOM, roomDoc, SEC, ts, userDoc } from "./game-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;
const at = (ms: number) => ts(new Date(NOW.getTime() + ms));
const draw = (seq: number, gameId = GAME) => drawNumberAction({ roomId: ROOM, gameId, seq });

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
  await writePlayer(cast.C.uid, "Cúc C", ["blue_a", "blue_b"]);
  await patchRoom({ called_numbers: [5, 6, 7], draw_interval_sec: 3 });
  await patchGame({ status: "running", player_count: 2, started_at: ts(NOW), next_call_at: at(0) });
});

afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("drawNumberAction", () => {
  it("no session → UNAUTHENTICATED; invalid seq → VALIDATION_FAILED", async () => {
    expect(await draw(3)).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.H);
    expect(await draw(90)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });

  it("AC-06: outside the room → NOT_ROOM_MEMBER", async () => {
    signInAs(cookieStore, cast.X);
    expect(await draw(3)).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("AC-06: member without a player doc (spectator) → NOT_ROOM_MEMBER", async () => {
    await players().doc(cast.C.uid).delete();
    signInAs(cookieStore, cast.C);
    expect(await draw(3)).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    expect((await roomDoc())?.called_numbers).toHaveLength(3);
  });

  it("AC-06: player who left the room (player doc kept) → NOT_ROOM_MEMBER", async () => {
    await db.doc(`users/${cast.B.uid}`).update({ current_room_id: null });
    signInAs(cookieStore, cast.B);
    expect(await draw(3)).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("GAME_STALE for another gameId; not running → GAME_NOT_RUNNING", async () => {
    signInAs(cookieStore, cast.H);
    expect(await draw(3, "g_old")).toMatchObject({ ok: false, error: { code: "GAME_STALE" } });
    for (const status of ["waiting", "paused", "awaiting_confirm", "finished"]) {
      await patchGame({ status });
      expect(await draw(3)).toMatchObject({ ok: false, error: { code: "GAME_NOT_RUNNING" } });
    }
  });

  it("host draws on time: appends a number, next_call_at = now + N, no last_event change", async () => {
    signInAs(cookieStore, cast.H);
    const res = await draw(3);
    expect(res).toMatchObject({ ok: true, data: { drawn: true, seq: 4, gameStatus: "running", nextCallAt: new Date(NOW.getTime() + 3 * SEC).toISOString() } });
    const room = await roomDoc();
    expect(room?.called_numbers).toHaveLength(4);
    expect(new Set(room?.called_numbers).size).toBe(4);
    expect(res.ok && res.data.number).toBe(room?.called_numbers[3]);
    expect(millis((await gameDoc())?.next_call_at)).toBe(NOW.getTime() + 3 * SEC);
  });

  it("a backup player (has a player doc) can draw", async () => {
    signInAs(cookieStore, cast.B);
    expect(await draw(3)).toMatchObject({ ok: true, data: { drawn: true, seq: 4 } });
  });

  it("AC-04: too early → DRAW_TOO_EARLY with nextCallAt detail, boundary −300ms", async () => {
    await patchGame({ next_call_at: at(3 * SEC) });
    signInAs(cookieStore, cast.B);
    const early = await draw(3);
    expect(early).toMatchObject({
      ok: false,
      error: { code: "DRAW_TOO_EARLY", details: [{ code: "nextCallAt", nextCallAt: new Date(NOW.getTime() + 3 * SEC).toISOString() }] },
    });
    expect((await roomDoc())?.called_numbers).toHaveLength(3);

    await patchGame({ next_call_at: at(301) });
    expect(await draw(3)).toMatchObject({ ok: false, error: { code: "DRAW_TOO_EARLY" } });
    await patchGame({ next_call_at: at(300) });
    expect(await draw(3)).toMatchObject({ ok: true, data: { drawn: true } });
  });

  it("AC-05: stale seq → drawn:false, nothing written", async () => {
    signInAs(cookieStore, cast.H);
    const res = await draw(2);
    expect(res).toMatchObject({ ok: true, data: { drawn: false, seq: 3, number: 7, gameStatus: "running" } });
    expect((await roomDoc())?.called_numbers).toEqual([5, 6, 7]);
  });

  it("AC-05: 3 parallel calls with the same seq → exactly one drawn:true", async () => {
    const results = await Promise.all(
      [cast.H, cast.B, cast.C].map(async (user) => {
        const { drawNumber } = await import("@/features/game/server/services/draw.service");
        return drawNumber(user.uid, { roomId: ROOM, gameId: GAME, seq: 3 });
      }),
    );
    expect(results.filter((r) => r.drawn)).toHaveLength(1);
    expect(results.filter((r) => !r.drawn)).toHaveLength(2);
    expect((await roomDoc())?.called_numbers).toHaveLength(4);
  });

  it("lazy expiry: running game past expires_at keeps drawing, room becomes closing", async () => {
    await patchRoom({ expires_at: at(-1000) });
    signInAs(cookieStore, cast.H);
    expect(await draw(3)).toMatchObject({ ok: true, data: { drawn: true, seq: 4 } });
    expect(await roomDoc()).toMatchObject({ status: "closing" });
    expect((await gameDoc())?.status).toBe("running");
  });

  it("logs a structured line {op, roomId, gameId, uid, role, seq, drawn, code}", async () => {
    const info = vi.mocked(console.info);
    signInAs(cookieStore, cast.B);
    await draw(3);
    const entry = JSON.parse(String(info.mock.calls.at(-1)?.[0]));
    expect(entry).toEqual({ op: "drawNumber", roomId: ROOM, gameId: GAME, uid: cast.B.uid, role: "backup", seq: 3, drawn: true, code: null });
  });
});

describe("drawNumber — the 90th number (rollover)", () => {
  const ninety = Array.from({ length: 89 }, (_, i) => i + 1);
  beforeEach(async () => {
    await patchRoom({ called_numbers: ninety });
    for (const u of [cast.H, cast.B, cast.C]) await writePresence(u.uid, true);
  });

  it("AC-25: finishes the game (no_winner), opens game 2 waiting and copies online players only", async () => {
    await writePresence(cast.C.uid, false); // C offline → AC-46
    signInAs(cookieStore, cast.H);
    const res = await draw(89);
    expect(res).toEqual({ ok: true, data: { drawn: true, number: 90, seq: 90, nextCallAt: null, gameStatus: "finished" } });

    const g1 = await gameDoc();
    expect(g1).toMatchObject({ status: "finished", result: "no_winner", winners: [], next_call_at: null });
    expect(millis(g1?.ended_at)).toBe(NOW.getTime());
    const room = await roomDoc();
    expect(room?.called_numbers).toHaveLength(90);
    expect(room).toMatchObject({ status: "active", game_count: 2 });
    expect(room?.last_event).toMatchObject({ type: "game_finished", text: "Ván 1 kết thúc" });
    expect(room?.current_game_id).not.toBe(GAME);

    const g2 = (await db.doc(`rooms/${ROOM}/games/${room?.current_game_id}`).get()).data();
    expect(g2).toMatchObject({ seq_no: 2, status: "waiting", claims: [], player_count: 0, result: null });
    const copied = (await db.collection(`rooms/${ROOM}/games/${room?.current_game_id}/players`).get()).docs;
    expect(copied.map((d) => d.id)).toEqual([cast.B.uid]);
    expect(copied[0].data()).toMatchObject({ display_name: "Bình B", ticket_ids: ["red_a"] });
    expect((await players().doc(cast.C.uid).get()).exists).toBe(true); // ván cũ giữ nguyên
  });

  it("AC-46: players who left the room or have no presence node are not copied", async () => {
    await db.doc(`users/${cast.B.uid}`).update({ current_room_id: null });
    await rtdb().ref(`presence/${ROOM}/${cast.C.uid}`).remove();
    signInAs(cookieStore, cast.H);
    await draw(89);
    const room = await roomDoc();
    expect((await db.collection(`rooms/${ROOM}/games/${room?.current_game_id}/players`).get()).size).toBe(0);
  });

  it("AC-26: room closing → game finished, room closed (expired), members released, presence removed", async () => {
    await patchRoom({ status: "closing" });
    await rtdb().ref(`presence_access/${ROOM}`).set({ [cast.H.uid]: true });
    signInAs(cookieStore, cast.H);
    expect(await draw(89)).toMatchObject({ ok: true, data: { drawn: true, gameStatus: "finished" } });

    expect(await gameDoc()).toMatchObject({ status: "finished", result: "no_winner" });
    const room = await roomDoc();
    expect(room).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0, current_game_id: GAME });
    expect(room?.called_numbers).toHaveLength(90);
    expect((await userDoc(cast.B.uid))?.current_room_id).toBeNull();
    expect((await userDoc(cast.H.uid))?.current_room_id).toBeNull();
    expect((await rtdb().ref(`presence/${ROOM}`).get()).exists()).toBe(false);
    expect((await rtdb().ref(`presence_access/${ROOM}`).get()).exists()).toBe(false);
    expect((await db.collection(`rooms/${ROOM}/games`).get()).size).toBe(1);
  });
});
