import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { clearAll, initTestEnv } from "../helpers";

let env: RulesTestEnvironment;

const userDoc = (name: string, currentRoomId: string | null) => ({
  email: `${name}@example.com`,
  display_name: name,
  current_room_id: currentRoomId,
});

beforeAll(async () => {
  env = await initTestEnv();
});

beforeEach(async () => {
  await clearAll(env);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc("users/B").set(userDoc("b", "X"));
    await db.doc("users/N").set(userDoc("n", "Y"));
    await db.doc("rooms/X").set({ name: "Phòng X", status: "active" });
    await db.doc("rooms/X/tickets/red_a").set({ color: "red", side: "a", grid: [], set_no: 1 });
    await db.doc("rooms/X/games/g1").set({ seq_no: 1, status: "waiting" });
    await db.doc("rooms/X/games/g1/players/B").set({ display_name: "b", ticket_ids: ["red_a"] });
    await db.doc("rooms/Y").set({ name: "Phòng Y", status: "active" });
  });
});

afterAll(async () => {
  await env?.cleanup();
});

const as = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } });

describe("AC-20: tickets / players rules", () => {
  it("member reads tickets (doc + collection) and players (doc + collection)", async () => {
    const db = as("B").firestore();
    await assertSucceeds(db.doc("rooms/X/tickets/red_a").get());
    await assertSucceeds(db.collection("rooms/X/tickets").get());
    await assertSucceeds(db.doc("rooms/X/games/g1/players/B").get());
    await assertSucceeds(db.collection("rooms/X/games/g1/players").get());
  });

  it("non-member (member of another room) cannot read tickets or players", async () => {
    const db = as("N").firestore();
    await assertFails(db.doc("rooms/X/tickets/red_a").get());
    await assertFails(db.collection("rooms/X/tickets").get());
    await assertFails(db.doc("rooms/X/games/g1/players/B").get());
    await assertFails(db.collection("rooms/X/games/g1/players").get());
  });

  it("unauthenticated cannot read tickets or players", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(db.collection("rooms/X/tickets").get());
    await assertFails(db.collection("rooms/X/games/g1/players").get());
  });

  it("member cannot write tickets or players (create, update, delete)", async () => {
    const db = as("B").firestore();
    await assertFails(db.doc("rooms/X/tickets/red_a").update({ grid: [1] }));
    await assertFails(db.doc("rooms/X/tickets/pink_b").set({ color: "pink" }));
    await assertFails(db.doc("rooms/X/games/g1/players/B").update({ ticket_ids: [] }));
    await assertFails(db.doc("rooms/X/games/g1/players/B").delete());
    await assertFails(db.doc("rooms/X/games/g1/players/Z").set({ ticket_ids: ["pink_b"] }));
  });
});
