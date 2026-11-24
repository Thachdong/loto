"use client";

import "client-only";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/core/shared/action-result";
import { t } from "@/core/shared/i18n/vi";
import { expireRoomAction } from "@/features/room/server/actions/expire-room.action";
import type { RoomExpireResult, RoomView } from "@/features/room/shared/types";

export type ExpireCall = (input: { roomId: string }) => Promise<ActionResult<RoomExpireResult>>;

type Options = {
  room: RoomView | null;
  /** `serverTime − localTime` (ms). */
  offsetMs: number;
  /** Tiêm khi test; mặc định `expireRoomAction`. */
  expire?: ExpireCall;
  /** Tiêm khi test; mặc định `Math.random`. */
  rng?: () => number;
};

export const EXPIRY_WARN_MS = 15 * 60_000;
export const EXPIRE_JITTER_MAX_MS = 2000;
const RETRY_MS = 1000;
const MAX_ATTEMPTS = 6;

/** Phòng đã báo "sắp hết hạn" trong phiên trang (chỉ 1 lần mỗi phòng). */
const warned = new Set<string>();
/** Dành cho test. */
export function resetExpiryWarned(): void {
  warned.clear();
}

/**
 * SCR-04.A11: toast cục bộ 1 lần khi còn ≤ 15 phút (không cần API); khi `expires_at` tới (hoặc mở app thấy quá hạn)
 * chờ jitter 0–2s (tránh mọi máy cùng gọi) rồi `expireRoomAction`. `ROOM_NOT_EXPIRED` (lệch đồng hồ) / lỗi mạng → hẹn lại.
 */
export function useExpiryTimer({ room, offsetMs, expire = expireRoomAction, rng = Math.random }: Options): void {
  const roomId = room?.id ?? null;
  const expiresMs = room?.expiresAt.getTime() ?? null;
  const closed = room?.status === "closed";
  const [attempt, setAttempt] = useState(0);

  // Cảnh báo ≤ 15 phút.
  useEffect(() => {
    if (!roomId || expiresMs === null || closed || warned.has(roomId)) return;
    const show = () => {
      if (warned.has(roomId)) return;
      warned.add(roomId);
      toast(t("toast.expiresSoon"));
    };
    const warnIn = expiresMs - EXPIRY_WARN_MS - (Date.now() + offsetMs);
    if (warnIn <= 0) {
      // Đã hết hạn thì không cần cảnh báo nữa.
      if (expiresMs - (Date.now() + offsetMs) > 0) show();
      return;
    }
    const id = setTimeout(show, warnIn);
    return () => clearTimeout(id);
  }, [roomId, expiresMs, closed, offsetMs]);

  // Hết hạn → expireRoom.
  useEffect(() => {
    if (!roomId || expiresMs === null || closed || attempt >= MAX_ATTEMPTS) return;
    let cancelled = false;
    const wait = Math.max(0, expiresMs - (Date.now() + offsetMs)) + Math.floor(rng() * EXPIRE_JITTER_MAX_MS);
    const id = setTimeout(async () => {
      try {
        const result = await expire({ roomId });
        if (cancelled) return;
        if (!result.ok && result.error.code === "ROOM_NOT_EXPIRED") setAttempt((n) => n + 1);
      } catch {
        if (!cancelled) setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
      }
    }, wait);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [roomId, expiresMs, closed, offsetMs, attempt, expire, rng]);
}
