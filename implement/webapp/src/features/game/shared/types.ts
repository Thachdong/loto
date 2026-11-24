import type { GameStatus, RoomStatus, TicketColor, TicketId } from "@/features/room/shared/types";

/** api-contract › GameState (startGame / pauseGame / resumeGame). */
export type GameState = {
  gameId: string;
  seqNo: number;
  status: GameStatus;
  playerCount: number;
  startedAt: string | null;
  nextCallAt: string | null;
};

/** api-contract › DrawResult. `drawn = false` khi lượt gọi trùng (đã có số mới). */
export type DrawResult = {
  drawn: boolean;
  number: number | null;
  seq: number;
  nextCallAt: string | null;
  gameStatus: GameStatus;
};

/** api-contract › ClaimResult: `result` là gợi ý của hệ thống, host quyết định (Q-055). */
export type ClaimResult = {
  result: "win" | "miss";
  ticketId: TicketId;
  row: number | null;
  gameStatus: GameStatus;
};

/** api-contract › Winner. */
export type Winner = {
  uid: string;
  displayName: string;
  ticketId: TicketId;
  color: TicketColor;
  row: number;
  claimedAt: string;
};

/** api-contract › GameConfirmResult. `nextGameId = null` khi phòng quá hạn nên đã đóng (BR-04). */
export type GameConfirmResult = {
  finishedGameId: string;
  result: "won" | "no_winner";
  winners: Winner[];
  nextGameId: string | null;
  roomStatus: RoomStatus;
};
