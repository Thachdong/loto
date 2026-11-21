/** Fixture chung cho test emulator của feature ticket: phòng r1 + 16 vé + 3 người (H host, B, C). */
import { Timestamp } from "firebase-admin/firestore";
import { rtdb } from "@/core/db/firestore";
import { generateTicketSet, seededRng } from "@/features/room/shared/domain/generate-ticket-set";
import { clearFirestoreAndAuth, createCookieStore } from "../auth/google-token";
import { db, NOW, writeRoom, type RoomOpts } from "../invite/invite-fixtures";
import { attachSession, createSignedInUser, type SignedInUser } from "../room/session-cookie";

export const ROOM = "r1";
export const GAME = "g1";

export type Cast = { H: SignedInUser; B: SignedInUser; C: SignedInUser; X: SignedInUser };

export async function resetAll(): Promise<void> {
  await clearFirestoreAndAuth();
  await rtdb().ref().remove();
}

export const players = (roomId = ROOM) => db.collection(`rooms/${roomId}/games/${GAME}/players`);
export const playerIds = async (uid: string) => (await players().doc(uid).get()).data()?.ticket_ids as string[] | undefined;

/** Người chơi: H (host), B, C là thành viên phòng r1; X không ở phòng nào. */
export async function createCast(): Promise<Cast> {
  const H = await createSignedInUser({ email: "h@example.com", name: "Host H", currentRoomId: ROOM });
  const B = await createSignedInUser({ email: "b@example.com", name: "Bình B", currentRoomId: ROOM });
  const C = await createSignedInUser({ email: "c@example.com", name: "Cúc C", currentRoomId: ROOM });
  const X = await createSignedInUser({ email: "x@example.com", name: "Xuân X", currentRoomId: null });
  return { H, B, C, X };
}

/** Phòng r1 (host = H) + ván g1 + 16 vé `set_no = 1` với lưới thật. */
export async function writeTicketRoom(host: SignedInUser, opts: RoomOpts = {}): Promise<void> {
  await writeRoom(ROOM, { hostUid: host.uid, memberCount: 3, ...opts });
  const at = Timestamp.fromDate(NOW);
  for (const ticket of generateTicketSet(seededRng(7))) {
    await db.doc(`rooms/${ROOM}/tickets/${ticket.id}`).set({
      color: ticket.color,
      side: ticket.side,
      grid: ticket.grid,
      set_no: 1,
      updated_at: at,
      expire_at: at,
    });
  }
}

export async function writePlayer(uid: string, displayName: string, ticketIds: string[]): Promise<void> {
  const at = Timestamp.fromDate(NOW);
  await players()
    .doc(uid)
    .set({ display_name: displayName, photo_url: null, ticket_ids: ticketIds, joined_at: at, expire_at: at });
}

export async function writePresence(uid: string, online: boolean): Promise<void> {
  await rtdb().ref(`presence/${ROOM}/${uid}`).set({ online, display_name: uid, photo_url: null, at: NOW.getTime() });
}

export function signInAs(store: ReturnType<typeof createCookieStore>, user: SignedInUser): void {
  attachSession(store, user);
}

export const snapshotCollection = async (path: string) =>
  Object.fromEntries((await db.collection(path).get()).docs.map((d) => [d.id, d.data()]));
