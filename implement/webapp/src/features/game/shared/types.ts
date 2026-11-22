import type { GameStatus, TicketId } from "@/features/room/shared/types";

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
