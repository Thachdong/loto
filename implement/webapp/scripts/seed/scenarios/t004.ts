import { seedRoom } from "../lib/seed-room";
import { seedUser } from "../lib/seed-user";
import { seedUserDoc } from "../lib/seed-user-doc";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

type SeedPerson = { uid: string; email: string; name: string; currentRoomId: string | null };

async function person(p: SeedPerson): Promise<void> {
  await seedUser({ uid: p.uid, email: p.email, name: p.name });
  await seedUserDoc({
    uid: p.uid,
    email: p.email,
    googleName: p.name,
    displayName: p.name,
    profileCustomized: false,
    currentRoomId: p.currentRoomId,
  });
}

/**
 * T-004 (lời mời & vào phòng):
 * - `u_host` host `r_ok` "Lô tô Tết nhà Ngoại" (còn hạn, 1 người); `r_late`, `r_closed`, `r_full`, `r_block` cũng
 *   của `u_host` nhưng không ai là thành viên (không ghi đè `current_room_id`).
 * - `u_khoa` bị chặn khỏi `r_block` (AC-10); `u_lan` đang ở `r_other` còn hạn (AC-11); `u_minh` chưa ở phòng.
 * Mã mời đủ 22 ký tự base62, `join_code` theo bảng ký tự BR-30.
 */
export async function t004(): Promise<void> {
  const now = Date.now();

  await person({ uid: "u_host", email: "host@example.com", name: "An Nguyễn", currentRoomId: "r_ok" });
  await person({ uid: "u_khoa", email: "khoa@example.com", name: "Khoa", currentRoomId: null });
  await person({ uid: "u_lan", email: "lan@example.com", name: "Lan", currentRoomId: "r_other" });
  await person({ uid: "u_minh", email: "minh@example.com", name: "Minh", currentRoomId: null });

  await seedRoom({
    roomId: "r_ok",
    hostUid: "u_host",
    name: "Lô tô Tết nhà Ngoại",
    joinCode: "TET234",
    inviteCode: "OKOKOKOKOKOKOKOKOKOKOK",
    rngSeed: 11,
  });
  // Hết hạn 1 phút trước nhưng vẫn `active`, ván `waiting` → joinRoom đóng lười (AC-7).
  const lateExpires = new Date(now - MINUTE_MS);
  await seedRoom({
    roomId: "r_late",
    hostUid: "u_host",
    members: [],
    memberCount: 1,
    name: "Phòng quá hạn",
    joinCode: "LATE22",
    inviteCode: "LATELATELATELATELATE00",
    createdAt: new Date(lateExpires.getTime() - 8 * HOUR_MS),
    expiresAt: lateExpires,
    rngSeed: 12,
  });
  await seedRoom({
    roomId: "r_closed",
    hostUid: "u_host",
    members: [],
    name: "Phòng đã đóng",
    joinCode: "CLSD22",
    inviteCode: "CLOSEDCLOSEDCLOSED0000",
    roomStatus: "closed",
    gameStatus: "cancelled",
    rngSeed: 13,
  });
  await seedRoom({
    roomId: "r_full",
    hostUid: "u_host",
    members: [],
    memberCount: 16,
    name: "Phòng đã đầy",
    joinCode: "FULL22",
    inviteCode: "FULLFULLFULLFULLFULL00",
    rngSeed: 14,
  });
  await seedRoom({
    roomId: "r_block",
    hostUid: "u_host",
    members: [],
    memberCount: 3,
    blockedUids: ["u_khoa"],
    name: "Phòng chặn Khoa",
    joinCode: "BLCK22",
    inviteCode: "BLOCKBLOCKBLOCKBLOCK00",
    rngSeed: 15,
  });
  await seedRoom({
    roomId: "r_other",
    hostUid: "u_lan",
    name: "Phòng của Lan",
    joinCode: "LAN234",
    inviteCode: "LANOTHERROOMINVITE0000",
    rngSeed: 16,
  });

  const base = "http://localhost:3000/join";
  console.log("URL lời mời:");
  for (const [room, code] of [
    ["r_ok (hợp lệ)", "OKOKOKOKOKOKOKOKOKOKOK"],
    ["r_late (quá hạn)", "LATELATELATELATELATE00"],
    ["r_closed (đã đóng)", "CLOSEDCLOSEDCLOSED0000"],
    ["r_full (đầy)", "FULLFULLFULLFULLFULL00"],
    ["r_block (chặn u_khoa)", "BLOCKBLOCKBLOCKBLOCK00"],
  ] as const) {
    console.log(`  ${room}: ${base}/${code}`);
  }
}
