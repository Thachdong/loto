import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { confirmGameAction } from "@/features/game/server/actions/confirm-game.action";
import { rejectClaimsAction } from "@/features/game/server/actions/reject-claims.action";
import { createCookieStore } from "../auth/google-token";
import { db, millis } from "../invite/invite-fixtures";
import { createCast, resetAll, signInAs, writePlayer, writePresence, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";
import { GAME, gameDoc, NOW, patchGame, patchRoom, ROOM, roomDoc, SEC, ts, userDoc } from "./game-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;
const confirm = (gameId = GAME) => confirmGameAction({ roomId: ROOM, gameId });
const reject = (gameId = GAME) => rejectClaimsAction({ roomId: ROOM, gameId });

const claimDoc = (uid: string, name: string, ticketId: string, result: "win" | "miss", row: number | null, ms = 0) => ({
  uid,
  display_name: name,
  ticket_id: ticketId,
  color: ticketId.split("_")[0],
  result,
  row,
  claimed_at: ts(new Date(NOW.getTime() - 10 * SEC + ms)),
});

async function awaiting(claims: unknown[], resume: "running" | "paused" = "running") {
  await patchGame({
    status: "awaiting_confirm",
    resume_status: resume,
    claims,
    player_count: 2,
    started_at: ts(new Date(NOW.getTime() - 60 * SEC)),
    next_call_at: null,
    pause_reason: null,
  });
}

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
  await writePlayer(cast.C.uid, "Cúc C", ["blue_a", "blue_b"]);
  await patchRoom({ called_numbers: [1, 2, 3, 4, 5] });
  for (const u of [cast.H, cast.B, cast.C]) await writePresence(u.uid, true);
});

afterEach(() => resetClock());

describe("confirmGameAction", () => {
  const winC = () => claimDoc(cast.C.uid, "Cúc C", "blue_a", "win", 0);
  const missB = () => claimDoc(cast.B.uid, "Bình B", "red_a", "miss", null, 1000);

  it("AC-6: errors — no session, outsider, not host, stale, not awaiting, no winning claim", async () => {
    await awaiting([missB()]);
    expect(await confirm()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.X);
    expect(await confirm()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    signInAs(cookieStore, cast.B);
    expect(await confirm()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    signInAs(cookieStore, cast.H);
    expect(await confirm("g_old")).toMatchObject({ ok: false, error: { code: "GAME_STALE" } });
    expect(await confirm()).toMatchObject({ ok: false, error: { code: "NO_WINNING_CLAIM" } });
    await patchGame({ status: "running" });
    expect(await confirm()).toMatchObject({ ok: false, error: { code: "GAME_NOT_AWAITING_CONFIRM" } });
    expect(await gameDoc()).toMatchObject({ status: "running" });
  });

  it("AC-5: finishes the game with win claims as winners, opens next game, copies online players only", async () => {
    await awaiting([winC(), missB()]);
    await writePresence(cast.B.uid, false); // B offline → vé trả về (BR-29)
    signInAs(cookieStore, cast.H);
    const res = await confirm();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatchObject({
      finishedGameId: GAME,
      result: "won",
      roomStatus: "active",
      winners: [{ uid: cast.C.uid, displayName: "Cúc C", ticketId: "blue_a", color: "blue", row: 0 }],
    });
    const g1 = await gameDoc();
    expect(g1).toMatchObject({ status: "finished", result: "won", confirmed_by: cast.H.uid, resume_status: null });
    expect(g1?.winners).toHaveLength(1);
    expect(g1?.winners[0]).toMatchObject({ uid: cast.C.uid, ticket_id: "blue_a", row: 0 });
    expect(millis(g1?.ended_at)).toBe(NOW.getTime());

    const room = await roomDoc();
    expect(room?.current_game_id).toBe(res.data.nextGameId);
    expect(room).toMatchObject({ status: "active", game_count: 2 });
    expect(room?.last_event).toMatchObject({ type: "game_finished", text: "Ván 1 kết thúc · 1 người thắng", actor_uid: cast.H.uid });
    const g2 = (await db.doc(`rooms/${ROOM}/games/${res.data.nextGameId}`).get()).data();
    expect(g2).toMatchObject({ status: "waiting", seq_no: 2, claims: [] });
    const copied = (await db.collection(`rooms/${ROOM}/games/${res.data.nextGameId}/players`).get()).docs;
    expect(copied.map((d) => d.id)).toEqual([cast.C.uid]);
    expect(copied[0].data().ticket_ids).toEqual(["blue_a", "blue_b"]);
  });

  it("AC-8: host who claimed a winning ticket confirms their own win", async () => {
    await writePlayer(cast.H.uid, "Hà H", ["green_a"]);
    await awaiting([claimDoc(cast.H.uid, "Hà H", "green_a", "win", 2)]);
    signInAs(cookieStore, cast.H);
    expect(await confirm()).toMatchObject({ ok: true, data: { result: "won", winners: [{ uid: cast.H.uid, row: 2 }] } });
    expect(await gameDoc()).toMatchObject({ status: "finished", confirmed_by: cast.H.uid });
  });

  it("AC-7: room closing → game finished, room closed (expired), no next game, members released", async () => {
    await awaiting([winC()]);
    await patchRoom({ status: "closing" });
    signInAs(cookieStore, cast.H);
    expect(await confirm()).toMatchObject({ ok: true, data: { nextGameId: null, roomStatus: "closed", result: "won" } });
    expect(await gameDoc()).toMatchObject({ status: "finished", result: "won", confirmed_by: cast.H.uid });
    expect(await roomDoc()).toMatchObject({ status: "closed", close_reason: "expired", current_game_id: GAME });
    expect((await userDoc(cast.B.uid))?.current_room_id).toBeNull();
  });

  it("AC-7: room past expires_at while awaiting → lazy expiry finishes it, GAME_NOT_AWAITING_CONFIRM", async () => {
    await awaiting([winC()]);
    await patchRoom({ expires_at: ts(new Date(NOW.getTime() - SEC)) });
    signInAs(cookieStore, cast.H);
    expect(await confirm()).toMatchObject({ ok: false, error: { code: "GAME_NOT_AWAITING_CONFIRM" } });
    expect(await gameDoc()).toMatchObject({ status: "finished", result: "won" });
    expect(await roomDoc()).toMatchObject({ status: "closed" });
  });
});

describe("rejectClaimsAction", () => {
  const missB = () => claimDoc(cast.B.uid, "Bình B", "red_a", "miss", null);
  const missC = () => claimDoc(cast.C.uid, "Cúc C", "blue_b", "miss", null, 1000);

  it("AC-10: errors — not host, stale, not awaiting, has a winning claim (nothing changes)", async () => {
    await awaiting([missB(), claimDoc(cast.C.uid, "Cúc C", "blue_a", "win", 0, 1000)]);
    signInAs(cookieStore, cast.B);
    expect(await reject()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    signInAs(cookieStore, cast.H);
    expect(await reject("g_old")).toMatchObject({ ok: false, error: { code: "GAME_STALE" } });
    expect(await reject()).toMatchObject({ ok: false, error: { code: "CLAIM_HAS_WIN" } });
    expect((await gameDoc())?.claims).toHaveLength(2);
    await patchGame({ status: "running" });
    expect(await reject()).toMatchObject({ ok: false, error: { code: "GAME_NOT_AWAITING_CONFIRM" } });
  });

  it("AC-9: all misses → claims cleared, back to running with next_call_at = now + interval", async () => {
    await awaiting([missB(), missC()]);
    signInAs(cookieStore, cast.H);
    const res = await reject();
    expect(res).toMatchObject({ ok: true, data: { gameId: GAME, status: "running" } });
    const g = await gameDoc();
    expect(g).toMatchObject({ status: "running", claims: [], resume_status: null, pause_reason: null });
    const interval = (await roomDoc())?.draw_interval_sec as number;
    expect(millis(g?.next_call_at)).toBe(NOW.getTime() + interval * SEC);
    expect((await roomDoc())?.last_event).toMatchObject({ type: "claims_rejected", text: "Bình B, Cúc C kinh hụt", actor_uid: cast.H.uid });
  });

  it("AC-9: resume_status paused → back to paused (pause_reason host, no next_call_at)", async () => {
    await awaiting([missB()], "paused");
    signInAs(cookieStore, cast.H);
    expect(await reject()).toMatchObject({ ok: true, data: { status: "paused", nextCallAt: null } });
    expect(await gameDoc()).toMatchObject({ status: "paused", pause_reason: "host", next_call_at: null, claims: [] });
  });
});
