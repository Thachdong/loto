import "server-only";

import {
  FieldValue,
  Timestamp,
  type CollectionReference,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";
import { firestore, rtdb } from "@/core/db/firestore";
import type { Ticket, TicketId } from "@/features/room/shared/types";
import type { PlayerDoc, PresenceNode } from "./player.doc";
import { newPlayerDoc, playerFromDoc, type NewPlayer, type PlayerRecord } from "./player.mapper";

const ROOMS = "rooms";
const GAMES = "games";
const PLAYERS = "players";
const TICKETS = "tickets";
/** RTDB (TBL-08, ADR-06). */
const PRESENCE = "presence";

function playersRef(roomId: string, gameId: string): CollectionReference<PlayerDoc> {
  return firestore()
    .collection(ROOMS)
    .doc(roomId)
    .collection(GAMES)
    .doc(gameId)
    .collection(PLAYERS) as CollectionReference<PlayerDoc>;
}

function playerRef(roomId: string, gameId: string, uid: string): DocumentReference<PlayerDoc> {
  return playersRef(roomId, gameId).doc(uid);
}

function ticketRef(roomId: string, ticketId: string): DocumentReference {
  return firestore().collection(ROOMS).doc(roomId).collection(TICKETS).doc(ticketId);
}

/** Doc vé `rooms/{roomId}/tickets/{ticketId}` có tồn tại không (đọc trong transaction). */
export async function getTicketExistsInTx(tx: Transaction, roomId: string, ticketId: TicketId): Promise<boolean> {
  return (await tx.get(ticketRef(roomId, ticketId))).exists;
}

/**
 * Toàn bộ player của ván (≤ 16 doc, BR-03) đọc trong transaction. Đọc cả collection (không phải query
 * `array-contains`) để hai transaction cùng lấy một vé xung đột nhau: người commit sau bị retry và thấy vé đã có chủ.
 */
export async function listPlayersInTx(tx: Transaction, roomId: string, gameId: string): Promise<PlayerRecord[]> {
  const snap = await tx.get(playersRef(roomId, gameId));
  return snap.docs.map((d) => playerFromDoc(d.id, d.data()));
}

export async function getPlayerInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  uid: string,
): Promise<PlayerRecord | null> {
  const data = (await tx.get(playerRef(roomId, gameId, uid))).data();
  return data ? playerFromDoc(uid, data) : null;
}

/**
 * Thêm vé cho player: chưa có doc (`exists = false`) → tạo (BR-09, `joined_at`, `expire_at`);
 * đã có → `arrayUnion`.
 */
export function upsertPlayerTicketInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  uid: string,
  player: NewPlayer,
  exists: boolean,
): void {
  const ref = playerRef(roomId, gameId, uid);
  if (exists) tx.update(ref, { ticket_ids: FieldValue.arrayUnion(player.ticketId) });
  else tx.create(ref, newPlayerDoc(player));
}

/** Bỏ một vé khỏi `ticket_ids` — giữ doc (kể cả `[]`, Q-047). */
export function removeTicketFromPlayerInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  uid: string,
  ticketId: TicketId,
): void {
  tx.update(playerRef(roomId, gameId, uid), { ticket_ids: FieldValue.arrayRemove(ticketId) });
}

export function deletePlayerInTx(tx: Transaction, roomId: string, gameId: string, uid: string): void {
  tx.delete(playerRef(roomId, gameId, uid));
}

/** Ghi đè `grid`, `set_no`, `updated_at` của các vé (tạo bộ vé mới, FLOW-04). */
export function overwriteTicketGridsInTx(
  tx: Transaction,
  roomId: string,
  tickets: readonly Ticket[],
  setNo: number,
  now: Date,
): void {
  const at = Timestamp.fromDate(now);
  for (const ticket of tickets) {
    tx.update(ticketRef(roomId, ticket.id), { grid: ticket.grid, set_no: setNo, updated_at: at });
  }
}

/** RTDB `presence/{roomId}` một lần: uid → `online === true` (node thiếu = không có key). */
export async function readRoomPresence(roomId: string): Promise<Record<string, boolean>> {
  const snap = await rtdb().ref(`${PRESENCE}/${roomId}`).get();
  const nodes = (snap.val() ?? {}) as Record<string, PresenceNode>;
  return Object.fromEntries(Object.entries(nodes).map(([uid, node]) => [uid, node?.online === true]));
}

/** RTDB `presence/{roomId}/{uid}.online` — `false` khi không có node. */
export async function readPresenceOnline(roomId: string, uid: string): Promise<boolean> {
  const snap = await rtdb().ref(`${PRESENCE}/${roomId}/${uid}`).get();
  return ((snap.val() ?? null) as PresenceNode | null)?.online === true;
}
