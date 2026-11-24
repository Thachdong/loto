import { t } from "@/core/shared/i18n/vi";
import type { ActionError } from "@/core/shared/action-result";

export type GameOp = "start" | "pause" | "resume" | "claim" | "confirm" | "reject";

/** Mã `NETWORK`: lỗi mạng (action throw) — do client tự gán, không phải mã api-contract. */
export const NETWORK_ERROR = "NETWORK" as const;

/**
 * SCR-04 §3: mã lỗi action → câu toast; `null` = bỏ qua (listener sẽ cập nhật UI).
 */
export function gameErrorMessage(op: GameOp, error: Pick<ActionError, "code"> | { code: typeof NETWORK_ERROR }): string | null {
  switch (error.code) {
    case "NO_TICKETS_HELD":
      return t("err.noTickets");
    case "ROOM_CLOSING":
      return t("err.roomClosing");
    case "NOT_TICKET_HOLDER":
      return t("err.notTicketHolder");
    case "TICKET_ALREADY_CLAIMED":
      return t("err.ticketAlreadyClaimed");
    case "CLAIMS_CLOSED":
      return t("err.claimsClosed");
    case "CLAIM_HAS_WIN":
      return t("err.claimHasWin");
    case "GAME_NOT_AWAITING_CONFIRM":
    case "NO_WINNING_CLAIM":
    case "GAME_NOT_WAITING":
    case "GAME_NOT_RUNNING":
    case "GAME_NOT_PAUSED":
    case "GAME_STALE":
    case "NOT_ROOM_HOST":
      return null;
    default:
      return networkMessage(op);
  }
}

function networkMessage(op: GameOp): string {
  if (op === "claim") return t("err.claimNetwork");
  if (op === "confirm") return t("err.confirmNetwork");
  if (op === "reject") return t("err.rejectNetwork");
  return t("err.generic");
}
