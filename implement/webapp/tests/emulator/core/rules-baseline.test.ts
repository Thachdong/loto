import { assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { clearAll, initTestEnv } from "../helpers";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initTestEnv();
});

beforeEach(async () => {
  await clearAll(env);
});

afterAll(async () => {
  await env?.cleanup();
});

const contexts = {
  unauthenticated: () => env.unauthenticatedContext(),
  authenticated: () => env.authenticatedContext("alice", { firebase: { sign_in_provider: "google.com" } }),
};

describe("AC-4: deny-all rules baseline", () => {
  for (const [name, makeContext] of Object.entries(contexts)) {
    describe(name, () => {
      it("Firestore read is denied", async () => {
        const db = makeContext().firestore();
        await assertFails(db.doc("rooms/r1").get());
        await assertFails(db.collection("users").get());
      });

      it("Firestore write is denied", async () => {
        const db = makeContext().firestore();
        await assertFails(db.doc("rooms/r1").set({ name: "x" }));
        await assertFails(db.doc("users/alice").set({ display_name: "Alice" }));
      });

      it("RTDB read and write are denied", async () => {
        const db = makeContext().database();
        await assertFails(db.ref("presence/alice").set({ online: true }));
        await assertFails(db.ref("presence").get());
      });

      it("Storage upload and read are denied", async () => {
        const storage = makeContext().storage();
        const file = storage.ref("avatars/alice/a.png");
        const upload = file.put(new Uint8Array([1, 2, 3]), { contentType: "image/png" });
        await assertFails(upload.then());
        await assertFails(file.getDownloadURL());
      });
    });
  }
});
