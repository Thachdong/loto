import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { createClaimAction } from "@/features/game/server/actions/create-claim.action";
import { generateTicketSet, seededRng } from "@/features/room/shared/domain/generate-ticket-set";
import { createCookieStore } from "../auth/google-token";
import { db, millis } from "../invite/invite-fixtures";
import { createCast, resetAll, signInAs, writePlayer, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";
import { GAME, gameDoc, NOW, patchGame, patchRoom, ROOM, roomDoc, SEC, ts } from "./game-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

const tickets = generateTicketSet(seededRng(7));
const rowNumbers = (id: string, row: number) => {
  const t = tickets.find((x) => x.id === id)!;
  return t.grid.slice(row * 9, row * 9 + 9).filter((n) => n !== 0);
};

let cast: Cast;
const claim = (ticketId: string, gameId = GAME) => createClaimAction({ roomId: ROOM, gameId, ticketId });

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
  await writePlayer(cast.C.uid, "Cúc C", ["blue_a", "blue_b"]);
  await patchGame({ status: "running", player_count: 2, started_at: ts(NOW), next_call_at: ts(new Date(NOW.getTime() + 3 * SEC)) });
  await patchRoom({ called_numbers: rowNumbers("blue_a", 0) });
});

afterEach(() => resetClock());

describe("createClaimAction", () => {
  it("no session → UNAUTHENTICATED; bad ticketId → VALIDATION_FAILED; outsider → NOT_ROOM_MEMBER", async () => {
    expect(await claim("blue_a")).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.C);
    expect(await claim("nope")).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    signInAs(cookieStore, cast.X);
    expect(await claim("blue_a")).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("GAME_STALE; CLAIMS_CLOSED when waiting/finished/cancelled", async () => {
    signInAs(cookieStore, cast.C);
    expect(await claim("blue_a", "g_old")).toMatchObject({ ok: false, error: { code: "GAME_STALE" } });
    for (const status of ["waiting", "finished", "cancelled"]) {
      await patchGame({ status });
      expect(await claim("blue_a")).toMatchObject({ ok: false, error: { code: "CLAIMS_CLOSED" } });
    }
  });

  it("AC-23: NOT_TICKET_HOLDER for a ticket the caller does not hold / has no player doc", async () => {
    signInAs(cookieStore, cast.C);
    expect(await claim("red_a")).toMatchObject({ ok: false, error: { code: "NOT_TICKET_HOLDER" } });
    signInAs(cookieStore, cast.H);
    expect(await claim("blue_a")).toMatchObject({ ok: false, error: { code: "NOT_TICKET_HOLDER" } });
    expect((await gameDoc())?.claims).toEqual([]);
  });

  it("AC-20: a complete row → win claim, game awaiting_confirm, number drawing stopped", async () => {
    signInAs(cookieStore, cast.C);
    const res = await claim("blue_a");
    expect(res).toEqual({ ok: true, data: { result: "win", ticketId: "blue_a", row: 0, gameStatus: "awaiting_confirm" } });
    const game = await gameDoc();
    expect(game).toMatchObject({ status: "awaiting_confirm", resume_status: "running", next_call_at: null, pause_reason: null });
    expect(game?.claims).toHaveLength(1);
    expect(game?.claims[0]).toMatchObject({ uid: cast.C.uid, display_name: "Cúc C", ticket_id: "blue_a", color: "blue", result: "win", row: 0 });
    expect(millis(game?.claims[0].claimed_at)).toBe(NOW.getTime());
    expect((await roomDoc())?.last_event).toMatchObject({ type: "claim_submitted", text: "Cúc C KINH!", actor_uid: cast.C.uid });
  });

  it("AC-18: incomplete row → miss claim still recorded, game awaiting_confirm", async () => {
    signInAs(cookieStore, cast.B);
    expect(await claim("red_a")).toEqual({ ok: true, data: { result: "miss", ticketId: "red_a", row: null, gameStatus: "awaiting_confirm" } });
    const game = await gameDoc();
    expect(game).toMatchObject({ status: "awaiting_confirm", resume_status: "running" });
    expect(game?.claims[0]).toMatchObject({ result: "miss", row: null });
  });

  it("AC-19: claim while paused → awaiting_confirm with resume_status paused", async () => {
    await patchGame({ status: "paused", pause_reason: "host", next_call_at: null });
    signInAs(cookieStore, cast.C);
    expect(await claim("blue_a")).toMatchObject({ ok: true, data: { result: "win" } });
    expect(await gameDoc()).toMatchObject({ status: "awaiting_confirm", resume_status: "paused", pause_reason: null });
  });

  it("AC-22: claim while awaiting_confirm → append only, status/resume_status kept", async () => {
    signInAs(cookieStore, cast.C);
    await claim("blue_a");
    signInAs(cookieStore, cast.B);
    expect(await claim("red_a")).toMatchObject({ ok: true, data: { result: "miss", gameStatus: "awaiting_confirm" } });
    const game = await gameDoc();
    expect(game).toMatchObject({ status: "awaiting_confirm", resume_status: "running" });
    expect(game?.claims.map((c: { ticket_id: string }) => c.ticket_id)).toEqual(["blue_a", "red_a"]);
  });

  it("AC-23: the same ticket twice → TICKET_ALREADY_CLAIMED; another ticket of the same player is fine", async () => {
    signInAs(cookieStore, cast.C);
    await claim("blue_a");
    expect(await claim("blue_a")).toMatchObject({ ok: false, error: { code: "TICKET_ALREADY_CLAIMED" } });
    expect(await claim("blue_b")).toMatchObject({ ok: true });
    expect((await gameDoc())?.claims).toHaveLength(2);
  });

  it("player who left the room (player doc kept) → NOT_ROOM_MEMBER", async () => {
    await db.doc(`users/${cast.C.uid}`).update({ current_room_id: null });
    signInAs(cookieStore, cast.C);
    expect(await claim("blue_a")).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });

  it("lazy expiry: running game claimed past expires_at → room closing, game awaiting_confirm", async () => {
    await patchRoom({ expires_at: ts(new Date(NOW.getTime() - 1000)) });
    signInAs(cookieStore, cast.C);
    expect(await claim("blue_a")).toMatchObject({ ok: true });
    expect(await roomDoc()).toMatchObject({ status: "closing" });
    expect((await gameDoc())?.status).toBe("awaiting_confirm");
  });
});
