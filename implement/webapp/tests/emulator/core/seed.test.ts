import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { afterAll, describe, expect, it } from "vitest";
import { PROJECT_ID } from "../helpers";

const tsx = resolve(process.cwd(), "node_modules/.bin/tsx");
const seedScript = resolve(process.cwd(), "scripts/seed/index.ts");

function runSeed(scenario: string, env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(tsx, [seedScript, scenario], { env, encoding: "utf8" });
}

const app =
  getApps().find((a) => a.name === "seed-test") ??
  initializeApp({ projectId: PROJECT_ID }, "seed-test");
const db = getFirestore(app);

afterAll(() => {
  runSeed("reset");
});

describe("seed", () => {
  it("AC-10: refuses to run without FIRESTORE_EMULATOR_HOST and writes nothing", async () => {
    runSeed("reset");
    const env = { ...process.env };
    delete env.FIRESTORE_EMULATOR_HOST;

    const result = runSeed("smoke", env);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Chỉ chạy seed trên emulator");
    expect((await db.doc("_smoke/hello").get()).exists).toBe(false);
  });

  it("refuses an unknown scenario", () => {
    const result = runSeed("nope");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Scenario không hợp lệ");
  });

  it("AC-11: smoke writes _smoke/hello, reset empties Firestore", async () => {
    const smoke = runSeed("smoke");
    expect(smoke.status, smoke.stderr).toBe(0);
    expect((await db.doc("_smoke/hello").get()).data()).toMatchObject({ message: "hello" });

    const reset = runSeed("reset");
    expect(reset.status, reset.stderr).toBe(0);
    expect(await db.listCollections()).toHaveLength(0);
  });
});
