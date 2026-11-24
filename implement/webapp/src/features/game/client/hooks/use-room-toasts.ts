"use client";

import "client-only";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { lastEventToast } from "@/features/game/shared/domain/last-event-toast";
import type { RoomView } from "@/features/room/shared/types";

export const TOAST_DURATION_MS = 3000;
/** `room_expiring` do `use-expiry-timer` (cục bộ) lo — bỏ qua để không trùng toast. */
const LOCAL_TYPES = new Set(["room_expiring"]);

/**
 * SCR-04 #17 / SUP-01: toast theo `rooms.last_event` (đủ 16 type nhờ `lastEventToast`). Bỏ qua snapshot đầu của phòng,
 * dedupe theo `type:atMs`, các sự kiện liên tiếp xếp hàng và mỗi toast tự ẩn sau 3 giây.
 */
export function useRoomToasts(room: RoomView | null, uid: string): void {
  const roomId = room?.id ?? null;
  const lastEvent = room?.lastEvent ?? null;
  const gameCount = room?.gameCount;
  const closeReason = room?.closeReason ?? null;
  const type = lastEvent?.type ?? null;
  const atMs = lastEvent?.atMs ?? null;
  const targetUid = lastEvent?.targetUid ?? null;
  const text = lastEvent?.text ?? null;

  const seen = useRef<{ roomId: string; key: string } | undefined>(undefined);
  const queue = useRef<string[]>([]);
  const showing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      queue.current = [];
      showing.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!roomId) {
      seen.current = undefined;
      return;
    }
    const key = `${type}:${atMs}`;
    const previous = seen.current;
    seen.current = { roomId, key };
    if (!previous || previous.roomId !== roomId) return; // snapshot đầu
    if (previous.key === key || type === null || LOCAL_TYPES.has(type)) return;

    const message = lastEventToast({ type, targetUid, text, atMs }, { uid }, { gameCount, closeReason });
    if (!message) return;
    queue.current.push(message);

    const next = () => {
      const item = queue.current.shift();
      if (item === undefined) {
        showing.current = false;
        timer.current = null;
        return;
      }
      showing.current = true;
      toast(item, { duration: TOAST_DURATION_MS });
      timer.current = setTimeout(next, TOAST_DURATION_MS);
    };
    if (!showing.current) next();
  }, [roomId, type, atMs, targetUid, text, uid, gameCount, closeReason]);
}
