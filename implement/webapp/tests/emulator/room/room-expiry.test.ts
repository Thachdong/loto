import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";
import { firestore, rtdb } from "@/core/db/firestore";
import { getAdminApp } from "@/core/server/firebase-admin";
import { applyLazyExpiry, planLazyExpiry } from "@/features/room/server/services/room-expiry.service";
import { clearFirestoreAndAuth } from "../auth/google-token";
import { writeUserDoc } from "./session-cookie";

const db = getFirestore(getAdminApp());
const HOUR = 60 * 60 * 1000;
const expiresAt = new Date("2026-11-21T10:00:00.000Z");
const before = new Date(expiresAt.getTime() - 1);
const after = new Date(expiresAt.getTime() + HOUR);

const data = async (path: string) => (await db.doc(path).get()).data();

async function seed(status: string, gameStatus: string) {
  await db.doc("rooms/r1").set({
    name: "Phòng 1",
    host_uid: "u_a",
    status,
    member_count: 2,
    expires_at: Timestamp.fromDate(expiresAt),
    created_at: Timestamp.fromMillis(expiresAt.getTime() - 8 * HOUR),
    current_game_id: "g1",
    game_count: 1,
    close_reason: null,
    closed_at: null,
    last_event: null,
  });
  await db.doc("rooms/r1/games/g1").set({ seq_no: 1, status: gameStatus, result: null, ended_at: null });
  await writeUserDoc("u_a", { email: "a@example.com", name: "A", currentRoomId: "r1" });
  await writeUserDoc("u_b", { email: "b@example.com", name: "B", currentRoomId: "r1" });
  await writeUserDoc("u_c", { email: "c@example.com", name: "C", currentRoomId: "r_other" });
  await rtdb().ref("presence_access/r1").set({ u_a: true, u_b: true });
  await rtdb().ref("presence/r1").set({ u_a: { online: true } });
}

async function run(now: Date, exceptUids?: string[]) {
  const plan = await firestore().runTransaction((tx) => applyLazyExpiry(tx, { roomId: "r1", now }, { exceptUids }));
  await plan.afterCommit();
  return plan;
}

beforeEach(async () => {
  await clearFirestoreAndAuth();
  await rtdb().ref().remove();
});

describe("AC-9: applyLazyExpiry (BR-04, ADR-05)", () => {
  it("not yet expired → nothing changes", async () => {
    await seed("active", "waiting");
    const plan = await run(before);
    expect(plan).toMatchObject({ outcome: "none", status: "active" });
    expect(await data("rooms/r1")).toMatchObject({ status: "active", member_count: 2 });
    expect((await data("rooms/r1/games/g1"))?.status).toBe("waiting");
    expect((await data("users/u_a"))?.current_room_id).toBe("r1");
    expect((await rtdb().ref("presence_access/r1").get()).exists()).toBe(true);
  });

  it("expired + game waiting → game cancelled, room closed/expired, members cleared, presence removed", async () => {
    await seed("active", "waiting");
    const plan = await run(after);

    expect(plan).toMatchObject({ outcome: "closed", status: "closed" });
    expect([...plan.memberUids].sort()).toEqual(["u_a", "u_b"]);
    const room = await data("rooms/r1");
    expect(room).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
    expect((room?.closed_at as Timestamp).toMillis()).toBe(after.getTime());
    expect((room?.updated_at as Timestamp).toMillis()).toBe(after.getTime());
    expect(room?.last_event).toMatchObject({ type: "room_closed", actor_uid: null, target_uid: null });
    const game = await data("rooms/r1/games/g1");
    expect(game).toMatchObject({ status: "cancelled", result: "cancelled" });
    expect((game?.ended_at as Timestamp).toMillis()).toBe(after.getTime());
    expect((await data("users/u_a"))?.current_room_id).toBeNull();
    expect((await data("users/u_b"))?.current_room_id).toBeNull();
    expect((await data("users/u_c"))?.current_room_id).toBe("r_other");
    expect((await rtdb().ref("presence_access/r1").get()).exists()).toBe(false);
    expect((await rtdb().ref("presence/r1").get()).exists()).toBe(false);
  });

  it("exactly at expires_at counts as expired", async () => {
    await seed("active", "waiting");
    expect((await run(expiresAt)).outcome).toBe("closed");
  });

  it("exceptUids keeps their current_room_id", async () => {
    await seed("active", "waiting");
    await run(after, ["u_a"]);
    expect((await data("users/u_a"))?.current_room_id).toBe("r1");
    expect((await data("users/u_b"))?.current_room_id).toBeNull();
  });

  for (const gameStatus of ["running", "paused"]) {
    it(`expired + game ${gameStatus} → room closing, last_event room_closing, game & members untouched`, async () => {
      await seed("active", gameStatus);
      const plan = await run(after);
      expect(plan).toMatchObject({ outcome: "closing", status: "closing" });
      const room = await data("rooms/r1");
      expect(room).toMatchObject({ status: "closing", member_count: 2, close_reason: null });
      expect(room?.last_event?.type).toBe("room_closing");
      expect((await data("rooms/r1/games/g1"))?.status).toBe(gameStatus);
      expect((await data("users/u_b"))?.current_room_id).toBe("r1");
      expect((await rtdb().ref("presence_access/r1").get()).exists()).toBe(true);
    });
  }

  it("AC-38: expired + awaiting_confirm with a win claim → game finished (won), room closed, members cleared", async () => {
    await seed("active", "awaiting_confirm");
    const claimAt = Timestamp.fromDate(before);
    await db.doc("rooms/r1/games/g1").update({
      claims: [
        { uid: "u_b", display_name: "B", ticket_id: "red_a", color: "red", result: "miss", row: null, claimed_at: claimAt },
        { uid: "u_a", display_name: "A", ticket_id: "blue_a", color: "blue", result: "win", row: 3, claimed_at: claimAt },
      ],
    });
    const plan = await run(after);

    expect(plan).toMatchObject({ outcome: "closed", status: "closed", gameStatus: "finished" });
    const game = await data("rooms/r1/games/g1");
    expect(game).toMatchObject({ status: "finished", result: "won", next_call_at: null });
    expect((game?.ended_at as Timestamp).toMillis()).toBe(after.getTime());
    expect(game?.winners).toHaveLength(1);
    expect(game?.winners[0]).toMatchObject({ uid: "u_a", ticket_id: "blue_a", row: 3 });
    expect(await data("rooms/r1")).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
    expect((await data("users/u_a"))?.current_room_id).toBeNull();
    expect((await rtdb().ref("presence/r1").get()).exists()).toBe(false);
  });

  it("AC-38: expired + awaiting_confirm without a win claim → finished with no_winner", async () => {
    await seed("active", "awaiting_confirm");
    const plan = await run(after);
    expect(plan).toMatchObject({ outcome: "closed", gameStatus: "finished" });
    expect(await data("rooms/r1/games/g1")).toMatchObject({ status: "finished", result: "no_winner" });
  });

  for (const gameStatus of ["finished", "cancelled"]) {
    it(`room closing + game ${gameStatus} → room closed (even before expires_at)`, async () => {
      await seed("closing", gameStatus);
      const plan = await run(before);
      expect(plan).toMatchObject({ outcome: "closed", status: "closed", gameStatus });
      expect(await data("rooms/r1")).toMatchObject({ status: "closed", close_reason: "expired", member_count: 0 });
      expect((await data("rooms/r1/games/g1"))?.status).toBe(gameStatus);
      expect((await data("users/u_b"))?.current_room_id).toBeNull();
    });
  }

  it("room already closing or closed → no change (idempotent)", async () => {
    await seed("closing", "running");
    expect(await run(after)).toMatchObject({ outcome: "none", status: "closing" });
    await seed("closed", "cancelled");
    expect(await run(after)).toMatchObject({ outcome: "none", status: "closed" });
  });

  it("missing room → status null", async () => {
    const plan = await firestore().runTransaction((tx) => planLazyExpiry(tx, { roomId: "nope", now: after }));
    expect(plan).toMatchObject({ outcome: "none", status: null, room: null });
  });

  it("planLazyExpiry only reads; writes happen when plan.apply is called", async () => {
    await seed("active", "waiting");
    await firestore().runTransaction(async (tx) => {
      await planLazyExpiry(tx, { roomId: "r1", now: after });
    });
    expect((await data("rooms/r1"))?.status).toBe("active");
  });
});
