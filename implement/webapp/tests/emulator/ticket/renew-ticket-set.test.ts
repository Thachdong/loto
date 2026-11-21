import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { TICKET_COLORS } from "@/features/room/shared/constants";
import { columnOf } from "@/features/room/shared/domain/generate-ticket-set";
import { renewTicketSetAction } from "@/features/ticket/server/actions/renew-ticket-set.action";
import { TICKET_IDS } from "@/features/ticket/shared/constants";
import { createCookieStore } from "../auth/google-token";
import { data, millis, NOW } from "../invite/invite-fixtures";
import {
  createCast,
  resetAll,
  ROOM,
  signInAs,
  snapshotCollection,
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
const renew = () => renewTicketSetAction({ roomId: ROOM });
const tickets = () => snapshotCollection(`rooms/${ROOM}/tickets`);

/** Bất biến BR-08 (như `violations` trong generate-ticket-set.test.ts) trên 16 doc vé. */
function brViolations(docs: Record<string, FirebaseFirestore.DocumentData>): string[] {
  const errors: string[] = [];
  if (JSON.stringify(Object.keys(docs).sort()) !== JSON.stringify([...TICKET_IDS].sort())) errors.push("ids");
  for (const [id, doc] of Object.entries(docs)) {
    const grid = doc.grid as number[];
    if (grid.length !== 81) errors.push(`${id}: ${grid.length} cells`);
    for (let row = 0; row < 9; row++) {
      if (grid.slice(row * 9, row * 9 + 9).filter((n) => n !== 0).length !== 5) errors.push(`${id}: row ${row}`);
    }
    for (let col = 0; col < 9; col++) {
      const inCol: number[] = [];
      for (let row = 0; row < 9; row++) {
        const n = grid[row * 9 + col];
        if (n === 0) continue;
        if (columnOf(n) !== col || n < 1 || n > 90) errors.push(`${id}: ${n} in col ${col}`);
        inCol.push(n);
      }
      for (let i = 1; i < inCol.length; i++) if (inCol[i] <= inCol[i - 1]) errors.push(`${id}: col ${col} order`);
    }
  }
  for (const color of TICKET_COLORS) {
    const merged = [...(docs[`${color}_a`]?.grid ?? []), ...(docs[`${color}_b`]?.grid ?? [])]
      .filter((n: number) => n !== 0)
      .sort((x: number, y: number) => x - y);
    if (JSON.stringify(merged) !== JSON.stringify(Array.from({ length: 90 }, (_, i) => i + 1))) errors.push(`${color}: pair`);
  }
  return errors;
}

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
});

afterEach(() => resetClock());

describe("renewTicketSetAction", () => {
  it("no session → UNAUTHENTICATED", async () => {
    expect(await renew()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("AC-13: nobody holds → 16 new grids (BR-08), set_no 2, ticket_set_no 2, last_event ticket_set_renewed", async () => {
    const before = await tickets();
    expect(brViolations(before)).toEqual([]);
    signInAs(cookieStore, cast.H);
    expect(await renew()).toEqual({ ok: true, data: { ticketSetNo: 2 } });

    const after = await tickets();
    expect(Object.keys(after)).toHaveLength(16);
    expect(brViolations(after)).toEqual([]);
    for (const id of TICKET_IDS) {
      expect(after[id].set_no).toBe(2);
      expect(after[id].grid).not.toEqual(before[id].grid);
      expect(millis(after[id].updated_at)).toBe(NOW.getTime());
    }
    const room = await data(`rooms/${ROOM}`);
    expect(room?.ticket_set_no).toBe(2);
    expect(room?.last_event).toMatchObject({ type: "ticket_set_renewed", actor_uid: cast.H.uid, target_uid: null });
    expect(millis(room?.last_event.at)).toBe(NOW.getTime());

    // renew again → 3
    expect(await renew()).toEqual({ ok: true, data: { ticketSetNo: 3 } });
  });

  it("players with empty ticket_ids do not block renewing", async () => {
    await writePlayer(cast.B.uid, "Bình B", []);
    signInAs(cookieStore, cast.H);
    expect(await renew()).toMatchObject({ ok: true });
  });

  it("AC-14: still held → TICKETS_STILL_HELD with details (uid, displayName, ticketIds, online from RTDB), nothing changed", async () => {
    await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
    await writePlayer(cast.C.uid, "Cúc C", ["blue_b"]);
    await writePresence(cast.B.uid, true);
    // C has no presence node → offline
    const before = await tickets();
    signInAs(cookieStore, cast.H);
    const result = await renew();
    expect(result).toMatchObject({ ok: false, error: { code: "TICKETS_STILL_HELD" } });
    if (result.ok) throw new Error("unreachable");
    expect(result.error.details).toHaveLength(2);
    expect(result.error.details).toEqual(
      expect.arrayContaining([
        { code: "holder", uid: cast.B.uid, displayName: "Bình B", ticketIds: ["red_a"], online: true },
        { code: "holder", uid: cast.C.uid, displayName: "Cúc C", ticketIds: ["blue_b"], online: false },
      ]),
    );
    expect(await tickets()).toEqual(before);
    expect((await data(`rooms/${ROOM}`))?.ticket_set_no).toBe(1);
  });

  it("presence node with online=false is reported offline", async () => {
    await writePlayer(cast.C.uid, "Cúc C", ["blue_b"]);
    await writePresence(cast.C.uid, false);
    signInAs(cookieStore, cast.H);
    const result = await renew();
    if (result.ok) throw new Error("unreachable");
    expect(result.error.details?.[0]).toMatchObject({ uid: cast.C.uid, online: false });
  });

  it("AC-17: non-host member → NOT_ROOM_HOST, nothing changed", async () => {
    const before = await tickets();
    signInAs(cookieStore, cast.B);
    expect(await renew()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    expect(await tickets()).toEqual(before);
  });

  it("AC-18: game running → GAME_NOT_WAITING, nothing changed", async () => {
    await writeTicketRoom(cast.H, { gameStatus: "running" });
    const before = await tickets();
    signInAs(cookieStore, cast.H);
    expect(await renew()).toMatchObject({ ok: false, error: { code: "GAME_NOT_WAITING" } });
    expect(await tickets()).toEqual(before);
    expect((await data(`rooms/${ROOM}`))?.ticket_set_no).toBe(1);
  });

  it("AC-20: non-member → NOT_ROOM_MEMBER", async () => {
    signInAs(cookieStore, cast.X);
    expect(await renew()).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });
});
