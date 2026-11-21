import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { reclaimPlayerTicketsAction } from "@/features/ticket/server/actions/reclaim-player-tickets.action";
import { createCookieStore } from "../auth/google-token";
import { data, millis, NOW } from "../invite/invite-fixtures";
import {
  createCast,
  playerIds,
  players,
  resetAll,
  ROOM,
  signInAs,
  writePlayer,
  writePresence,
  writeTicketRoom,
  type Cast,
} from "./ticket-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;
const reclaim = (uid: string) => reclaimPlayerTicketsAction({ roomId: ROOM, uid });

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
  await writePlayer(cast.C.uid, "Cúc C", ["blue_b", "teal_a"]);
});

afterEach(() => resetClock());

describe("reclaimPlayerTicketsAction", () => {
  it("no session → UNAUTHENTICATED", async () => {
    expect(await reclaim(cast.C.uid)).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("AC-15: offline target (presence node online=false) → player deleted, last_event tickets_reclaimed, still a member", async () => {
    await writePresence(cast.C.uid, false);
    signInAs(cookieStore, cast.H);
    expect(await reclaim(cast.C.uid)).toEqual({
      ok: true,
      data: { uid: cast.C.uid, releasedTicketIds: ["blue_b", "teal_a"] },
    });
    expect((await players().doc(cast.C.uid).get()).exists).toBe(false);
    expect(await playerIds(cast.B.uid)).toEqual(["red_a"]);
    const room = await data(`rooms/${ROOM}`);
    expect(room?.last_event).toMatchObject({
      type: "tickets_reclaimed",
      text: "Cúc C",
      actor_uid: cast.H.uid,
      target_uid: cast.C.uid,
    });
    expect(millis(room?.last_event.at)).toBe(NOW.getTime());
    expect((await data(`users/${cast.C.uid}`))?.current_room_id).toBe(ROOM);
  });

  it("target without any presence node counts as offline", async () => {
    signInAs(cookieStore, cast.H);
    expect(await reclaim(cast.C.uid)).toMatchObject({ ok: true });
  });

  it("AC-19: online target → TARGET_ONLINE, tickets unchanged", async () => {
    await writePresence(cast.B.uid, true);
    signInAs(cookieStore, cast.H);
    expect(await reclaim(cast.B.uid)).toMatchObject({ ok: false, error: { code: "TARGET_ONLINE" } });
    expect(await playerIds(cast.B.uid)).toEqual(["red_a"]);
    expect((await data(`rooms/${ROOM}`))?.last_event).toBeNull();
  });

  it("AC-19: target = self → CANNOT_TARGET_SELF", async () => {
    await writePlayer(cast.H.uid, "Host H", ["pink_a"]);
    signInAs(cookieStore, cast.H);
    expect(await reclaim(cast.H.uid)).toMatchObject({ ok: false, error: { code: "CANNOT_TARGET_SELF" } });
    expect(await playerIds(cast.H.uid)).toEqual(["pink_a"]);
  });

  it("target without player doc → PLAYER_NOT_FOUND", async () => {
    signInAs(cookieStore, cast.H);
    expect(await reclaim("nobody")).toMatchObject({ ok: false, error: { code: "PLAYER_NOT_FOUND" } });
  });

  it("AC-17: non-host → NOT_ROOM_HOST, data unchanged", async () => {
    signInAs(cookieStore, cast.B);
    expect(await reclaim(cast.C.uid)).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    expect(await playerIds(cast.C.uid)).toEqual(["blue_b", "teal_a"]);
  });

  it("AC-18: game running → GAME_NOT_WAITING, data unchanged", async () => {
    await writeTicketRoom(cast.H, { gameStatus: "running" });
    signInAs(cookieStore, cast.H);
    expect(await reclaim(cast.C.uid)).toMatchObject({ ok: false, error: { code: "GAME_NOT_WAITING" } });
    expect(await playerIds(cast.C.uid)).toEqual(["blue_b", "teal_a"]);
  });

  it("AC-20: non-member → NOT_ROOM_MEMBER", async () => {
    signInAs(cookieStore, cast.X);
    expect(await reclaim(cast.C.uid)).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });
});
