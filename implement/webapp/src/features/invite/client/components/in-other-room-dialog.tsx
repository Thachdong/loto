"use client";

import Link from "next/link";
import type { DocumentData } from "firebase/firestore";
import { useDocListener } from "@/core/client/hooks/use-doc-listener";
import { Button } from "@/core/client/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/client/ui/dialog";
import { t } from "@/core/shared/i18n/vi";

// Module-level để `useDocListener` không đăng ký lại mỗi lần render. Không import code client của feature room.
function mapRoomName(data: DocumentData): string {
  return typeof data.name === "string" ? data.name : "";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Phòng hiện tại của viewer (`viewer.currentRoomId` hoặc `ALREADY_IN_ROOM.details[0]`). */
  currentRoomId: string | null;
};

/** SCR-03 dialog 8 "Đang ở phòng khác". Tên phòng đọc client từ `rooms/{currentRoomId}`. */
export function InOtherRoomDialog({ open, onOpenChange, currentRoomId }: Props) {
  const { data: name } = useDocListener(open && currentRoomId ? `rooms/${currentRoomId}` : null, mapRoomName);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="join-other-room-dialog" showCloseButton={false}>
        <DialogHeader>
          {/* Spec không có tiêu đề cho dialog 8; giữ DialogTitle ẩn để đọc màn hình. */}
          <DialogTitle className="sr-only">{t("app.name")}</DialogTitle>
          <DialogDescription data-testid="join-other-room-body">
            {t("join.otherRoomBody", { name: name ?? "…" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="join-other-room-close"
            className="h-11"
            onClick={() => onOpenChange(false)}
          >
            {t("join.otherRoomClose")}
          </Button>
          <Button asChild className="h-11">
            <Link data-testid="join-other-room-go" href="/room">
              {t("join.otherRoomGo")}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
