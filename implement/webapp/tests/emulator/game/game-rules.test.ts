import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { clearAll, initTestEnv } from "../helpers";

let env: RulesTestEnvironment;

const userDoc = (name: string, currentRoomId: string | null) => ({
  email: `${name}@example.com`,
  display_name: name,
  current_room_id: currentRoomId,
});
const node = { online: true, display_name: "An", photo_url: null, at: 1_700_000_000_000 };

beforeAll(async () => {
  env = await initTestEnv();
});

beforeEach(async () => {
  await clearAll(env);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc("users/H").set(userDoc("h", "X"));
    await db.doc("users/B").set(userDoc("b", "X"));
    await db.doc("users/N").set(userDoc("n", null));
    await db.doc("users/L").set(userDoc("l", null)); // đã rời phòng X
    await db.doc("rooms/X").set({ name: "Phòng X", status: "active", called_numbers: [1, 2], host_uid: "H" });
    await db.doc("rooms/X/games/g1").set({ seq_no: 1, status: "running", claims: [] });
    await db.doc("rooms/X/games/g1/players/B").set({ display_name: "b", ticket_ids: ["red_a"] });
    const rtdb = ctx.database();
    await rtdb.ref("presence_access/X").set({ H: true, B: true });
    await rtdb.ref("presence/X/B").set(node);
  });
});

afterAll(async () => {
  await env?.cleanup();
});

const as = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } });

describe("AC-44: game rules", () => {
  it("members read rooms, games and players", async () => {
    const db = as("B").firestore();
    await assertSucceeds(db.doc("rooms/X").get());
    await assertSucceeds(db.doc("rooms/X/games/g1").get());
    await assertSucceeds(db.collection("rooms/X/games").get());
    await assertSucceeds(db.collection("rooms/X/games/g1/players").get());
  });

  it("host and player cannot write called_numbers, game status, claims or players", async () => {
    for (const uid of ["H", "B"]) {
      const db = as(uid).firestore();
      await assertFails(db.doc("rooms/X").update({ called_numbers: [1, 2, 3] }));
      await assertFails(db.doc("rooms/X").update({ status: "closed" }));
      await assertFails(db.doc("rooms/X/games/g1").update({ status: "finished" }));
      await assertFails(db.doc("rooms/X/games/g1").update({ claims: [{ uid, ticket_id: "red_a" }] }));
      await assertFails(db.doc("rooms/X/games/g1").update({ next_call_at: null }));
      await assertFails(db.doc("rooms/X/games/g2").set({ seq_no: 2, status: "waiting" }));
      await assertFails(db.doc("rooms/X/games/g1/players/B").update({ ticket_ids: ["blue_a"] }));
      await assertFails(db.doc("rooms/X/games/g1/players/B").delete());
      await assertFails(db.doc("rooms/X/games/g1").delete());
    }
  });

  it("non-members (no room, another room, or left the room) cannot read games or players", async () => {
    for (const uid of ["N", "L"]) {
      const db = as(uid).firestore();
      await assertFails(db.doc("rooms/X/games/g1").get());
      await assertFails(db.collection("rooms/X/games").get());
      await assertFails(db.collection("rooms/X/games/g1/players").get());
      await assertFails(db.doc("rooms/X").get());
    }
    await assertFails(env.unauthenticatedContext().firestore().doc("rooms/X/games/g1").get());
  });

  it("users documents stay read-only for others and unwritable", async () => {
    const db = as("B").firestore();
    await assertFails(db.doc("users/H").get());
    await assertFails(db.doc("users/B").update({ current_room_id: "Y" }));
  });
});

describe("AC-33/34: presence cannot be written after leaving or when the room closed", () => {
  it("after leaveRoom removes presence_access/{room}/{uid} the player cannot write presence again", async () => {
    const db = as("B").database();
    await assertSucceeds(db.ref("presence/X/B").set(node));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.database().ref().update({ "presence/X/B": null, "presence_access/X/B": null });
    });
    await assertFails(db.ref("presence/X/B").set(node));
    await assertFails(db.ref("presence/X/B").update({ online: true }));
    await assertSucceeds(as("H").database().ref("presence/X/H").set(node));
  });

  it("after the room closes (presence + presence_access removed) nobody can write or read presence", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.database().ref().update({ "presence/X": null, "presence_access/X": null });
    });
    for (const uid of ["H", "B"]) {
      const db = as(uid).database();
      await assertFails(db.ref(`presence/X/${uid}`).set(node));
      await assertFails(db.ref("presence/X").get());
    }
  });
});
