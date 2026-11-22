import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import type { ClaimDoc, GameDoc, GameResult, WinnerDoc } from "./game.doc";
import type { TicketColor, TicketId } from "@/features/room/shared/types";

/** Một lượt KINH nội bộ cho service (camelCase). `result` là gợi ý của hệ thống (Q-055). */
export type ClaimRecord = {
  uid: string;
  displayName: string;
  ticketId: TicketId;
  color: TicketColor;
  result: "win" | "miss";
  row: number | null;
  claimedAt: Date;
};

export function claimFromDoc(doc: ClaimDoc): ClaimRecord {
  return {
    uid: doc.uid,
    displayName: doc.display_name,
    ticketId: doc.ticket_id,
    color: doc.color,
    result: doc.result,
    row: doc.row ?? null,
    claimedAt: doc.claimed_at.toDate(),
  };
}

export function claimToDoc(claim: ClaimRecord): ClaimDoc {
  return {
    uid: claim.uid,
    display_name: claim.displayName,
    ticket_id: claim.ticketId,
    color: claim.color,
    result: claim.result,
    row: claim.row,
    claimed_at: Timestamp.fromDate(claim.claimedAt),
  };
}

/** Lượt KINH `win` → người thắng (`games.winners`); `row` luôn có với lượt win. */
export function winnerFromClaim(claim: ClaimRecord): WinnerDoc {
  return {
    uid: claim.uid,
    display_name: claim.displayName,
    ticket_id: claim.ticketId,
    color: claim.color,
    row: claim.row ?? 0,
    claimed_at: Timestamp.fromDate(claim.claimedAt),
  };
}

/** Kết quả ván khi tự kết thúc: có lượt `win` → `won`, ngược lại `no_winner`. */
export function resultOfClaims(claims: readonly ClaimRecord[]): { result: GameResult; winners: WinnerDoc[] } {
  const winners = claims.filter((c) => c.result === "win").map(winnerFromClaim);
  return { result: winners.length > 0 ? "won" : "no_winner", winners };
}

/** Patch ván → `finished` (kết thúc tự động / hết 90 số): dừng quay, bỏ trạng thái chờ duyệt. */
export function finishedGamePatch(
  outcome: { result: GameResult; winners: WinnerDoc[] },
  now: Date,
): Partial<GameDoc> {
  return {
    status: "finished",
    result: outcome.result,
    winners: outcome.winners,
    ended_at: Timestamp.fromDate(now),
    next_call_at: null,
    pause_reason: null,
    resume_status: null,
  };
}
