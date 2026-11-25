import "server-only";

import { Timestamp, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { expireAtFrom } from "@/core/db/ttl";
import { firestore } from "@/core/db/firestore";
import type { GameDoc } from "./game.doc";
import type { PendingCallDoc } from "./room.doc";
import { claimToDoc, finishedGamePatch, resultOfClaims, type ClaimRecord } from "./game.mapper";
import { setRoomCalledNumbersInTx, setRoomGameInTx, type RoomEvent } from "./room.repository";

const ROOMS = "rooms";
const GAMES = "games";

function gameRef(roomId: string, gameId: string): DocumentReference<GameDoc> {
  return firestore().collection(ROOMS).doc(roomId).collection(GAMES).doc(gameId) as DocumentReference<GameDoc>;
}

/** Cấp trước auto-id cho ván mới (chưa ghi gì). */
export function newGameId(roomId: string): string {
  return firestore().collection(ROOMS).doc(roomId).collection(GAMES).doc().id;
}

/** Ván `waiting` → `running`: `player_count`, `started_at`, `next_call_at`. Số đầu do `setRoomCalledNumbersInTx` ghi. */
export function startGameInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  game: { playerCount: number; nextCallAt: Date; now: Date },
): void {
  const patch: Partial<GameDoc> = {
    status: "running",
    player_count: game.playerCount,
    started_at: Timestamp.fromDate(game.now),
    next_call_at: Timestamp.fromDate(game.nextCallAt),
    pause_reason: null,
  };
  tx.update(gameRef(roomId, gameId), patch);
}

/** `running` → `paused` do host: `pause_reason = host`, `next_call_at = null` (BR-16). */
export function setGamePausedInTx(tx: Transaction, roomId: string, gameId: string): void {
  const patch: Partial<GameDoc> = { status: "paused", pause_reason: "host", next_call_at: null };
  tx.update(gameRef(roomId, gameId), patch);
}

/** `paused` → `running`: bỏ `pause_reason`, đặt `next_call_at`. */
export function setGameRunningInTx(tx: Transaction, roomId: string, gameId: string, nextCallAt: Date): void {
  const patch: Partial<GameDoc> = { status: "running", pause_reason: null, next_call_at: Timestamp.fromDate(nextCallAt) };
  tx.update(gameRef(roomId, gameId), patch);
}

/** Hiện số chờ + chọn số chờ mới: `rooms.called_numbers`, `rooms.pending_call` + `games.next_call_at` (null khi đã đủ 90 số). */
export function appendDrawInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  draw: { calledNumbers: readonly number[]; nextCallAt: Date | null; now: Date; pendingCall: PendingCallDoc | null },
): void {
  setRoomCalledNumbersInTx(tx, roomId, draw.calledNumbers, draw.now, undefined, draw.pendingCall);
  const patch: Partial<GameDoc> = { next_call_at: draw.nextCallAt ? Timestamp.fromDate(draw.nextCallAt) : null };
  tx.update(gameRef(roomId, gameId), patch);
}

/**
 * Ván → `finished` (hết 90 số: `no_winner`; hoặc kết thúc tự động theo `claims` khi hết hạn). Không đụng phòng.
 */
export function finishGameInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  claims: readonly ClaimRecord[],
  now: Date,
): void {
  tx.update(gameRef(roomId, gameId), finishedGamePatch(resultOfClaims(claims), now));
}

/**
 * Thêm một lượt KINH vào `claims` (ghi mảng đầy đủ — `existing` đã đọc trong transaction).
 * `enterAwaiting` có giá trị → ván sang `awaiting_confirm`, nhớ `resume_status`, dừng quay (`next_call_at = null`, `pause_reason = null`).
 */
export function appendClaimInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  existing: readonly ClaimRecord[],
  claim: ClaimRecord,
  enterAwaiting: { resumeStatus: "running" | "paused" } | null,
): void {
  const patch: Partial<GameDoc> = { claims: [...existing, claim].map(claimToDoc) };
  if (enterAwaiting) {
    patch.status = "awaiting_confirm";
    patch.resume_status = enterAwaiting.resumeStatus;
    patch.next_call_at = null;
    patch.pause_reason = null;
  }
  tx.update(gameRef(roomId, gameId), patch);
}

export type NextGame = { gameId: string; seqNo: number; roomCreatedAt: Date; now: Date };

/**
 * Tạo ván kế `waiting` (BR-07) và trỏ phòng sang ván đó (`current_game_id`, `game_count`, `last_event`).
 * `called_numbers` của phòng giữ nguyên tới lần Bắt đầu kế tiếp (TBL-02).
 */
export function createNextGameInTx(tx: Transaction, roomId: string, next: NextGame, event: RoomEvent): void {
  const at = Timestamp.fromDate(next.now);
  const doc: GameDoc = {
    seq_no: next.seqNo,
    status: "waiting",
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
    expire_at: Timestamp.fromDate(expireAtFrom(next.roomCreatedAt)),
  };
  tx.create(gameRef(roomId, next.gameId), doc);
  setRoomGameInTx(tx, roomId, { gameId: next.gameId, gameCount: next.seqNo }, event);
}

/**
 * confirmGame (BR-28): ván `awaiting_confirm` → `finished`/`won`; `winners` = lượt `win`, `confirmed_by`, `ended_at`.
 * Không đụng phòng (người gọi tạo ván mới hoặc đóng phòng).
 */
export function confirmGameInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  claims: readonly ClaimRecord[],
  confirmedBy: string,
  now: Date,
): void {
  const patch: Partial<GameDoc> = { ...finishedGamePatch(resultOfClaims(claims), now), confirmed_by: confirmedBy };
  tx.update(gameRef(roomId, gameId), patch);
}

/**
 * rejectClaims (BR-28, Q-055): `claims = []`, ván về `resume_status`; `running` → `next_call_at`, `paused` →
 * `pause_reason = host`. `resume_status = null`.
 */
export function rejectClaimsInTx(
  tx: Transaction,
  roomId: string,
  gameId: string,
  resume: { status: "running"; nextCallAt: Date } | { status: "paused" },
): void {
  const patch: Partial<GameDoc> = {
    claims: [],
    resume_status: null,
    status: resume.status,
    next_call_at: resume.status === "running" ? Timestamp.fromDate(resume.nextCallAt) : null,
    pause_reason: resume.status === "paused" ? "host" : null,
  };
  tx.update(gameRef(roomId, gameId), patch);
}
