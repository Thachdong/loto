import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

export const PROJECT_ID = "demo-loto";

function readRules(file: string): string {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

/**
 * Môi trường test rules nạp đúng file rules thật của repo.
 * Host/port lấy từ biến môi trường do `firebase emulators:exec` đặt.
 */
export function initTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readRules("firestore.rules") },
    database: { rules: readRules("database.rules.json") },
    storage: { rules: readRules("storage.rules") },
  });
}

/** Xóa sạch dữ liệu giữa các test. */
export async function clearAll(env: RulesTestEnvironment): Promise<void> {
  await Promise.all([env.clearFirestore(), env.clearDatabase(), env.clearStorage()]);
}
