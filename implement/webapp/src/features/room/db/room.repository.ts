import "server-only";

import { Timestamp, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { firestore, rtdb } from "@/core/db/firestore";
import type { CloseReason, RoomStatus } from "@/features/room/shared/types";
import type { GameDoc, GameResult, WinnerDoc } from "./game.doc";
import { finishedGamePatch } from "./game.mapper";
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

/** Phòng theo `invite_code` (đọc thuần, không transaction) hoặc null. Query single-field, limit 1. */
export async function findRoomByInviteCode(inviteCode: string): Promise<RoomRecord | null> {
  const snap = await firestore().collection(ROOMS).where("invite_code", "==", inviteCode).limit(1).get();
  const doc = snap.docs[0];
  return doc ? roomFromDoc(doc.id, doc.data() as RoomDoc) : null;
}

/** Như `findRoomByInviteCode` nhưng đọc trong transaction (joinRoom). */
export async function findRoomByInviteCodeInTx(tx: Transaction, inviteCode: string): Promise<RoomRecord | null> {
  const snap = await tx.get(firestore().collection(ROOMS).where("invite_code", "==", inviteCode).limit(1));
  const doc = snap.docs[0];
  return doc ? roomFromDoc(doc.id, doc.data() as RoomDoc) : null;
}

/**
 * Phòng `active` đang giữ `join_code` (BR-30: duy nhất trong nhóm đang mở), hoặc null.
 * Query `join_code ==` (index tự có), lọc `status` trong bộ nhớ.
 */
export async function findActiveRoomByJoinCodeInTx(tx: Transaction, joinCode: string): Promise<RoomRecord | null> {
  const snap = await tx.get(firestore().collection(ROOMS).where("join_code", "==", joinCode));
  const doc = snap.docs.find((d) => (d.data() as RoomDoc).status === "active");
  return doc ? roomFromDoc(doc.id, doc.data() as RoomDoc) : null;
}

export type NewMember = { memberCount: number; uid: string; displayName: string; text: string; now: Date };

/** Thêm thành viên (BR-03): `member_count = memberCount + 1` (giá trị đã đọc trong tx), `last_event = member_joined`. */
export function addMemberInTx(tx: Transaction, roomId: string, member: NewMember): void {
  const at = Timestamp.fromDate(member.now);
  const patch: Partial<RoomDoc> = {
    member_count: member.memberCount + 1,
    last_event: { type: "member_joined", text: member.text, actor_uid: member.uid, target_uid: null, at },
    updated_at: at,
  };
  tx.update(roomRef(roomId), patch);
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

export type RoomEvent = { type: string; text: string | null; actorUid: string | null; targetUid: string | null; now: Date };

function eventDoc(event: RoomEvent, at: Timestamp): LastEventDoc {
  return { type: event.type, text: event.text, actor_uid: event.actorUid, target_uid: event.targetUid, at };
}

/** Chỉ ghi `last_event` (SUP-01), VD `tickets_reclaimed`. */
export function setRoomEventInTx(tx: Transaction, roomId: string, event: RoomEvent): void {
  const at = Timestamp.fromDate(event.now);
  const patch: Partial<RoomDoc> = { last_event: eventDoc(event, at), updated_at: at };
  tx.update(roomRef(roomId), patch);
}

/** Tạo bộ vé mới (FLOW-04): `ticket_set_no` = giá trị mới, `last_event = ticket_set_renewed`. */
export function renewTicketSetInRoomInTx(
  tx: Transaction,
  roomId: string,
  ticketSetNo: number,
  event: Omit<RoomEvent, "type" | "text" | "targetUid">,
): void {
  const at = Timestamp.fromDate(event.now);
  const patch: Partial<RoomDoc> = {
    ticket_set_no: ticketSetNo,
    last_event: eventDoc({ ...event, type: "ticket_set_renewed", text: null, targetUid: null }, at),
    updated_at: at,
  };
  tx.update(roomRef(roomId), patch);
}

/** Ván → `cancelled` (`result = cancelled`, `ended_at`). */
export function cancelGameInTx(tx: Transaction, roomId: string, gameId: string, now: Date): void {
  const patch: Partial<GameDoc> = { status: "cancelled", result: "cancelled", ended_at: Timestamp.fromDate(now) };
  tx.update(gameRef(roomId, gameId), patch);
}

export type CloseRoomOptions = {
  reason: CloseReason;
  now: Date;
  /** Người gây ra việc đóng (host rời) — null khi hệ thống (hết hạn). */
  actorUid?: string | null;
  /** `last_event.text` (server soạn), VD "Host đã đóng phòng". */
  text?: string | null;
};

/**
 * Phòng → `closed`: `close_reason`, `closed_at`, `member_count = 0`, `last_event = room_closed`.
 * Người gọi tự xóa `users.current_room_id` và RTDB.
 */
export function closeRoomInTx(tx: Transaction, roomId: string, options: CloseRoomOptions): void {
  const at = Timestamp.fromDate(options.now);
  const patch: Partial<RoomDoc> = {
    status: "closed",
    close_reason: options.reason,
    closed_at: at,
    member_count: 0,
    last_event: {
      type: "room_closed",
      text: options.text ?? null,
      actor_uid: options.actorUid ?? null,
      target_uid: null,
      at,
    },
    updated_at: at,
  };
  tx.update(roomRef(roomId), patch);
}

/** Phòng → `closed` vì hết hạn (BR-04). */
export function closeRoomExpiredInTx(tx: Transaction, roomId: string, now: Date): void {
  closeRoomInTx(tx, roomId, { reason: "expired", now });
}

/** Ván → `finished` (kết thúc tự động) rồi phòng → `closed`, trong cùng transaction. */
export function finishAndCloseInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  outcome: { result: GameResult; winners: WinnerDoc[] },
  options: CloseRoomOptions,
): void {
  tx.update(gameRef(roomId, gameId), finishedGamePatch(outcome, options.now));
  closeRoomInTx(tx, roomId, options);
}

/**
 * Ghi `rooms.called_numbers` (mảng đầy đủ sau khi rao) và tuỳ chọn `last_event`
 * (`game_started` ở startGame; `drawNumber` không đặt event).
 */
export function setRoomCalledNumbersInTx(
  tx: Transaction,
  roomId: string,
  calledNumbers: readonly number[],
  now: Date,
  event?: RoomEvent,
): void {
  const at = Timestamp.fromDate(now);
  const patch: Partial<RoomDoc> = { called_numbers: [...calledNumbers], updated_at: at };
  if (event) patch.last_event = eventDoc(event, at);
  tx.update(roomRef(roomId), patch);
}

/** Trỏ phòng sang ván mới (`current_game_id`, `game_count = seq_no`) kèm `last_event` (`game_finished`). */
export function setRoomGameInTx(
  tx: Transaction,
  roomId: string,
  game: { gameId: string; gameCount: number },
  event: RoomEvent,
): void {
  const at = Timestamp.fromDate(event.now);
  const patch: Partial<RoomDoc> = {
    current_game_id: game.gameId,
    game_count: game.gameCount,
    last_event: eventDoc(event, at),
    updated_at: at,
  };
  tx.update(roomRef(roomId), patch);
}

/** `member_count` mới + `last_event` (`member_left`): người rời không phải host. */
export function setRoomMemberLeftInTx(tx: Transaction, roomId: string, memberCount: number, event: RoomEvent): void {
  const at = Timestamp.fromDate(event.now);
  const patch: Partial<RoomDoc> = { member_count: memberCount, last_event: eventDoc(event, at), updated_at: at };
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
