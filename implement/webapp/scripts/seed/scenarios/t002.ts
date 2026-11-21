import { FieldValue } from "firebase-admin/firestore";
import { seedFirestore } from "../lib/admin";
import { seedUser } from "../lib/seed-user";

type SeedProfile = {
  uid: string;
  email: string;
  googleName: string;
  displayName: string;
  profileCustomized: boolean;
  currentRoomId: string | null;
};

/** Ghi doc `users/{uid}` đủ field TBL-01 (set ghi đè → idempotent). */
async function seedUserDoc(p: SeedProfile): Promise<void> {
  const at = FieldValue.serverTimestamp();
  await seedFirestore().doc(`users/${p.uid}`).set({
    email: p.email,
    google_name: p.googleName,
    google_photo_url: null,
    display_name: p.displayName,
    photo_url: null,
    profile_customized: p.profileCustomized,
    current_room_id: p.currentRoomId,
    chat_recent_at: [],
    last_active_at: at,
    created_at: at,
    updated_at: at,
  });
}

/**
 * T-002: `u_binh` đã tự sửa hồ sơ (AC-5), `u_cuc` đang ở phòng `r_seed` (AC-7).
 * `an@example.com` cố ý không seed để test đăng nhập lần đầu (AC-2).
 */
export async function t002(): Promise<void> {
  await seedUser({ uid: "u_binh", email: "binh@example.com", name: "Bình Trần" });
  await seedUserDoc({
    uid: "u_binh",
    email: "binh@example.com",
    googleName: "Bình Trần",
    displayName: "Bình lô tô",
    profileCustomized: true,
    currentRoomId: null,
  });

  await seedUser({ uid: "u_cuc", email: "cuc@example.com", name: "Cúc Lê" });
  await seedUserDoc({
    uid: "u_cuc",
    email: "cuc@example.com",
    googleName: "Cúc Lê",
    displayName: "Cúc Lê",
    profileCustomized: false,
    currentRoomId: "r_seed",
  });
}
