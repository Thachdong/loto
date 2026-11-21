import { FieldValue } from "firebase-admin/firestore";
import { seedFirestore } from "./admin";

export type SeedProfile = {
  uid: string;
  email: string;
  googleName: string;
  displayName: string;
  photoUrl?: string | null;
  profileCustomized: boolean;
  currentRoomId: string | null;
};

/** Ghi doc `users/{uid}` đủ field TBL-01 (set ghi đè → idempotent). */
export async function seedUserDoc(p: SeedProfile): Promise<void> {
  const at = FieldValue.serverTimestamp();
  await seedFirestore()
    .doc(`users/${p.uid}`)
    .set({
      email: p.email,
      google_name: p.googleName,
      google_photo_url: p.photoUrl ?? null,
      display_name: p.displayName,
      photo_url: p.photoUrl ?? null,
      profile_customized: p.profileCustomized,
      current_room_id: p.currentRoomId,
      chat_recent_at: [],
      last_active_at: at,
      created_at: at,
      updated_at: at,
    });
}
