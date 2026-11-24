import { formatTimeVN } from "@/core/shared/time";
import type { TicketColor, TicketId } from "@/features/room/shared/types";

/** Ván đã kết thúc đọc từ TBL-05 (chỉ các field SCR-08 cần). */
export type HistoryGame = {
  id: string;
  seqNo: number;
  status: "finished" | "cancelled";
  result: "won" | "no_winner" | null;
  winners: { uid: string; displayName: string; ticketId: TicketId; color: TicketColor }[];
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date | null;
};

export type HistoryWinner = {
  uid: string;
  displayName: string;
  ticketId: TicketId;
  color: TicketColor;
  photoUrl: string | null;
  /** Chữ cái đầu tên — dùng khi không có ảnh (Q-050). */
  initial: string;
};

export type HistoryCard = {
  gameId: string;
  seqNo: number;
  /** "HH:mm – HH:mm" (GMT+7); ván hủy chưa bắt đầu → chỉ giờ hủy. */
  time: { kind: "range"; from: string; to: string } | { kind: "cancelled"; at: string } | { kind: "none" };
  outcome: "won" | "no_winner" | "cancelled";
  winners: HistoryWinner[];
};

/** Thứ tự: mới nhất trên cùng (`seq_no` giảm dần) — SCR-08.A0. */
export function sortHistory<T extends { seqNo: number }>(games: readonly T[]): T[] {
  return [...games].sort((a, b) => b.seqNo - a.seqNo);
}

/**
 * SCR-08 #2–#3: ván đã kết thúc → thẻ lịch sử. Ảnh người thắng lấy từ `players/{uid}.photo_url` của ván đó
 * (`photos`), không có → chữ cái đầu `display_name` (Q-050). Giờ hiển thị GMT+7 (NFR-16).
 */
export function toHistoryCard(game: HistoryGame, photos: Readonly<Record<string, string | null>> = {}): HistoryCard {
  const end = game.endedAt ?? game.createdAt;
  let time: HistoryCard["time"] = { kind: "none" };
  if (game.startedAt && end) time = { kind: "range", from: formatTimeVN(game.startedAt, "HH:mm"), to: formatTimeVN(end, "HH:mm") };
  else if (game.status === "cancelled" && end) time = { kind: "cancelled", at: formatTimeVN(end, "HH:mm") };

  const outcome: HistoryCard["outcome"] =
    game.status === "cancelled" ? "cancelled" : game.result === "won" && game.winners.length > 0 ? "won" : "no_winner";

  return {
    gameId: game.id,
    seqNo: game.seqNo,
    time,
    outcome,
    winners:
      outcome === "won"
        ? game.winners.map((w) => ({
            ...w,
            photoUrl: photos[w.uid] ?? null,
            initial: (w.displayName.trim()[0] ?? "?").toLocaleUpperCase("vi"),
          }))
        : [],
  };
}
