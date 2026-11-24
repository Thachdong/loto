import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rtdb } from "@/core/db/firestore";
import { resetClock, setClock } from "@/core/server/clock";
import { createClaimAction } from "@/features/game/server/actions/create-claim.action";
import { kickPlayerAction } from "@/features/room/server/actions/kick-player.action";
import { reclaimPlayerTicketsAction } from "@/features/ticket/server/actions/reclaim-player-tickets.action";
import { createCookieStore } from "../auth/google-token";
import { GAME, NOW, patchGame, patchRoom, ROOM, roomDoc, ts, userDoc } from "../game/game-fixtures";
import { createCast, players, resetAll, signInAs, writePlayer, writePresence, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;
const kick = (uid: string) => kickPlayerAction({ roomId: ROOM, uid });
const exists = async (path: string) => (await rtdb().ref(path).get()).exists();

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
  await writePlayer(cast.C.uid, "Cúc C", ["blue_a"]);
  await rtdb().ref(`presence_access/${ROOM}`).set({ [cast.H.uid]: true, [cast.B.uid]: true, [cast.C.uid]: true });
  for (const u of [cast.H, cast.B, cast.C]) await writePresence(u.uid, true);
});

afterEach(() => resetClock());

describe("kickPlayerAction", () => {
  it("no session → UNAUTHENTICATED; invalid input → VALIDATION_FAILED; outside room → NOT_ROOM_MEMBER", async () => {
    expect(await kick(cast.B.uid)).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.H);
    expect(await kickPlayerAction({ roomId: ROOM, uid: "" })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    signInAs(cookieStore, cast.X);
    expect(await kick(cast.B.uid)).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("AC-3: waiting → blocked, current_room_id null, player deleted, member_count − 1, member_kicked, RTDB removed", async () => {
    signInAs(cookieStore, cast.H);
    expect(await kick(cast.B.uid)).toEqual({ ok: true, data: { uid: cast.B.uid, ticketsFreedNow: true, gameStatus: "waiting" } });
    const room = await roomDoc();
    expect(room?.blocked_uids).toEqual([cast.B.uid]);
    expect(room?.member_count).toBe(2);
    expect(room?.last_event).toMatchObject({ type: "member_kicked", text: "Bình B", actor_uid: cast.H.uid, target_uid: cast.B.uid });
    expect((await userDoc(cast.B.uid))?.current_room_id).toBeNull();
    expect((await players().doc(cast.B.uid).get()).exists).toBe(false);
    expect((await players().doc(cast.C.uid).get()).exists).toBe(true);
    expect(await exists(`presence/${ROOM}/${cast.B.uid}`)).toBe(false);
    expect(await exists(`presence_access/${ROOM}/${cast.B.uid}`)).toBe(false);
    expect(await exists(`presence/${ROOM}/${cast.C.uid}`)).toBe(true);
  });

  it("AC-4: running → player doc kept, ticketsFreedNow false; kicked player's KINH → NOT_ROOM_MEMBER", async () => {
    await patchRoom({ called_numbers: [1, 2, 3] });
    await patchGame({ status: "running", player_count: 2, started_at: ts(NOW), next_call_at: ts(NOW) });
    signInAs(cookieStore, cast.H);
    expect(await kick(cast.B.uid)).toEqual({ ok: true, data: { uid: cast.B.uid, ticketsFreedNow: false, gameStatus: "running" } });
    expect((await players().doc(cast.B.uid).get()).data()?.ticket_ids).toEqual(["red_a"]);
    expect((await roomDoc())?.blocked_uids).toEqual([cast.B.uid]);
    signInAs(cookieStore, cast.B);
    const res = await createClaimAction({ roomId: ROOM, gameId: GAME, ticketId: "red_a" });
    expect(res.ok).toBe(false);
  });

  it("AC-7: self → CANNOT_TARGET_SELF; no player doc or already left → PLAYER_NOT_FOUND; nothing written", async () => {
    signInAs(cookieStore, cast.H);
    expect(await kick(cast.H.uid)).toMatchObject({ ok: false, error: { code: "CANNOT_TARGET_SELF" } });
    await players().doc(cast.C.uid).delete();
    expect(await kick(cast.C.uid)).toMatchObject({ ok: false, error: { code: "PLAYER_NOT_FOUND" } });
    expect(await kick(cast.X.uid)).toMatchObject({ ok: false, error: { code: "PLAYER_NOT_FOUND" } });
    const room = await roomDoc();
    expect(room?.blocked_uids).toEqual([]);
    expect(room?.member_count).toBe(3);
  });

  it("AC-8: non-host → NOT_ROOM_HOST for kick and reclaim, data unchanged", async () => {
    signInAs(cookieStore, cast.B);
    expect(await kick(cast.C.uid)).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    expect(await reclaimPlayerTicketsAction({ roomId: ROOM, uid: cast.C.uid })).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    expect((await players().doc(cast.C.uid).get()).exists).toBe(true);
    expect((await userDoc(cast.C.uid))?.current_room_id).toBe(ROOM);
  });

  it("kicking twice → second call PLAYER_NOT_FOUND", async () => {
    signInAs(cookieStore, cast.H);
    expect((await kick(cast.C.uid)).ok).toBe(true);
    expect(await kick(cast.C.uid)).toMatchObject({ ok: false, error: { code: "PLAYER_NOT_FOUND" } });
    expect((await roomDoc())?.member_count).toBe(2);
  });
});
