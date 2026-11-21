import { Timestamp } from "firebase-admin/firestore";
import { generateTicketSet, seededRng } from "@/features/room/shared/domain/generate-ticket-set";
import type { CloseReason, GameStatus, RoomStatus } from "@/features/room/shared/types";
import { seedDatabase, seedFirestore } from "./admin";

const HOUR_MS = 60 * 60 * 1000;
const RETENTION_MS = 31 * 24 * HOUR_MS;

export type SeedRoom = {
  roomId: string;
  hostUid: string;
  /** Mọi thành viên (gồm host). Mặc định chỉ host. */
  members?: string[];
  name: string;
  /** Mặc định: bây giờ. */
  createdAt?: Date;
  /** Mặc định: createdAt + 8 giờ (BR-04). */
  expiresAt?: Date;
  gameStatus?: GameStatus;
  roomStatus?: RoomStatus;
  /** `join_code` 6 ký tự (BR-30). */
  joinCode: string;
  /** `invite_code` 22 ký tự base62 (ADR-09). */
  inviteCode: string;
  /** Mặc định `${roomId}_g1`. */
  gameId?: string;
  rngSeed?: number;
  /** Ghi đè `member_count` (mặc định: số thành viên; 0 khi phòng closed). */
  memberCount?: number;
  /** `blocked_uids` (BR-06). Mặc định rỗng. */
  blockedUids?: string[];
  /** `close_reason` (chỉ có nghĩa khi phòng closed). Mặc định `expired` cho phòng closed. */
  closeReason?: CloseReason;
};

/**
 * Ghi phòng đủ field TBL-02 + ván 1 (TBL-05) + 16 vé (TBL-03, `generateTicketSet(seededRng)`),
 * `users.current_room_id` của thành viên và RTDB `presence_access`. Doc `users/*` phải seed trước.
 * Dùng lại cho T-004..T-007. Idempotent (set ghi đè).
 */
export async function seedRoom(opts: SeedRoom): Promise<{ gameId: string }> {
  const db = seedFirestore();
  const members = opts.members ?? [opts.hostUid];
  const createdAt = opts.createdAt ?? new Date();
  const expiresAt = opts.expiresAt ?? new Date(createdAt.getTime() + 8 * HOUR_MS);
  const gameId = opts.gameId ?? `${opts.roomId}_g1`;
  const status = opts.roomStatus ?? "active";
  const at = Timestamp.fromDate(createdAt);
  const expireAt = Timestamp.fromMillis(createdAt.getTime() + RETENTION_MS);
  const expires = Timestamp.fromDate(expiresAt);
  const roomPath = `rooms/${opts.roomId}`;

  const batch = db.batch();
  batch.set(db.doc(roomPath), {
    name: opts.name,
    host_uid: opts.hostUid,
    status,
    member_count: opts.memberCount ?? (status === "closed" ? 0 : members.length),
    blocked_uids: opts.blockedUids ?? [],
    invite_code: opts.inviteCode,
    join_code: opts.joinCode,
    invite_expires_at: expires,
    expires_at: expires,
    draw_interval_sec: 5,
    called_numbers: [],
    current_game_id: gameId,
    game_count: 1,
    ticket_set_no: 1,
    last_event: null,
    created_by: opts.hostUid,
    created_at: at,
    updated_at: at,
    closed_at: status === "closed" ? at : null,
    close_reason: status === "closed" ? (opts.closeReason ?? "expired") : null,
    expire_at: expireAt,
  });
  batch.set(db.doc(`${roomPath}/games/${gameId}`), {
    seq_no: 1,
    status: opts.gameStatus ?? "waiting",
    pause_reason: null,
    next_call_at: null,
    claims: [],
    resume_status: null,
    winners: [],
    result: null,
    player_count: 0,
    started_at: null,
    ended_at: null,
    confirmed_by: null,
    created_at: at,
    expire_at: expireAt,
  });
  for (const ticket of generateTicketSet(seededRng(opts.rngSeed ?? 1))) {
    batch.set(db.doc(`${roomPath}/tickets/${ticket.id}`), {
      color: ticket.color,
      side: ticket.side,
      grid: ticket.grid,
      set_no: 1,
      updated_at: at,
      expire_at: expireAt,
    });
  }
  if (status !== "closed") {
    for (const uid of members) batch.update(db.doc(`users/${uid}`), { current_room_id: opts.roomId });
  }
  await batch.commit();

  if (status !== "closed") {
    const access = Object.fromEntries(members.map((uid) => [uid, true]));
    await seedDatabase().ref(`presence_access/${opts.roomId}`).set(access);
  }
  return { gameId };
}
