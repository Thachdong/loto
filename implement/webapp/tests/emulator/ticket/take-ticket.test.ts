import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { takeTicketAction } from "@/features/ticket/server/actions/take-ticket.action";
import { takeTicket } from "@/features/ticket/server/services/ticket.service";
import { createCookieStore } from "../auth/google-token";
import { data, db, millis, NOW } from "../invite/invite-fixtures";
import { createCast, GAME, playerIds, players, resetAll, ROOM, signInAs, writePlayer, writeTicketRoom, type Cast } from "./ticket-fixtures";

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

const take = (ticketId: string, roomId = ROOM) => takeTicketAction({ roomId, ticketId });

describe("takeTicketAction", () => {
  it("no session → UNAUTHENTICATED", async () => {
    expect(await take("red_a")).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("invalid ticketId → VALIDATION_FAILED", async () => {
    signInAs(cookieStore, cast.B);
    expect(await take("red_c")).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(await take("red_a ")).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });

  it("AC-3: first take creates player doc with display_name, photo_url, joined_at, expire_at; second take only unions", async () => {
    signInAs(cookieStore, cast.B);
    const first = await take("red_a");
    expect(first).toEqual({ ok: true, data: { gameId: GAME, ticketIds: ["red_a"] } });
    const doc = await data(`rooms/${ROOM}/games/${GAME}/players/${cast.B.uid}`);
    expect(doc).toMatchObject({ display_name: "Bình B", photo_url: null, ticket_ids: ["red_a"] });
    expect(millis(doc?.joined_at)).toBe(NOW.getTime());
    const room = await data(`rooms/${ROOM}`);
    expect(millis(doc?.expire_at)).toBe(millis(room?.created_at) + 31 * 86_400_000);
    expect(room?.last_event).toBeNull();

    // AC-4: second ticket of another color, not required to be a pair
    const second = await take("pink_b");
    expect(second).toEqual({ ok: true, data: { gameId: GAME, ticketIds: ["red_a", "pink_b"] } });
    const after = await data(`rooms/${ROOM}/games/${GAME}/players/${cast.B.uid}`);
    expect(after?.ticket_ids).toEqual(["red_a", "pink_b"]);
    expect(millis(after?.joined_at)).toBe(NOW.getTime());
  });

  it("AC-5: already holding 2 → TICKET_LIMIT_REACHED, data unchanged", async () => {
    await writePlayer(cast.B.uid, "Bình B", ["red_a", "pink_b"]);
    signInAs(cookieStore, cast.B);
    expect(await take("teal_a")).toMatchObject({ ok: false, error: { code: "TICKET_LIMIT_REACHED" } });
    expect(await playerIds(cast.B.uid)).toEqual(["red_a", "pink_b"]);
  });

  it("AC-6: ticket held by someone else → TICKET_TAKEN; holding it yourself also TICKET_TAKEN", async () => {
    await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
    signInAs(cookieStore, cast.C);
    expect(await take("red_a")).toMatchObject({ ok: false, error: { code: "TICKET_TAKEN" } });
    expect((await players().doc(cast.C.uid).get()).exists).toBe(false);
    signInAs(cookieStore, cast.B);
    expect(await take("red_a")).toMatchObject({ ok: false, error: { code: "TICKET_TAKEN" } });
  });

  it("error order: TICKET_TAKEN is checked before TICKET_LIMIT_REACHED", async () => {
    await writePlayer(cast.B.uid, "Bình B", ["red_a", "pink_b"]);
    await writePlayer(cast.C.uid, "Cúc C", ["teal_a"]);
    signInAs(cookieStore, cast.B);
    expect(await take("teal_a")).toMatchObject({ ok: false, error: { code: "TICKET_TAKEN" } });
  });

  it("AC-9: game not waiting → GAME_NOT_WAITING", async () => {
    await writeTicketRoom(cast.H, { gameStatus: "running" });
    signInAs(cookieStore, cast.B);
    expect(await take("red_a")).toMatchObject({ ok: false, error: { code: "GAME_NOT_WAITING" } });
    expect((await players().get()).size).toBe(0);
  });

  it("ticket not found → TICKET_NOT_FOUND (checked before game status)", async () => {
    await writeTicketRoom(cast.H, { gameStatus: "running" });
    await db.doc(`rooms/${ROOM}/tickets/red_a`).delete();
    signInAs(cookieStore, cast.B);
    expect(await take("red_a")).toMatchObject({ ok: false, error: { code: "TICKET_NOT_FOUND" } });
  });

  it("AC-20: non-member → NOT_ROOM_MEMBER, nothing written", async () => {
    signInAs(cookieStore, cast.X);
    expect(await take("red_a")).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    expect((await players().get()).size).toBe(0);
  });

  it("room past expires_at (game waiting) → lazy expiry closes the room, NOT_ROOM_MEMBER, presence cleaned", async () => {
    setClock(() => new Date(NOW.getTime() + 9 * 3_600_000));
    signInAs(cookieStore, cast.B);
    expect(await take("red_a")).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    expect(await data(`rooms/${ROOM}`)).toMatchObject({ status: "closed", close_reason: "expired" });
    expect((await data(`users/${cast.B.uid}`))?.current_room_id).toBeNull();
    expect((await players().get()).size).toBe(0);
  });

  it("AC-7: two users racing for the same ticket → exactly one ok, one TICKET_TAKEN (20 rounds)", async () => {
    for (let round = 0; round < 20; round++) {
      const ticketId = ["teal_a", "teal_b", "red_a", "blue_a"][round % 4];
      await players().doc(cast.B.uid).delete();
      await players().doc(cast.C.uid).delete();
      const results = await Promise.allSettled([
        takeTicket(cast.B.uid, { roomId: ROOM, ticketId }),
        takeTicket(cast.C.uid, { roomId: ROOM, ticketId }),
      ]);
      const okCount = results.filter((r) => r.status === "fulfilled").length;
      const taken = results.filter((r) => r.status === "rejected" && (r.reason as { code?: string }).code === "TICKET_TAKEN");
      expect({ round, okCount, taken: taken.length }).toEqual({ round, okCount: 1, taken: 1 });

      const holders = (await players().get()).docs.filter((d) => (d.data().ticket_ids as string[]).includes(ticketId));
      expect(holders).toHaveLength(1);
    }
  }, 120_000);
});
