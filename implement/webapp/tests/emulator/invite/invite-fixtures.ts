/** Fixture chung cho test emulator của feature invite (phòng thô + hằng số). */
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/core/server/firebase-admin";

export const db = getFirestore(getAdminApp());
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const NOW = new Date("2026-11-21T03:00:00.000Z");

export const INVITE = "OKOKOKOKOKOKOKOKOKOKOK";
export const JOIN = "TET234";

export type RoomOpts = {
  hostUid?: string;
  status?: string;
  memberCount?: number;
  blockedUids?: string[];
  expiresAt?: Date;
  inviteExpiresAt?: Date;
  gameStatus?: string;
  inviteCode?: string;
  joinCode?: string;
  name?: string;
};

export const data = async (path: string) => (await db.doc(path).get()).data();
export const millis = (v: unknown) => (v as Timestamp).toMillis();

/** Phòng đủ field TBL-02 + ván g1; mặc định active, còn 8 giờ, 1 người. */
export async function writeRoom(roomId: string, opts: RoomOpts = {}): Promise<void> {
  const expiresAt = opts.expiresAt ?? new Date(NOW.getTime() + 8 * HOUR);
  const at = Timestamp.fromMillis(expiresAt.getTime() - 8 * HOUR);
  await db.doc(`rooms/${roomId}`).set({
    name: opts.name ?? `Phòng ${roomId}`,
    host_uid: opts.hostUid ?? "u_host",
    status: opts.status ?? "active",
    member_count: opts.memberCount ?? 1,
    blocked_uids: opts.blockedUids ?? [],
    invite_code: opts.inviteCode ?? INVITE,
    join_code: opts.joinCode ?? JOIN,
    invite_expires_at: Timestamp.fromDate(opts.inviteExpiresAt ?? expiresAt),
    expires_at: Timestamp.fromDate(expiresAt),
    draw_interval_sec: 5,
    called_numbers: [],
    current_game_id: "g1",
    game_count: 1,
    ticket_set_no: 1,
    last_event: null,
    created_by: opts.hostUid ?? "u_host",
    created_at: at,
    updated_at: at,
    closed_at: null,
    close_reason: null,
    expire_at: Timestamp.fromMillis(at.toMillis() + 31 * DAY),
  });
  await db.doc(`rooms/${roomId}/games/g1`).set({ seq_no: 1, status: opts.gameStatus ?? "waiting", claims: [] });
}
