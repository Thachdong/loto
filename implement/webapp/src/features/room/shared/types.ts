import type { TICKET_COLORS } from "./constants";

/** database.md › TBL-02 `status`. */
export type RoomStatus = "active" | "closing" | "closed";
/** database.md › TBL-05 `status` (Q-055: bỏ `claim_window`). */
export type GameStatus = "waiting" | "running" | "paused" | "awaiting_confirm" | "finished" | "cancelled";
/** database.md › TBL-02 `close_reason`. */
export type CloseReason = "expired" | "host_left";

export type TicketColor = (typeof TICKET_COLORS)[number];
export type TicketSide = "a" | "b";
export type TicketId = `${TicketColor}_${TicketSide}`;

/** Một vé (TBL-03): `grid` 81 phần tử theo hàng, 0 = ô trống (BR-08, ADR-14). */
export type Ticket = {
  id: TicketId;
  color: TicketColor;
  side: TicketSide;
  grid: number[];
};

/** api-contract › RoomCreated. */
export type RoomCreated = {
  roomId: string;
  name: string;
  inviteCode: string;
  /** `join_code` 6 ký tự (BR-30). */
  roomCode: string;
  inviteUrl: string;
  currentGameId: string;
  drawIntervalSec: number;
  /** ISO 8601, created_at + 8 giờ. */
  expiresAt: string;
};

/** Dữ liệu phòng client đọc qua listener `rooms/{id}` (chỉ field UI cần). */
export type RoomView = {
  id: string;
  name: string;
  hostUid: string;
  status: RoomStatus;
  memberCount: number;
  inviteCode: string;
  joinCode: string;
  expiresAt: Date;
  currentGameId: string;
  gameCount: number;
  closeReason: CloseReason | null;
  lastEvent: { type: string; targetUid: string | null } | null;
};

/** Dữ liệu ván client đọc qua listener `rooms/{id}/games/{gid}`. */
export type GameView = {
  id: string;
  seqNo: number;
  status: GameStatus;
};

/** Lý do vừa rời phòng — banner 4 SCR-02 (Q-050, Q-057). */
export type LeaveReason = "kicked" | "expired" | "host_left" | "left" | "unknown";
export type LeaveReasonRecord = { reason: LeaveReason; roomName: string | null };
