import { seedRoom } from "../lib/seed-room";
import { seedUser } from "../lib/seed-user";
import { seedUserDoc } from "../lib/seed-user-doc";

/**
 * T-003: `u_an` chưa ở phòng (AC-1, AC-2…); `u_cuc` là host `r_old` "Phòng của Cúc" đang `active`,
 * ván 1 `waiting`, còn 8 giờ (AC-10). `giang@example.com` cố ý không seed (đăng nhập lần đầu, AC-14).
 */
export async function t003(): Promise<void> {
  await seedUser({ uid: "u_an", email: "an@example.com", name: "An Nguyễn" });
  await seedUserDoc({
    uid: "u_an",
    email: "an@example.com",
    googleName: "An Nguyễn",
    displayName: "An Nguyễn",
    profileCustomized: false,
    currentRoomId: null,
  });

  await seedUser({ uid: "u_cuc", email: "cuc@example.com", name: "Cúc" });
  await seedUserDoc({
    uid: "u_cuc",
    email: "cuc@example.com",
    googleName: "Cúc",
    displayName: "Cúc",
    profileCustomized: false,
    currentRoomId: "r_old",
  });
  await seedRoom({
    roomId: "r_old",
    hostUid: "u_cuc",
    name: "Phòng của Cúc",
    joinCode: "CUC234",
    inviteCode: "cucOldRoomInvite000001",
    rngSeed: 3,
  });
}
