import { FieldValue } from "firebase-admin/firestore";
import { seedFirestore } from "../lib/admin";

/** Ghi 1 doc để kiểm seed + Emulator UI hoạt động. */
export async function smoke(): Promise<void> {
  await seedFirestore().doc("_smoke/hello").set({
    message: "hello",
    created_at: FieldValue.serverTimestamp(),
  });
}
