import { seedDatabase } from "../lib/admin";
import { seedRoom } from "../lib/seed-room";
import { seedUser } from "../lib/seed-user";
import { seedUserDoc } from "../lib/seed-user-doc";

const AN = { uid: "u_mb_an", email: "an@example.com", name: "An" };
const BINH = { uid: "u_mb_binh", email: "binh@example.com", name: "Bình" };
const CHI = { uid: "u_mb_chi", email: "chi@example.com", name: "Chi" };
const DUNG = { uid: "u_mb_dung", email: "dung@example.com", name: "Dũng" };
const HOUR = 60 * 60 * 1000;

/**
 * T-009 `room-members` (alias `t009`): host An + Bình (online, Đỏ A) + Chi (offline 12 phút, Lam B) + Dũng (online,
 * chưa lấy vé), ván 1 `waiting`. Presence ghi tên thật để sheet "Người" hiển thị đúng.
 */
export async function roomMembers(): Promise<void> {
  const people = [AN, BINH, CHI, DUNG];
  for (const p of people) {
    await seedUser({ uid: p.uid, email: p.email, name: p.name });
    await seedUserDoc({ uid: p.uid, email: p.email, googleName: p.name, displayName: p.name, profileCustomized: false, currentRoomId: "r_members" });
  }
  const now = Date.now();
  const expiresAt = new Date(now + 8 * HOUR);
  await seedRoom({
    roomId: "r_members",
    hostUid: AN.uid,
    members: people.map((p) => p.uid),
    name: "Người trong phòng",
    joinCode: "MBR234",
    inviteCode: "MEMBERSINVITE00000000",
    rngSeed: 91,
    createdAt: new Date(expiresAt.getTime() - 8 * HOUR),
    expiresAt,
    drawIntervalSec: 5,
    gameStatus: "waiting",
    players: [
      { uid: BINH.uid, displayName: BINH.name, ticketIds: ["red_a"] },
      { uid: CHI.uid, displayName: CHI.name, ticketIds: ["blue_b"] },
    ],
    playerCount: 0,
  });
  const node = (p: typeof AN, online: boolean, at: number) => ({ online, display_name: p.name, photo_url: null, at });
  await seedDatabase()
    .ref("presence/r_members")
    .set({
      [AN.uid]: node(AN, true, now),
      [BINH.uid]: node(BINH, true, now),
      [CHI.uid]: node(CHI, false, now - 12 * 60 * 1000),
      [DUNG.uid]: node(DUNG, true, now),
    });
  console.log("[room-members] roomId=r_members (ván waiting; Chi offline giữ Lam B, Dũng chưa lấy vé)");
  for (const p of people) console.log(`  ${p.name}: uid=${p.uid} email=${p.email}`);
}
