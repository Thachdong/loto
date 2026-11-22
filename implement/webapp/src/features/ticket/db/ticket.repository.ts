import "server-only";

import {
  FieldValue,
  Timestamp,
  type CollectionReference,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";
import { expireAtFrom } from "@/core/db/ttl";
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

/** Xóa nhiều player của ván (startGame: người rỗng/đã rời; leaveRoom ván `waiting`). */
export function deletePlayersInTx(tx: Transaction, roomId: string, gameId: string, uids: readonly string[]): void {
  for (const uid of uids) tx.delete(playerRef(roomId, gameId, uid));
}

/** Hồ sơ hiện tại của một user theo `users/{uid}` (chỉ field startGame cần). */
export type PlayerStatus = { currentRoomId: string | null; displayName: string; photoUrl: string | null };

/**
 * `users/{uid}` của các player đọc một lượt (`getAll`, trong transaction): `current_room_id`, tên, ảnh hiện tại.
 * uid không có doc → không có key.
 */
export async function getPlayerStatusInTx(
  tx: Transaction,
  uids: readonly string[],
): Promise<Record<string, PlayerStatus>> {
  if (uids.length === 0) return {};
  const snaps = await tx.getAll(...uids.map((uid) => firestore().collection("users").doc(uid)));
  const out: Record<string, PlayerStatus> = {};
  for (const snap of snaps) {
    const data = snap.data();
    if (!data) continue;
    out[snap.id] = {
      currentRoomId: (data.current_room_id as string | null | undefined) ?? null,
      displayName: data.display_name as string,
      photoUrl: (data.photo_url as string | null | undefined) ?? null,
    };
  }
  return out;
}

/** Cập nhật tên/ảnh hiển thị đã chép vào player (startGame, Q-047). */
export function updatePlayerProfilesInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  profiles: readonly { uid: string; displayName: string; photoUrl: string | null }[],
): void {
  for (const p of profiles) {
    tx.update(playerRef(roomId, gameId, p.uid), { display_name: p.displayName, photo_url: p.photoUrl });
  }
}

/** Chép player (vé, tên, ảnh) sang ván mới (BR-11): `joined_at = now`, `expire_at` theo phòng. */
export function copyPlayersInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  players: readonly PlayerRecord[],
  roomCreatedAt: Date,
  now: Date,
): void {
  const expireAt = Timestamp.fromDate(expireAtFrom(roomCreatedAt));
  for (const p of players) {
    const doc: PlayerDoc = {
      display_name: p.displayName,
      photo_url: p.photoUrl,
      ticket_ids: [...p.ticketIds],
      joined_at: Timestamp.fromDate(now),
      expire_at: expireAt,
    };
    tx.create(playerRef(roomId, gameId, p.uid), doc);
  }
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
