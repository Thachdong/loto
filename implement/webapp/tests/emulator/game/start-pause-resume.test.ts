import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rtdb } from "@/core/db/firestore";
import { resetClock, setClock } from "@/core/server/clock";
import { pauseGameAction } from "@/features/game/server/actions/pause-game.action";
import { resumeGameAction } from "@/features/game/server/actions/resume-game.action";
import { startGameAction } from "@/features/game/server/actions/start-game.action";
import { startGame } from "@/features/game/server/services/game-lifecycle.service";
import { createCookieStore } from "../auth/google-token";
import { db, HOUR, millis } from "../invite/invite-fixtures";
import { createCast, players, resetAll, signInAs, writePlayer, writePresence, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";
import manifest from "../../../public/audio/v1/manifest.json";
import { RESUME_REVEAL_MS } from "@/features/game/shared/domain/call-timing";
import { GAME, gameDoc, NOW, patchGame, patchRoom, ROOM, roomDoc, SEC, ts, userDoc } from "./game-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
});

afterEach(() => resetClock());

const start = (gameId = GAME, roomId = ROOM) => startGameAction({ roomId, gameId });
const pause = (gameId = GAME) => pauseGameAction({ roomId: ROOM, gameId });
const resume = (gameId = GAME) => resumeGameAction({ roomId: ROOM, gameId });

async function twoHolders() {
  await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
  await writePlayer(cast.C.uid, "Cúc C", ["blue_a", "blue_b"]);
}

describe("startGameAction", () => {
  it("no session → UNAUTHENTICATED", async () => {
    expect(await start()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("not in the room → NOT_ROOM_MEMBER", async () => {
    signInAs(cookieStore, cast.X);
    expect(await start()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("AC-11: not the host → NOT_ROOM_HOST, nothing changes", async () => {
    await twoHolders();
    signInAs(cookieStore, cast.B);
    expect(await start()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    expect((await gameDoc())?.status).toBe("waiting");
  });

  it("other gameId → GAME_STALE", async () => {
    await twoHolders();
    signInAs(cookieStore, cast.H);
    expect(await start("g_old")).toMatchObject({ ok: false, error: { code: "GAME_STALE" } });
  });

  it("game already running → GAME_NOT_WAITING", async () => {
    await twoHolders();
    await patchGame({ status: "running" });
    signInAs(cookieStore, cast.H);
    expect(await start()).toMatchObject({ ok: false, error: { code: "GAME_NOT_WAITING" } });
  });

  it("AC-09: nobody holds a ticket → NO_TICKETS_HELD and nothing is written (empty player kept)", async () => {
    await writePlayer(cast.B.uid, "Bình B", []);
    signInAs(cookieStore, cast.H);
    expect(await start()).toMatchObject({ ok: false, error: { code: "NO_TICKETS_HELD" } });
    expect((await gameDoc())?.status).toBe("waiting");
    expect((await players().doc(cast.B.uid).get()).exists).toBe(true);
    expect((await roomDoc())?.called_numbers).toEqual([]);
    expect((await roomDoc())?.last_event).toBeNull();
  });

  it("AC-09: no players at all → NO_TICKETS_HELD", async () => {
    signInAs(cookieStore, cast.H);
    expect(await start()).toMatchObject({ ok: false, error: { code: "NO_TICKETS_HELD" } });
  });

  it("AC-01: starts the game, first number becomes pending (stream calls it now), shown when its clip nearly ends", async () => {
    await twoHolders();
    signInAs(cookieStore, cast.H);
    const res = await start();
    const room = await roomDoc();
    const first = room?.pending_call;
    expect(first?.number).toBeGreaterThanOrEqual(1);
    expect(first?.number).toBeLessThanOrEqual(90);
    const clip = `${String(first?.number).padStart(2, "0")}.mp3`;
    const due = NOW.getTime() + (manifest.durations as Record<string, number>)[clip]!;
    expect(first).toMatchObject({ clip, game_id: GAME });

    expect(res).toEqual({
      ok: true,
      data: {
        gameId: GAME,
        seqNo: 1,
        status: "running",
        playerCount: 2,
        startedAt: NOW.toISOString(),
        nextCallAt: new Date(due).toISOString(),
      },
    });
    const game = await gameDoc();
    expect(game).toMatchObject({ status: "running", player_count: 2, pause_reason: null });
    expect(millis(game?.started_at)).toBe(NOW.getTime());
    expect(millis(game?.next_call_at)).toBe(due);
    expect(room?.called_numbers).toEqual([]);
    expect(room?.last_event).toMatchObject({ type: "game_started", text: "Ván 1 bắt đầu", actor_uid: cast.H.uid });
    expect(millis(room?.last_event?.at)).toBe(NOW.getTime());
  });

  it("AC-01: first number comes from the injected random (uniform over 1–90)", async () => {
    await twoHolders();
    await patchRoom({ called_numbers: [7, 8] });
    const state = await startGame(cast.H.uid, { roomId: ROOM, gameId: GAME }, { randomInt: (max) => max - 1 });
    expect(state.nextCallAt).toBe(new Date(NOW.getTime() + (manifest.durations as Record<string, number>)["90.mp3"]!).toISOString());
    expect(await roomDoc()).toMatchObject({ called_numbers: [], pending_call: { number: 90, clip: "90.mp3" } });
  });

  it("AC-02: deletes players with empty tickets or who left the room; refreshes name/photo", async () => {
    await writePlayer(cast.B.uid, "Tên cũ", ["red_a"]);
    await writePlayer(cast.C.uid, "Cúc C", []);
    await writePlayer(cast.X.uid, "Xuân X", ["green_a"]); // X không còn ở phòng
    await writePlayer(cast.H.uid, "Host H", ["pink_a"]);
    await db.doc(`users/${cast.B.uid}`).update({ display_name: "Bình mới", photo_url: "https://x/y.png" });
    signInAs(cookieStore, cast.H);

    expect(await start()).toMatchObject({ ok: true, data: { playerCount: 2 } });
    expect((await players().doc(cast.C.uid).get()).exists).toBe(false);
    expect((await players().doc(cast.X.uid).get()).exists).toBe(false);
    expect((await players().doc(cast.B.uid).get()).data()).toMatchObject({
      display_name: "Bình mới",
      photo_url: "https://x/y.png",
      ticket_ids: ["red_a"],
    });
  });

  it("BR-14 (Q-059): only one ticket holder (host or player, even with 2 tickets) → NO_TICKETS_HELD, nothing written", async () => {
    await writePlayer(cast.C.uid, "Cúc C", ["blue_a", "blue_b"]);
    await writePlayer(cast.B.uid, "Bình B", []);
    signInAs(cookieStore, cast.H);
    expect(await start()).toMatchObject({ ok: false, error: { code: "NO_TICKETS_HELD", message: "Cần ít nhất 2 người lấy vé để bắt đầu" } });
    expect((await players().doc(cast.B.uid).get()).exists).toBe(true);
    expect(await gameDoc()).toMatchObject({ status: "waiting" });
  });

  it("BR-14: host with a ticket + one player is enough", async () => {
    await writePlayer(cast.H.uid, "Host H", ["pink_a"]);
    await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
    signInAs(cookieStore, cast.H);
    expect(await start()).toMatchObject({ ok: true, data: { status: "running", playerCount: 2 } });
  });

  it("AC-02: only players who left → NO_TICKETS_HELD, nothing deleted", async () => {
    await writePlayer(cast.X.uid, "Xuân X", ["green_a"]);
    signInAs(cookieStore, cast.H);
    expect(await start()).toMatchObject({ ok: false, error: { code: "NO_TICKETS_HELD" } });
    expect((await players().doc(cast.X.uid).get()).exists).toBe(true);
  });

  it("AC-10: past expires_at → ROOM_CLOSING, the expired part is committed (game cancelled, room closed)", async () => {
    await resetAll();
    cast = await createCast();
    await writeTicketRoom(cast.H, { expiresAt: new Date(NOW.getTime() - HOUR) });
    await twoHolders();
    await rtdb().ref(`presence_access/${ROOM}`).set({ [cast.H.uid]: true });
    await writePresence(cast.H.uid, true);
    signInAs(cookieStore, cast.H);

    expect(await start()).toMatchObject({ ok: false, error: { code: "ROOM_CLOSING" } });
    expect(await roomDoc()).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
    expect(await gameDoc()).toMatchObject({ status: "cancelled", result: "cancelled" });
    expect((await userDoc(cast.H.uid))?.current_room_id).toBeNull();
    expect((await userDoc(cast.B.uid))?.current_room_id).toBeNull();
    expect((await rtdb().ref(`presence/${ROOM}`).get()).exists()).toBe(false);
    expect((await rtdb().ref(`presence_access/${ROOM}`).get()).exists()).toBe(false);
  });

  it("room already closing → ROOM_CLOSING, nothing written", async () => {
    await twoHolders();
    await patchRoom({ status: "closing" });
    signInAs(cookieStore, cast.H);
    expect(await start()).toMatchObject({ ok: false, error: { code: "ROOM_CLOSING" } });
    expect((await gameDoc())?.status).toBe("waiting");
    expect((await roomDoc())?.status).toBe("closing");
  });
});

describe("pauseGameAction", () => {
  beforeEach(async () => {
    await twoHolders();
    await patchGame({ status: "running", player_count: 2, next_call_at: ts(new Date(NOW.getTime() + 3 * SEC)), started_at: ts(NOW) });
  });

  it("no session → UNAUTHENTICATED; outsider → NOT_ROOM_MEMBER", async () => {
    expect(await pause()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.X);
    expect(await pause()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("AC-11: not host → NOT_ROOM_HOST", async () => {
    signInAs(cookieStore, cast.B);
    expect(await pause()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    expect((await gameDoc())?.status).toBe("running");
  });

  it("GAME_STALE; not running → GAME_NOT_RUNNING", async () => {
    signInAs(cookieStore, cast.H);
    expect(await pause("g_old")).toMatchObject({ ok: false, error: { code: "GAME_STALE" } });
    await patchGame({ status: "waiting" });
    expect(await pause()).toMatchObject({ ok: false, error: { code: "GAME_NOT_RUNNING" } });
    await patchGame({ status: "awaiting_confirm" });
    expect(await pause()).toMatchObject({ ok: false, error: { code: "GAME_NOT_RUNNING" } });
  });

  it("AC-12: running → paused, pause_reason host, next_call_at null, last_event game_paused", async () => {
    signInAs(cookieStore, cast.H);
    const res = await pause();
    expect(res).toMatchObject({ ok: true, data: { gameId: GAME, status: "paused", nextCallAt: null, playerCount: 2 } });
    expect(await gameDoc()).toMatchObject({ status: "paused", pause_reason: "host", next_call_at: null });
    expect((await roomDoc())?.last_event).toMatchObject({ type: "game_paused", text: "Ván đã tạm dừng", actor_uid: cast.H.uid });
  });

  it("AC-37: room past expires_at while running → pause still works, room becomes closing", async () => {
    await patchRoom({ expires_at: ts(new Date(NOW.getTime() - 1000)) });
    signInAs(cookieStore, cast.H);
    expect(await pause()).toMatchObject({ ok: true, data: { status: "paused" } });
    expect((await roomDoc())?.status).toBe("closing");
    expect((await gameDoc())?.status).toBe("paused");
  });
});

describe("resumeGameAction", () => {
  beforeEach(async () => {
    await twoHolders();
    await patchGame({ status: "paused", pause_reason: "host", player_count: 2, started_at: ts(NOW) });
  });

  it("no session → UNAUTHENTICATED; not host → NOT_ROOM_HOST", async () => {
    expect(await resume()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.C);
    expect(await resume()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
  });

  it("GAME_STALE; not paused → GAME_NOT_PAUSED", async () => {
    signInAs(cookieStore, cast.H);
    expect(await resume("g_old")).toMatchObject({ ok: false, error: { code: "GAME_STALE" } });
    await patchGame({ status: "running" });
    expect(await resume()).toMatchObject({ ok: false, error: { code: "GAME_NOT_PAUSED" } });
  });

  it("AC-13: paused → running, pause_reason null, pending number shown shortly (RESUME_REVEAL_MS), last_event game_resumed", async () => {
    signInAs(cookieStore, cast.H);
    const next = new Date(NOW.getTime() + RESUME_REVEAL_MS).toISOString();
    expect(await resume()).toMatchObject({ ok: true, data: { status: "running", nextCallAt: next } });
    const game = await gameDoc();
    expect(game).toMatchObject({ status: "running", pause_reason: null });
    expect(millis(game?.next_call_at)).toBe(NOW.getTime() + RESUME_REVEAL_MS);
    expect((await roomDoc())?.last_event).toMatchObject({ type: "game_resumed", text: "Ván tiếp tục" });
  });

  it("AC-37: room already closing → resume still allowed, room stays closing", async () => {
    await patchRoom({ status: "closing" });
    signInAs(cookieStore, cast.H);
    expect(await resume()).toMatchObject({ ok: true, data: { status: "running" } });
    expect((await roomDoc())?.status).toBe("closing");
    expect((await gameDoc())?.status).toBe("running");
  });
});
