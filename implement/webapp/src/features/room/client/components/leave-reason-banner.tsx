"use client";

import { useEffect, useSyncExternalStore } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/core/client/ui/button";
import { t } from "@/core/shared/i18n/vi";
import {
  clearLeaveReason,
  readLeaveReason,
  subscribeLeaveReason,
} from "@/features/room/client/lib/leave-reason-store";
import type { LeaveReasonRecord } from "@/features/room/shared/types";

const getServerSnapshot = () => null;

function message(record: LeaveReasonRecord): string {
  if (record.reason === "unknown" || !record.roomName) return t("leaveReason.unknown");
  return t(`leaveReason.${record.reason}`, { name: record.roomName });
}

/**
 * SCR-02 banner 4 — lý do vừa rời phòng, đọc `sessionStorage['loto:leaveReason']`.
 * Đóng bằng ✕; tự ẩn khi tải lại trang (xóa bản ghi lúc `pagehide`).
 */
export function LeaveReasonBanner() {
  const record = useSyncExternalStore(subscribeLeaveReason, readLeaveReason, getServerSnapshot);

  useEffect(() => {
    window.addEventListener("pagehide", clearLeaveReason);
    return () => window.removeEventListener("pagehide", clearLeaveReason);
  }, []);

  if (!record) return null;

  return (
    <div
      data-testid="leave-reason-banner"
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 py-1 pr-1 pl-4 text-sm text-amber-900"
    >
      <p className="flex-1 py-2.5">{message(record)}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-testid="leave-reason-dismiss"
        aria-label={t("leaveReason.dismiss")}
        className="size-11 shrink-0 text-amber-900 hover:bg-amber-100"
        onClick={clearLeaveReason}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
