import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { drawNumberAction } from "@/features/game/server/actions/draw-number.action";
import { updateRoomAction } from "@/features/room/server/actions/update-room.action";
import { createCookieStore } from "../auth/google-token";
import { millis } from "../invite/invite-fixtures";
import { GAME, gameDoc, NOW, patchGame, patchRoom, ROOM, roomDoc, SEC, ts } from "../game/game-fixtures";
import { createCast, resetAll, signInAs, writePlayer, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;
const update = (drawIntervalSec: unknown) => updateRoomAction({ roomId: ROOM, drawIntervalSec } as never);

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
  await patchRoom({ draw_interval_sec: 5, called_numbers: [5, 6, 7] });
});

afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("updateRoomAction", () => {
  it("AC-6: host sets 8 while running → draw_interval_sec, interval_changed; pending next_call_at untouched; next draw uses 8s", async () => {
    const pendingAt = ts(new Date(NOW.getTime() + 2 * SEC));
    await patchGame({ status: "running", player_count: 1, started_at: ts(NOW), next_call_at: pendingAt });
    signInAs(cookieStore, cast.H);
    expect(await update(8)).toEqual({ ok: true, data: { roomId: ROOM, drawIntervalSec: 8 } });
    const room = await roomDoc();
    expect(room?.draw_interval_sec).toBe(8);
    expect(room?.last_event).toMatchObject({ type: "interval_changed", text: "Nhịp quay: 8 giây/số", actor_uid: cast.H.uid });
    expect(millis((await gameDoc())?.next_call_at)).toBe(NOW.getTime() + 2 * SEC);

    setClock(() => new Date(NOW.getTime() + 2 * SEC));
    expect(await drawNumberAction({ roomId: ROOM, gameId: GAME, seq: 3 })).toMatchObject({ ok: true, data: { drawn: true } });
    expect(millis((await gameDoc())?.next_call_at)).toBe(NOW.getTime() + 10 * SEC);
  });

  it("AC-7: 3 and 15 ok; 2 / 16 → DRAW_INTERVAL_INVALID; '8' → VALIDATION_FAILED", async () => {
    signInAs(cookieStore, cast.H);
    expect((await update(3)).ok).toBe(true);
    expect((await update(15)).ok).toBe(true);
    expect(await update(2)).toMatchObject({ ok: false, error: { code: "DRAW_INTERVAL_INVALID" } });
    expect(await update(16)).toMatchObject({ ok: false, error: { code: "DRAW_INTERVAL_INVALID" } });
    expect(await update("8")).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect((await roomDoc())?.draw_interval_sec).toBe(15);
  });

  it("same value → 200 without writing last_event", async () => {
    await patchRoom({ last_event: null });
    signInAs(cookieStore, cast.H);
    expect((await update(5)).ok).toBe(true);
    expect((await roomDoc())?.last_event).toBeNull();
  });

  it("AC-8: player → NOT_ROOM_HOST; outsider → NOT_ROOM_MEMBER; no session → UNAUTHENTICATED", async () => {
    expect(await update(8)).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.B);
    expect(await update(8)).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    signInAs(cookieStore, cast.X);
    expect(await update(8)).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    expect((await roomDoc())?.draw_interval_sec).toBe(5);
  });
});
