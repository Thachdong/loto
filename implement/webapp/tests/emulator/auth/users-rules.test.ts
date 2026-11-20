import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { clearAll, initTestEnv } from "../helpers";

let env: RulesTestEnvironment;

const userDoc = (name: string) => ({
  email: `${name}@example.com`,
  google_name: name,
  google_photo_url: null,
  display_name: name,
  photo_url: null,
  profile_customized: false,
  current_room_id: null,
  chat_recent_at: [],
});

beforeAll(async () => {
  env = await initTestEnv();
});

beforeEach(async () => {
  await clearAll(env);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc("users/A").set(userDoc("a"));
    await db.doc("users/B").set(userDoc("b"));
  });
});

afterAll(async () => {
  await env?.cleanup();
});

const asA = () => env.authenticatedContext("A", { firebase: { sign_in_provider: "google.com" } }).firestore();

describe("AC-18: users/{uid} rules", () => {
  it("owner can read own doc", async () => {
    await assertSucceeds(asA().doc("users/A").get());
  });

  it("owner cannot read another user's doc", async () => {
    await assertFails(asA().doc("users/B").get());
  });

  it("owner cannot list the users collection", async () => {
    await assertFails(asA().collection("users").get());
  });

  it("owner cannot write own doc (set/update/delete)", async () => {
    const db = asA();
    await assertFails(db.doc("users/A").set(userDoc("hacked")));
    await assertFails(db.doc("users/A").update({ display_name: "hacked" }));
    await assertFails(db.doc("users/A").delete());
  });

  it("owner cannot create another user's doc", async () => {
    await assertFails(asA().doc("users/C").set(userDoc("c")));
  });

  it("unauthenticated client cannot read users/A", async () => {
    await assertFails(env.unauthenticatedContext().firestore().doc("users/A").get());
  });
});
