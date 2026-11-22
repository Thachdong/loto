import type { GameStatus, RoomStatus } from "@/features/room/shared/types";

/**
 * - `none`: không đổi gì.
 * - `cancel_and_close`: ván `waiting` (hoặc phòng không còn ván) → hủy ván + đóng phòng.
 * - `mark_closing`: ván `running`/`paused` → phòng `closing`, ván chạy nốt (BR-04).
 * - `finish_and_close`: ván `awaiting_confirm` → ván `finished` (winners = claims win) + đóng phòng.
 * - `close`: phòng `closing` mà ván đã `finished`/`cancelled` → đóng phòng.
 */
export type ExpiryDecision = "none" | "cancel_and_close" | "mark_closing" | "finish_and_close" | "close";

export type ExpiryInput = {
  roomStatus: RoomStatus | null;
  gameStatus: GameStatus | null;
  now: Date;
  expiresAt: Date;
};

export function decideExpiry({ roomStatus, gameStatus, now, expiresAt }: ExpiryInput): ExpiryDecision {
  if (roomStatus === "closing") {
    return gameStatus === "finished" || gameStatus === "cancelled" ? "close" : "none";
  }
  if (roomStatus !== "active" || now.getTime() < expiresAt.getTime()) return "none";
  switch (gameStatus) {
    case "running":
    case "paused":
      return "mark_closing";
    case "awaiting_confirm":
      return "finish_and_close";
    default:
      return "cancel_and_close";
  }
}
