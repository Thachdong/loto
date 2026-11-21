import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { clearAll, initTestEnv } from "../helpers";

let env: RulesTestEnvironment;

const node = (online = true) => ({ online, display_name: "An", photo_url: null, at: 1_700_000_000_000 });

beforeAll(async () => {
  env = await initTestEnv();
});

beforeEach(async () => {
  await clearAll(env);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const rtdb = ctx.database();
    await rtdb.ref("presence_access/X").set({ A: true, B: true });
    await rtdb.ref("presence/X/B").set(node());
  });
});

afterAll(async () => {
  await env?.cleanup();
});

const as = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } }).database();

describe("AC-22: RTDB presence rules (ADR-06)", () => {
  it("owner with presence_access writes own node (and updates online=false like onDisconnect)", async () => {
    const db = as("A");
    await assertSucceeds(db.ref("presence/X/A").set(node()));
    await assertSucceeds(db.ref("presence/X/A").update({ online: false }));
    await assertSucceeds(db.ref("presence/X/A").set({ online: true, display_name: "An", at: 1 }));
    await assertSucceeds(db.ref("presence/X/A").set({ ...node(), photo_url: "http://x/p.png" }));
  });

  it("cannot write another user's node", async () => {
    await assertFails(as("A").ref("presence/X/B").set(node(false)));
  });

  it("no presence_access → cannot write own node (other room, or not a member)", async () => {
    await assertFails(as("A").ref("presence/Y/A").set(node()));
    await assertFails(as("C").ref("presence/X/C").set(node()));
  });

  it("unauthenticated cannot write", async () => {
    await assertFails(env.unauthenticatedContext().database().ref("presence/X/A").set(node()));
  });

  it("validation: online must be boolean, display_name string ≤ 100, at number, photo_url string|null, no extra keys", async () => {
    const db = as("A");
    await assertFails(db.ref("presence/X/A").set({ ...node(), online: "yes" }));
    await assertFails(db.ref("presence/X/A").set({ ...node(), display_name: "x".repeat(101) }));
    await assertFails(db.ref("presence/X/A").set({ ...node(), display_name: 5 }));
    await assertFails(db.ref("presence/X/A").set({ ...node(), at: "now" }));
    await assertFails(db.ref("presence/X/A").set({ ...node(), photo_url: 5 }));
    await assertFails(db.ref("presence/X/A").set({ ...node(), extra: 1 }));
    await assertFails(db.ref("presence/X/A").set({ online: true }));
    await assertSucceeds(db.ref("presence/X/A").set({ ...node(), display_name: "x".repeat(100) }));
  });

  it("member (presence_access) reads presence/{roomId} and a single node", async () => {
    await assertSucceeds(as("A").ref("presence/X").get());
    await assertSucceeds(as("A").ref("presence/X/B").get());
  });

  it("non-member / other room / unauthenticated cannot read presence", async () => {
    await assertFails(as("C").ref("presence/X").get());
    await assertFails(as("A").ref("presence/Y").get());
    await assertFails(env.unauthenticatedContext().database().ref("presence/X").get());
  });

  it("presence_access is closed to clients (read + write, even for the owner)", async () => {
    const db = as("A");
    await assertFails(db.ref("presence_access/X").get());
    await assertFails(db.ref("presence_access/X/A").get());
    await assertFails(db.ref("presence_access/X/C").set(true));
    await assertFails(db.ref("presence_access/X/A").set(false));
  });
});
