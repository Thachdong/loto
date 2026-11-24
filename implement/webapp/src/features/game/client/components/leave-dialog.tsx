"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/core/client/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/client/ui/dialog";
import { t } from "@/core/shared/i18n/vi";
import type { ActionResult } from "@/core/shared/action-result";
import { leaveRoomAction } from "@/features/room/server/actions/leave-room.action";
import { writeLeaveReason } from "@/features/room/client";
import type { GameStatus } from "@/features/room/shared/types";

export type LeaveVariant = "simple" | "playing" | "host";

/** SCR-04 #21 / #23: host → "Đóng phòng"; player đang chơi (có vé, ván chạy) → cảnh báo; còn lại → đơn giản. */
export function leaveVariant(isHost: boolean, status: GameStatus, myTicketCount: number): LeaveVariant {
  if (isHost) return "host";
  const live = status === "running" || status === "paused" || status === "awaiting_confirm";
  return live && myTicketCount > 0 ? "playing" : "simple";
}

type Props = {
  open: boolean;
  variant: LeaveVariant;
  roomId: string;
  roomName: string;
  onStay: () => void;
  /**
   * Trước `leaveRoomAction`: hủy `onDisconnect` + ngừng ghi presence + đánh dấu ý định rời (để lý do `left` thắng
   * lý do suy ra từ snapshot). `onAbort` được gọi khi lỗi để hoàn tác.
   */
  onBeforeLeave?: () => Promise<void> | void;
  onAbort?: () => void;
  /** Rời thành công → về `/`. */
  onLeft: () => void;
  /** Tiêm khi test; mặc định `leaveRoomAction`. */
  leave?: (input: { roomId: string }) => Promise<ActionResult<null>>;
};

export function LeaveDialog({ open, variant, roomId, roomName, onStay, onBeforeLeave, onAbort, onLeft, leave = leaveRoomAction }: Props) {
  const [pending, setPending] = useState(false);
  const isHost = variant === "host";

  async function confirm() {
    if (pending) return;
    setPending(true);
    try {
      await onBeforeLeave?.();
      const result = await leave({ roomId });
      if (!result.ok) throw new Error(result.error.code);
      // Player ghi `left`; host theo flow hiện có (suy ra `host_left` từ snapshot phòng đóng).
      if (!isHost) writeLeaveReason({ reason: "left", roomName });
      onLeft();
    } catch {
      toast.error(t("leaveDialog.failed"));
      onAbort?.();
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onStay()}>
      <DialogContent showCloseButton={false} data-testid="leave-dialog" data-variant={variant}>
        <DialogHeader>
          <DialogTitle>{isHost ? t("leaveDialog.hostTitle") : t("leaveDialog.title")}</DialogTitle>
          <DialogDescription data-testid="leave-body">
            {variant === "host" ? t("leaveDialog.hostBody") : variant === "playing" ? t("leaveDialog.bodyPlaying") : t("leaveDialog.bodySimple")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2">
          <Button type="button" variant="outline" data-testid="btn-leave-stay" disabled={pending} className="h-11 flex-1 text-base" onClick={onStay}>
            {t("leaveDialog.stay")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-testid="btn-leave-confirm"
            disabled={pending}
            className="h-11 flex-1 text-base"
            onClick={() => void confirm()}
          >
            {isHost ? t("leaveDialog.confirmHost") : t("leaveDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
