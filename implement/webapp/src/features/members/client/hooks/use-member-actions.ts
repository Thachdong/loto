"use client";

import "client-only";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { t } from "@/core/shared/i18n/vi";
import type { ActionError, ActionResult } from "@/core/shared/action-result";
import { kickPlayerAction } from "@/features/room/server/actions/kick-player.action";
import { reclaimPlayerTicketsAction } from "@/features/ticket/server/actions/reclaim-player-tickets.action";

type Op = "kick" | "reclaim";

/** SCR-07 §3: mã lỗi → câu toast; `NOT_ROOM_HOST` → `null` (nút tự ẩn theo dữ liệu). */
export function memberErrorMessage(op: Op, error: ActionError, name: string): string | null {
  switch (error.code) {
    case "PLAYER_NOT_FOUND":
      return op === "kick" ? t("members.err.notPlayer") : null;
    case "TARGET_ONLINE":
      return t("members.err.targetOnline", { name });
    case "GAME_NOT_WAITING":
      return t("members.err.notWaiting");
    case "NOT_ROOM_HOST":
    case "CANNOT_TARGET_SELF":
      return null;
    default:
      return t("members.err.generic");
  }
}

export type MemberActions = {
  /** `kick:uid` / `reclaim:uid` đang chạy; `null` = rảnh. */
  pending: string | null;
  run: (op: Op, uid: string, name: string) => Promise<boolean>;
};

type Calls = {
  kick: (input: { roomId: string; uid: string }) => Promise<ActionResult<unknown>>;
  reclaim: (input: { roomId: string; uid: string }) => Promise<ActionResult<unknown>>;
};

const DEFAULT_CALLS: Calls = { kick: kickPlayerAction, reclaim: reclaimPlayerTicketsAction };

/** Kick / thu hồi vé (host); một thao tác tại một thời điểm. */
export function useMemberActions(roomId: string, calls: Calls = DEFAULT_CALLS): MemberActions {
  const [pending, setPending] = useState<string | null>(null);
  const lock = useRef(false);

  const run = useCallback(
    async (op: Op, uid: string, name: string) => {
      if (lock.current) return false;
      lock.current = true;
      setPending(`${op}:${uid}`);
      try {
        const result = await calls[op]({ roomId, uid });
        if (result.ok) return true;
        const message = memberErrorMessage(op, result.error, name);
        if (message) toast.error(message);
        return false;
      } catch {
        toast.error(t("members.err.generic"));
        return false;
      } finally {
        lock.current = false;
        setPending(null);
      }
    },
    [calls, roomId],
  );

  return { pending, run };
}
