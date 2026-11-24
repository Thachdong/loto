import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { clearAll, initTestEnv } from "../helpers";

let env: RulesTestEnvironment;

const userDoc = (name: string, currentRoomId: string | null) => ({
  email: `${name}@example.com`,
  google_name: name,
  display_name: name,
  profile_customized: false,
  current_room_id: currentRoomId,
  chat_recent_at: [],
});

beforeAll(async () => {
  env = await initTestEnv();
});

beforeEach(async () => {
  await clearAll(env);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc("users/A").set(userDoc("a", "X"));
    await db.doc("users/B").set(userDoc("b", null));
    await db.doc("users/C").set(userDoc("c", "Y"));
    await db.doc("rooms/X").set({ name: "Phòng X", status: "active", join_code: "ABC234" });
    await db.doc("rooms/X/tickets/red_a").set({ color: "red", side: "a", grid: [] });
    await db.doc("rooms/X/games/g1").set({ seq_no: 1, status: "waiting" });
    await db.doc("rooms/X/games/g1/players/A").set({ ticket_ids: [] });
    await db.doc("rooms/Y").set({ name: "Phòng Y", status: "active", join_code: "XYZ234" });
    await ctx.database().ref("presence_access/X/A").set(true);
  });
});

afterAll(async () => {
  await env?.cleanup();
});

const as = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } });
const paths = ["rooms/X", "rooms/X/tickets/red_a", "rooms/X/games/g1"];

describe("AC-17: rooms/** rules", () => {
  it("member (current_room_id = X) can read room, ticket, game and nested players", async () => {
    const db = as("A").firestore();
    for (const path of paths) await assertSucceeds(db.doc(path).get());
    await assertSucceeds(db.doc("rooms/X/games/g1/players/A").get());
    await assertSucceeds(db.collection("rooms/X/tickets").get());
  });

  it("member of another room cannot read room X", async () => {
    const db = as("C").firestore();
    for (const path of paths) await assertFails(db.doc(path).get());
  });

  it("user not in any room cannot read room X", async () => {
    const db = as("B").firestore();
    for (const path of paths) await assertFails(db.doc(path).get());
  });

  it("authenticated user without users doc is denied", async () => {
    const db = as("ghost").firestore();
    for (const path of paths) await assertFails(db.doc(path).get());
  });

  it("unauthenticated client is denied", async () => {
    const db = env.unauthenticatedContext().firestore();
    for (const path of paths) await assertFails(db.doc(path).get());
  });

  it("nobody can list or query rooms (e.g. by join_code)", async () => {
    await assertFails(as("A").firestore().collection("rooms").get());
    await assertFails(as("A").firestore().collection("rooms").where("join_code", "==", "ABC234").get());
  });

  it("member cannot write room, ticket, game (set/update/delete/create)", async () => {
    const db = as("A").firestore();
    await assertFails(db.doc("rooms/X").update({ name: "hacked" }));
    await assertFails(db.doc("rooms/X").delete());
    await assertFails(db.doc("rooms/X/tickets/red_a").set({ grid: [1] }));
    await assertFails(db.doc("rooms/X/games/g1").update({ status: "running" }));
    await assertFails(db.doc("rooms/X/games/g1/players/A").set({ ticket_ids: ["red_a"] }));
    await assertFails(db.doc("rooms/NEW").set({ name: "x" }));
  });

  it("member cannot change own current_room_id to gain access", async () => {
    await assertFails(as("B").firestore().doc("users/B").update({ current_room_id: "X" }));
  });
});

describe("RTDB presence_access (TBL-08): client cannot read or write", () => {
  it("member and others are denied", async () => {
    for (const uid of ["A", "B"]) {
      const db = as(uid).database();
      await assertFails(db.ref("presence_access/X/A").get());
      await assertFails(db.ref(`presence_access/X/${uid}`).set(true));
    }
    await assertFails(env.unauthenticatedContext().database().ref("presence_access").get());
  });
});

describe("T-009 AC-13: RTDB presence/{roomId} follows presence_access", () => {
  const node = { online: true, display_name: "a", at: 1 };

  it("member with presence_access reads the room presence and writes only own node", async () => {
    const db = as("A").database();
    await assertSucceeds(db.ref("presence/X").get());
    await assertSucceeds(db.ref("presence/X/A").set(node));
    await assertFails(db.ref("presence/X/B").set(node));
  });

  it("kicked user (presence_access removed) cannot read room X or write presence", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.database().ref("presence_access/X/A").remove();
      await ctx.firestore().doc("users/A").update({ current_room_id: null });
    });
    const user = as("A");
    await assertFails(user.database().ref("presence/X").get());
    await assertFails(user.database().ref("presence/X/A").set(node));
    for (const path of paths) await assertFails(user.firestore().doc(path).get());
  });
});
