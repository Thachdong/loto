import "server-only";

import { Timestamp, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { firestore, rtdb } from "@/core/db/firestore";
import type { RoomStatus } from "@/features/room/shared/types";
import type { GameDoc } from "./game.doc";
import type { LastEventDoc, RoomDoc } from "./room.doc";
import { gameFromDoc, newRoomDocs, roomFromDoc, type GameRecord, type NewRoom, type RoomRecord } from "./room.mapper";
import type { TicketDoc } from "./ticket.doc";

const ROOMS = "rooms";
const GAMES = "games";
const TICKETS = "tickets";
/** RTDB (TBL-08, ADR-06). */
const PRESENCE = "presence";
const PRESENCE_ACCESS = "presence_access";

/** Phòng còn mở — `join_code` phải duy nhất trong nhóm này (BR-30). */
const OPEN_STATUSES: readonly RoomStatus[] = ["active", "closing"];

function roomRef(roomId: string): DocumentReference<RoomDoc> {
  return firestore().collection(ROOMS).doc(roomId) as DocumentReference<RoomDoc>;
}

function gameRef(roomId: string, gameId: string): DocumentReference<GameDoc> {
  return roomRef(roomId).collection(GAMES).doc(gameId) as DocumentReference<GameDoc>;
}

function ticketRef(roomId: string, ticketId: string): DocumentReference<TicketDoc> {
  return roomRef(roomId).collection(TICKETS).doc(ticketId) as DocumentReference<TicketDoc>;
}

/** Cấp trước auto-id cho phòng + ván 1 (chưa ghi gì). */
export function newRoomIds(): { roomId: string; gameId: string } {
  const room = firestore().collection(ROOMS).doc();
  return { roomId: room.id, gameId: room.collection(GAMES).doc().id };
}

export async function getRoomInTx(tx: Transaction, roomId: string): Promise<RoomRecord | null> {
  const data = (await tx.get(roomRef(roomId))).data();
  return data ? roomFromDoc(roomId, data) : null;
}

export async function getGameInTx(tx: Transaction, roomId: string, gameId: string): Promise<GameRecord | null> {
  const data = (await tx.get(gameRef(roomId, gameId))).data();
  return data ? gameFromDoc(gameId, data) : null;
}

/**
 * id phòng `active`/`closing` đang giữ `join_code`, hoặc null. Query single-field `join_code ==`
 * (index tự có), lọc trạng thái trong bộ nhớ để không cần index composite.
 */
export async function findOpenRoomByJoinCodeInTx(tx: Transaction, joinCode: string): Promise<string | null> {
  const snap = await tx.get(firestore().collection(ROOMS).where("join_code", "==", joinCode));
  const open = snap.docs.find((d) => OPEN_STATUSES.includes((d.data() as RoomDoc).status));
  return open?.id ?? null;
}

/** Ghi `rooms/{id}`, `games/{gameId}` (ván 1) và 16 `tickets/*` trong transaction. */
export function createRoomInTx(tx: Transaction, room: NewRoom): void {
  const docs = newRoomDocs(room);
  tx.create(roomRef(room.id), docs.room);
  tx.create(gameRef(room.id, room.gameId), docs.game);
  for (const ticket of docs.tickets) tx.create(ticketRef(room.id, ticket.id), ticket.doc);
}

function roomEvent(type: string, at: Timestamp): LastEventDoc {
  return { type, text: null, actor_uid: null, target_uid: null, at };
}

/** Ván → `cancelled` (`result = cancelled`, `ended_at`). */
export function cancelGameInTx(tx: Transaction, roomId: string, gameId: string, now: Date): void {
  const patch: Partial<GameDoc> = { status: "cancelled", result: "cancelled", ended_at: Timestamp.fromDate(now) };
  tx.update(gameRef(roomId, gameId), patch);
}

/** Phòng → `closed` vì hết hạn (BR-04): `close_reason = expired`, `member_count = 0`, `last_event = room_closed`. */
export function closeRoomExpiredInTx(tx: Transaction, roomId: string, now: Date): void {
  const at = Timestamp.fromDate(now);
  const patch: Partial<RoomDoc> = {
    status: "closed",
    close_reason: "expired",
    closed_at: at,
    member_count: 0,
    last_event: roomEvent("room_closed", at),
    updated_at: at,
  };
  tx.update(roomRef(roomId), patch);
}

/** Phòng → `closing` (đến hạn khi ván đang diễn ra), `last_event = room_closing`. */
export function markRoomClosingInTx(tx: Transaction, roomId: string, now: Date): void {
  const at = Timestamp.fromDate(now);
  const patch: Partial<RoomDoc> = { status: "closing", last_event: roomEvent("room_closing", at), updated_at: at };
  tx.update(roomRef(roomId), patch);
}

/** RTDB `presence_access/{roomId}/{uid} = true` — cho phép client ghi presence (ADR-06). */
export async function setPresenceAccess(roomId: string, uid: string): Promise<void> {
  await rtdb().ref(`${PRESENCE_ACCESS}/${roomId}/${uid}`).set(true);
}

/** Xóa RTDB `presence/{roomId}` và `presence_access/{roomId}` khi phòng đóng. */
export async function removeRoomPresence(roomId: string): Promise<void> {
  await rtdb()
    .ref()
    .update({ [`${PRESENCE}/${roomId}`]: null, [`${PRESENCE_ACCESS}/${roomId}`]: null });
}

/** Chạy transaction Firestore (service không gọi `firestore()` trực tiếp). Tự retry khi xung đột. */
export function runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return firestore().runTransaction(fn);
}
