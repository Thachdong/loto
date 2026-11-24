import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rtdb } from "@/core/db/firestore";
import { resetClock, setClock } from "@/core/server/clock";
import { expireRoomAction } from "@/features/room/server/actions/expire-room.action";
import { createCookieStore } from "../auth/google-token";
import { HOUR, millis } from "../invite/invite-fixtures";
import { gameDoc, NOW, patchGame, patchRoom, ROOM, roomDoc, ts, userDoc } from "../game/game-fixtures";
import { createCast, resetAll, signInAs, writePlayer, writePresence, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;
const expired = () => patchRoom({ expires_at: ts(new Date(NOW.getTime() - 1000)) });
const expire = () => expireRoomAction({ roomId: ROOM });

const claim = (uid: string, name: string, ticketId: string, result: "win" | "miss", row: number | null) => ({
  uid,
  display_name: name,
  ticket_id: ticketId,
  color: ticketId.split("_")[0],
  result,
  row,
  claimed_at: ts(NOW),
});

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await rtdb().ref(`presence_access/${ROOM}`).set({ [cast.H.uid]: true, [cast.B.uid]: true });
  await writePresence(cast.H.uid, true);
});

afterEach(() => resetClock());

describe("expireRoomAction", () => {
  it("no session → UNAUTHENTICATED; outsider → NOT_ROOM_MEMBER", async () => {
    expect(await expire()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.X);
    expect(await expire()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("AC-40: not yet expired → ROOM_NOT_EXPIRED, nothing changes", async () => {
    signInAs(cookieStore, cast.B);
    expect(await expire()).toMatchObject({ ok: false, error: { code: "ROOM_NOT_EXPIRED" } });
    expect(await roomDoc()).toMatchObject({ status: "active", member_count: 3 });
    expect((await gameDoc())?.status).toBe("waiting");
    expect((await userDoc(cast.B.uid))?.current_room_id).toBe(ROOM);
  });

  it("AC-36: waiting game expired → game cancelled, room closed/expired, everyone cleared, presence removed", async () => {
    await expired();
    signInAs(cookieStore, cast.B);
    expect(await expire()).toEqual({ ok: true, data: { roomStatus: "closed", gameStatus: "cancelled" } });
    expect(await roomDoc()).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
    expect((await roomDoc())?.last_event).toMatchObject({ type: "room_closed" });
    expect(millis((await roomDoc())?.closed_at)).toBe(NOW.getTime());
    expect(await gameDoc()).toMatchObject({ status: "cancelled", result: "cancelled" });
    for (const u of [cast.H, cast.B, cast.C]) expect((await userDoc(u.uid))?.current_room_id).toBeNull();
    expect((await userDoc(cast.X.uid))?.current_room_id).toBeNull();
    expect((await rtdb().ref(`presence/${ROOM}`).get()).exists()).toBe(false);
    expect((await rtdb().ref(`presence_access/${ROOM}`).get()).exists()).toBe(false);
  });

  it("AC-36: a second call after the room closed → NOT_ROOM_MEMBER (caller already cleared, no change)", async () => {
    await expired();
    signInAs(cookieStore, cast.B);
    await expire();
    expect(await expire()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    expect((await roomDoc())?.status).toBe("closed");
  });

  for (const status of ["running", "paused"]) {
    it(`AC-37: ${status} game expired → room closing (room_closing), game untouched; repeat call is idempotent`, async () => {
      await patchGame({ status });
      await expired();
      signInAs(cookieStore, cast.C);
      expect(await expire()).toEqual({ ok: true, data: { roomStatus: "closing", gameStatus: status } });
      expect(await roomDoc()).toMatchObject({ status: "closing", member_count: 3, close_reason: null });
      expect((await roomDoc())?.last_event).toMatchObject({ type: "room_closing" });
      expect((await gameDoc())?.status).toBe(status);
      expect((await userDoc(cast.C.uid))?.current_room_id).toBe(ROOM);

      const before = (await roomDoc())?.updated_at;
      expect(await expire()).toEqual({ ok: true, data: { roomStatus: "closing", gameStatus: status } });
      expect(millis((await roomDoc())?.updated_at)).toBe(millis(before));
    });
  }

  it("AC-38: awaiting_confirm with a win claim → game finished (won, winners = win claims), room closed", async () => {
    await writePlayer(cast.C.uid, "Cúc C", ["blue_a"]);
    await patchGame({
      status: "awaiting_confirm",
      resume_status: "running",
      claims: [claim(cast.B.uid, "Bình B", "red_a", "miss", null), claim(cast.C.uid, "Cúc C", "blue_a", "win", 0)],
    });
    await expired();
    signInAs(cookieStore, cast.H);

    expect(await expire()).toEqual({ ok: true, data: { roomStatus: "closed", gameStatus: "finished" } });
    const game = await gameDoc();
    expect(game).toMatchObject({ status: "finished", result: "won", next_call_at: null, resume_status: null });
    expect(millis(game?.ended_at)).toBe(NOW.getTime());
    expect(game?.winners).toHaveLength(1);
    expect(game?.winners[0]).toMatchObject({ uid: cast.C.uid, display_name: "Cúc C", ticket_id: "blue_a", color: "blue", row: 0 });
    expect(game?.claims).toHaveLength(2);
    expect(await roomDoc()).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
    expect((await userDoc(cast.C.uid))?.current_room_id).toBeNull();
  });

  it("AC-38: awaiting_confirm with only miss claims → finished with no_winner, room closed", async () => {
    await patchGame({ status: "awaiting_confirm", resume_status: "paused", claims: [claim(cast.B.uid, "Bình B", "red_a", "miss", null)] });
    await expired();
    signInAs(cookieStore, cast.H);
    expect(await expire()).toEqual({ ok: true, data: { roomStatus: "closed", gameStatus: "finished" } });
    expect(await gameDoc()).toMatchObject({ status: "finished", result: "no_winner", winners: [] });
    expect((await roomDoc())?.status).toBe("closed");
  });

  it("room closing + game already finished → room closed", async () => {
    await patchRoom({ status: "closing" });
    await patchGame({ status: "finished", result: "no_winner" });
    signInAs(cookieStore, cast.B);
    expect(await expire()).toEqual({ ok: true, data: { roomStatus: "closed", gameStatus: "finished" } });
    expect(await roomDoc()).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
    expect((await gameDoc())?.status).toBe("finished");
    expect((await userDoc(cast.B.uid))?.current_room_id).toBeNull();
  });

  it("exactly at expires_at counts as expired", async () => {
    await patchRoom({ expires_at: ts(NOW) });
    signInAs(cookieStore, cast.B);
    expect(await expire()).toMatchObject({ ok: true, data: { roomStatus: "closed" } });
  });

  it("not expired by HOUR margin stays untouched", async () => {
    await patchRoom({ expires_at: ts(new Date(NOW.getTime() + HOUR)) });
    signInAs(cookieStore, cast.B);
    expect(await expire()).toMatchObject({ ok: false, error: { code: "ROOM_NOT_EXPIRED" } });
  });
});
