import { seedDatabase, seedStorage } from "../lib/admin";
import { projectId } from "../lib/env";

async function emulatorDelete(host: string, path: string): Promise<void> {
  const response = await fetch(`http://${host}${path}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`DELETE ${path} → ${response.status} ${await response.text()}`);
  }
}

/** Xóa sạch dữ liệu emulator: Firestore, Auth, RTDB, Storage. */
export async function reset(): Promise<void> {
  const id = projectId();
  await emulatorDelete(
    process.env.FIRESTORE_EMULATOR_HOST!,
    `/emulator/v1/projects/${id}/databases/(default)/documents`,
  );
  await emulatorDelete(process.env.FIREBASE_AUTH_EMULATOR_HOST!, `/emulator/v1/projects/${id}/accounts`);

  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    await seedDatabase().ref("/").remove();
  }
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    await seedStorage().bucket().deleteFiles({ force: true });
  }
}
