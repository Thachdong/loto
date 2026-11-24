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
  /** Nhịp quay (giây/số), BR-15. */
  drawIntervalSec: number;
  /** Số đã rao của ván hiện tại theo thứ tự (TBL-02). */
  calledNumbers: number[];
  closeReason: CloseReason | null;
  /** `rooms.last_event` (SUP-01): `text` do server soạn (có thể null), `atMs` để client dedupe toast. */
  lastEvent: { type: string; targetUid: string | null; text: string | null; atMs: number | null } | null;
};

/** Dữ liệu ván client đọc qua listener `rooms/{id}/games/{gid}`. */
export type GameView = {
  id: string;
  seqNo: number;
  status: GameStatus;
  pauseReason: "host" | null;
  nextCallAt: Date | null;
  /** Trạng thái trước khi có KINH (quay về khi host bác bỏ). */
  resumeStatus: "running" | "paused" | null;
  /** Lượt KINH đang chờ host duyệt (TBL-05 `claims`). */
  claims: ClaimView[];
  playerCount: number;
  /** TBL-05 `result`: null khi ván chưa kết thúc. */
  result: "won" | "no_winner" | null;
  /** TBL-05 `winners` (chỉ có khi `finished`). */
  winners: WinnerView[];
  confirmedBy: string | null;
};

/** Một người thắng (TBL-05 `winners`). */
export type WinnerView = {
  uid: string;
  displayName: string;
  ticketId: TicketId;
  color: TicketColor;
  row: number;
  claimedAtMs: number;
};

/** Một lượt KINH (TBL-05 `claims`), `result` là gợi ý của hệ thống. */
export type ClaimView = {
  uid: string;
  displayName: string;
  ticketId: TicketId;
  color: TicketColor;
  result: "win" | "miss";
  row: number | null;
  claimedAtMs: number;
};

/** api-contract › RoomExpireResult. */
export type RoomExpireResult = { roomStatus: RoomStatus; gameStatus: GameStatus };

/** Lý do vừa rời phòng — banner 4 SCR-02 (Q-050, Q-057). */
export type LeaveReason = "kicked" | "expired" | "host_left" | "left" | "unknown";
export type LeaveReasonRecord = { reason: LeaveReason; roomName: string | null };

/** api-contract › KickResult: `ticketsFreedNow` = ván `waiting` (vé trống ngay), ngược lại vé trống ở ván sau (BR-22). */
export type KickResult = { uid: string; ticketsFreedNow: boolean; gameStatus: GameStatus };
