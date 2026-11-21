import "server-only";

import type { Timestamp } from "firebase-admin/firestore";
import type { GameStatus, TicketColor, TicketId } from "@/features/room/shared/types";

export type ClaimDoc = {
  uid: string;
  display_name: string;
  ticket_id: TicketId;
  color: TicketColor;
  result: "win" | "miss";
  row: number | null;
  claimed_at: Timestamp;
};

export type WinnerDoc = {
  uid: string;
  display_name: string;
  ticket_id: TicketId;
  color: TicketColor;
  row: number;
  claimed_at: Timestamp;
};

export type GameResult = "won" | "no_winner" | "cancelled";

/** database.md › TBL-05 `rooms/{roomId}/games/{gameId}` (Q-055: có `claims`, `resume_status`; bỏ cửa sổ đồng kinh). */
export type GameDoc = {
  seq_no: number;
  status: GameStatus;
  pause_reason: "host" | null;
  next_call_at: Timestamp | null;
  claims: ClaimDoc[];
  resume_status: "running" | "paused" | null;
  winners: WinnerDoc[];
  result: GameResult | null;
  player_count: number;
  started_at: Timestamp | null;
  ended_at: Timestamp | null;
  confirmed_by: string | null;
  created_at: Timestamp;
  /** TTL (NFR-11) = rooms.created_at + 31 ngày. */
  expire_at: Timestamp;
};
