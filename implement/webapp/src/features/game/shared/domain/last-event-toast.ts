import { t } from "@/core/shared/i18n/vi";
import type { CloseReason, RoomView } from "@/features/room/shared/types";

type LastEvent = NonNullable<RoomView["lastEvent"]>;

export type ToastContext = {
  /** `rooms.game_count` — câu "Ván {n} bắt đầu/kết thúc" khi server chưa kèm `text`. */
  gameCount?: number;
  closeReason?: CloseReason | null;
};

/**
 * `rooms.last_event` → câu toast tiếng Việt (SCR-04 #17, SUP-01) cho đủ 16 `type` của TBL-02.
 * `text` do server soạn được ưu tiên khi là câu hoàn chỉnh (game_started, game_finished, claim_submitted,
 * member_joined, member_left, room_closed); với `tickets_reclaimed`/`member_kicked` `text` là tên người bị tác động.
 * Trả `null` khi không có câu để hiện (type không toast, hoặc thiếu tên mà server không kèm `text`).
 */
export function lastEventToast(lastEvent: LastEvent | null, me: { uid: string }, ctx: ToastContext = {}): string | null {
  if (!lastEvent) return null;
  const { type, text, targetUid } = lastEvent;
  switch (type) {
    case "member_joined":
    case "member_left":
    case "claim_submitted":
    case "interval_changed":
      return text;
    case "member_kicked":
      return text ? t("toast.memberKicked", { name: text }) : null;
    case "ticket_set_renewed":
      return t("event.ticketSetRenewed");
    case "tickets_reclaimed":
      if (targetUid !== null && targetUid === me.uid) return t("event.ticketsReclaimedSelf");
      return text ? t("event.ticketsReclaimed", { name: text }) : null;
    case "game_started":
      return text ?? (ctx.gameCount ? t("toast.gameStarted", { game: ctx.gameCount }) : null);
    case "game_finished":
      return text ?? (ctx.gameCount ? t("toast.gameFinished", { game: ctx.gameCount }) : null);
    case "game_paused":
      return t("toast.gamePaused");
    case "game_resumed":
      return t("toast.gameResumed");
    case "claims_rejected":
      return text ?? t("toast.claimsRejectedFallback");
    case "room_expiring":
      return t("toast.expiresSoon");
    case "room_closing":
      return t("toast.roomClosing");
    case "room_closed":
      return text ?? (ctx.closeReason === "host_left" ? t("toast.hostLeft") : t("toast.roomClosed"));
    case "game_cancelled":
    default:
      return null;
  }
}
