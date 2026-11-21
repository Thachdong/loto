import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { releaseTicketAction } from "@/features/ticket/server/actions/release-ticket.action";
import { createCookieStore } from "../auth/google-token";
import { db, NOW } from "../invite/invite-fixtures";
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

const release = (ticketId: string) => releaseTicketAction({ roomId: ROOM, ticketId });

describe("releaseTicketAction", () => {
  it("no session → UNAUTHENTICATED", async () => {
    expect(await release("red_a")).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("AC-8: happy path removes the ticket and keeps the player doc with []", async () => {
    await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
    signInAs(cookieStore, cast.B);
    expect(await release("red_a")).toEqual({ ok: true, data: { gameId: GAME, ticketIds: [] } });
    expect((await players().doc(cast.B.uid).get()).exists).toBe(true);
    expect(await playerIds(cast.B.uid)).toEqual([]);
  });

  it("keeps the other ticket when holding two", async () => {
    await writePlayer(cast.B.uid, "Bình B", ["red_a", "pink_b"]);
    signInAs(cookieStore, cast.B);
    expect(await release("red_a")).toEqual({ ok: true, data: { gameId: GAME, ticketIds: ["pink_b"] } });
    expect(await playerIds(cast.B.uid)).toEqual(["pink_b"]);
  });

  it("ticket not held (free, or held by someone else, or no player doc) → TICKET_NOT_HELD", async () => {
    await writePlayer(cast.C.uid, "Cúc C", ["blue_b"]);
    signInAs(cookieStore, cast.B);
    expect(await release("red_a")).toMatchObject({ ok: false, error: { code: "TICKET_NOT_HELD" } });
    expect(await release("blue_b")).toMatchObject({ ok: false, error: { code: "TICKET_NOT_HELD" } });
    expect(await playerIds(cast.C.uid)).toEqual(["blue_b"]);
  });

  it("AC-9: game not waiting → GAME_NOT_WAITING, ticket kept", async () => {
    await writeTicketRoom(cast.H, { gameStatus: "running" });
    await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
    signInAs(cookieStore, cast.B);
    expect(await release("red_a")).toMatchObject({ ok: false, error: { code: "GAME_NOT_WAITING" } });
    expect(await playerIds(cast.B.uid)).toEqual(["red_a"]);
  });

  it("missing ticket doc → TICKET_NOT_FOUND", async () => {
    await db.doc(`rooms/${ROOM}/tickets/red_a`).delete();
    signInAs(cookieStore, cast.B);
    expect(await release("red_a")).toMatchObject({ ok: false, error: { code: "TICKET_NOT_FOUND" } });
  });

  it("AC-20: non-member → NOT_ROOM_MEMBER", async () => {
    await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
    signInAs(cookieStore, cast.X);
    expect(await release("red_a")).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    expect(await playerIds(cast.B.uid)).toEqual(["red_a"]);
  });
});
