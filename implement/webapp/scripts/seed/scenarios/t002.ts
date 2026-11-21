import { seedUser } from "../lib/seed-user";
import { seedUserDoc } from "../lib/seed-user-doc";

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
