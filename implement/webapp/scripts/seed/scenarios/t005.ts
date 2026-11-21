import { seedRoom } from "../lib/seed-room";
import { seedUser } from "../lib/seed-user";
import { seedUserDoc } from "../lib/seed-user-doc";

const H = { uid: "u_tk_h", email: "h@example.com", name: "Host H" };
const B = { uid: "u_tk_b", email: "b@example.com", name: "Bình B" };
const C = { uid: "u_tk_c", email: "c@example.com", name: "Cúc C" };

async function person(p: typeof H, currentRoomId: string | null): Promise<void> {
  await seedUser({ uid: p.uid, email: p.email, name: p.name });
  await seedUserDoc({
    uid: p.uid,
    email: p.email,
    googleName: p.name,
    displayName: p.name,
    profileCustomized: false,
    currentRoomId,
  });
}

function report(scenario: string, roomId: string, note: string): void {
  console.log(`[${scenario}] roomId=${roomId} (${note})`);
  for (const [role, p] of [["H (host)", H], ["B", B], ["C", C]] as const) {
    console.log(`  ${role}: uid=${p.uid} email=${p.email}`);
  }
}

/**
 * T-005 `tickets-basic` (alias `t005`): phòng `active`, ván 1 `waiting`, H (host) + B + C là thành viên
 * (có `presence_access` và node presence online), chưa ai giữ vé.
 */
export async function ticketsBasic(): Promise<void> {
  const roomId = "r_tk_basic";
  await person(H, roomId);
  await person(B, roomId);
  await person(C, roomId);
  await seedRoom({
    roomId,
    hostUid: H.uid,
    members: [H.uid, B.uid, C.uid],
    name: "Phòng chọn vé",
    joinCode: "TKB234",
    inviteCode: "TICKETBASICINVITE00000",
    rngSeed: 51,
    players: [],
    presence: { [H.uid]: true, [B.uid]: true, [C.uid]: true },
  });
  report("tickets-basic", roomId, "ván 1 waiting, chưa ai giữ vé");
}

/**
 * T-005 `tickets-running`: như basic nhưng ván `running`, B giữ `red_a`, C giữ `blue_b`;
 * C đã rời phòng (không còn `current_room_id`, `presence_access`, node presence) — kiểm khóa và "Khóa tới hết ván".
 */
export async function ticketsRunning(): Promise<void> {
  const roomId = "r_tk_run";
  await person(H, roomId);
  await person(B, roomId);
  await person(C, null);
  await seedRoom({
    roomId,
    hostUid: H.uid,
    members: [H.uid, B.uid],
    memberCount: 2,
    name: "Phòng chọn vé (đang chạy)",
    joinCode: "TKR234",
    inviteCode: "TICKETRUNNINGINVITE000",
    gameStatus: "running",
    rngSeed: 52,
    players: [
      { uid: B.uid, displayName: B.name, ticketIds: ["red_a"] },
      { uid: C.uid, displayName: C.name, ticketIds: ["blue_b"] },
    ],
    presence: { [H.uid]: true, [B.uid]: true },
  });
  report("tickets-running", roomId, "ván running; B giữ red_a; C (đã rời, không có presence) giữ blue_b");
}

/**
 * T-005 `tickets-carry`: ván 2 `waiting`, B đã có `ticket_ids: [green_a]` (giả lập chép từ ván 1, BR-11).
 */
export async function ticketsCarry(): Promise<void> {
  const roomId = "r_tk_carry";
  await person(H, roomId);
  await person(B, roomId);
  await person(C, roomId);
  await seedRoom({
    roomId,
    hostUid: H.uid,
    members: [H.uid, B.uid, C.uid],
    name: "Phòng chọn vé (ván 2)",
    joinCode: "TKC234",
    inviteCode: "TICKETCARRYINVITE00000",
    gameSeqNo: 2,
    rngSeed: 53,
    players: [{ uid: B.uid, displayName: B.name, ticketIds: ["green_a"] }],
    presence: { [H.uid]: true, [B.uid]: true, [C.uid]: true },
  });
  report("tickets-carry", roomId, "ván 2 waiting; B giữ green_a");
}
