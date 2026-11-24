"use client";

import "client-only";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { t } from "@/core/shared/i18n/vi";
import type { ActionResult } from "@/core/shared/action-result";
import { updateRoomAction } from "@/features/room/server/actions/update-room.action";
import { clampDrawInterval } from "@/features/room/shared/domain/draw-interval";
import type { RoomSettings } from "@/features/room/shared/types";

/** Q-050: gửi sau 600 ms kể từ lần bấm cuối. */
export const DRAW_INTERVAL_DEBOUNCE_MS = 600;

type Update = (input: { roomId: string; drawIntervalSec: number }) => Promise<ActionResult<RoomSettings>>;

export type DrawIntervalState = {
  /** Giá trị hiển thị (lạc quan khi đang chờ gửi). */
  value: number;
  step: (delta: 1 | -1) => void;
  /** Server trả `NOT_ROOM_HOST` → chuyển sang chỉ đọc. */
  forbidden: boolean;
};

/** SCR-11.A3: stepper nhịp quay của host — debounce, lỗi → trả về giá trị server + toast. */
export function useDrawInterval(roomId: string, serverValue: number, update: Update = updateRoomAction): DrawIntervalState {
  const [draft, setDraft] = useState<number | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const value = draft ?? serverValue;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const commit = useCallback(
    async (next: number) => {
      let result: ActionResult<RoomSettings> | null = null;
      try {
        result = await update({ roomId, drawIntervalSec: next });
      } catch {
        result = null;
      }
      if (result && !result.ok && result.error.code === "NOT_ROOM_HOST") setForbidden(true);
      else if (!result || !result.ok) toast.error(t("settings.intervalFailed"));
      // Thành công: listener `rooms` trả giá trị mới; lỗi: về giá trị server.
      setDraft(null);
    },
    [roomId, update],
  );

  const step = useCallback(
    (delta: 1 | -1) => {
      const next = clampDrawInterval(value + delta);
      if (next === value) return;
      setDraft(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void commit(next), DRAW_INTERVAL_DEBOUNCE_MS);
    },
    [value, commit],
  );

  return { value, step, forbidden };
}
