"use client";

import "client-only";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { t } from "@/core/shared/i18n/vi";
import type { RoomView } from "@/features/room/shared/types";

/**
 * SUP-01: toast từ `rooms.last_event` — `ticket_set_renewed`, `tickets_reclaimed`.
 * Không toast ở snapshot đầu tiên của phòng (sự kiện cũ); dedupe theo `type` + `atMs`.
 */
export function useRoomEventToast(room: RoomView | null, uid: string): void {
  const roomId = room?.id ?? null;
  const lastEvent = room?.lastEvent ?? null;
  const type = lastEvent?.type ?? null;
  const atMs = lastEvent?.atMs ?? null;
  const targetUid = lastEvent?.targetUid ?? null;
  const text = lastEvent?.text ?? null;

  /** Khóa sự kiện đã thấy; `undefined` = chưa có snapshot nào của phòng này. */
  const seen = useRef<{ roomId: string; key: string } | undefined>(undefined);

  useEffect(() => {
    if (!roomId) {
      seen.current = undefined;
      return;
    }
    const key = `${type}:${atMs}`;
    const previous = seen.current;
    seen.current = { roomId, key };
    if (!previous || previous.roomId !== roomId) return; // snapshot đầu
    if (previous.key === key) return;

    if (type === "ticket_set_renewed") {
      toast(t("event.ticketSetRenewed"));
    } else if (type === "tickets_reclaimed") {
      toast(targetUid === uid ? t("event.ticketsReclaimedSelf") : t("event.ticketsReclaimed", { name: text ?? "" }));
    }
  }, [roomId, type, atMs, targetUid, text, uid]);
}
