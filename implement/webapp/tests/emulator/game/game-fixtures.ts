/** Fixture chung cho test emulator của feature game: dựa trên ticket-fixtures (phòng r1, ván g1, H/B/C/X). */
import { Timestamp } from "firebase-admin/firestore";
import { db, NOW } from "../invite/invite-fixtures";
import { GAME, ROOM } from "../ticket/ticket-fixtures";

export { GAME, ROOM, NOW };
export const SEC = 1000;

/** Gộp field vào `rooms/r1/games/g1` (VD `status`, `claims`, `next_call_at`). */
export async function patchGame(fields: Record<string, unknown>): Promise<void> {
  await db.doc(`rooms/${ROOM}/games/${GAME}`).update(fields);
}

/** Gộp field vào `rooms/r1` (VD `called_numbers`). */
export async function patchRoom(fields: Record<string, unknown>): Promise<void> {
  await db.doc(`rooms/${ROOM}`).update(fields);
}

export const ts = (d: Date) => Timestamp.fromDate(d);

export const roomDoc = async () => (await db.doc(`rooms/${ROOM}`).get()).data();
export const gameDoc = async () => (await db.doc(`rooms/${ROOM}/games/${GAME}`).get()).data();
export const userDoc = async (uid: string) => (await db.doc(`users/${uid}`).get()).data();
