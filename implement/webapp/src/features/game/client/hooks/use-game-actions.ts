"use client";

import "client-only";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/core/shared/action-result";
import { createClaimAction } from "@/features/game/server/actions/create-claim.action";
import { pauseGameAction } from "@/features/game/server/actions/pause-game.action";
import { resumeGameAction } from "@/features/game/server/actions/resume-game.action";
import { startGameAction } from "@/features/game/server/actions/start-game.action";
import { gameErrorMessage, NETWORK_ERROR, type GameOp } from "@/features/game/client/lib/game-errors";
import type { TicketId } from "@/features/room/shared/types";

export type GameActions = {
  /** Thao tác đang chạy (`start|pause|resume|claim:{ticketId}`), `null` = rảnh. */
  pending: string | null;
  start: () => Promise<boolean>;
  pause: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  claim: (ticketId: TicketId) => Promise<boolean>;
};

/** Gọi 4 Server Action của ván; một thao tác tại một thời điểm (chống bấm đúp), lỗi → toast theo SCR-04 §3. */
export function useGameActions(roomId: string, gameId: string): GameActions {
  const [pending, setPending] = useState<string | null>(null);
  const lock = useRef(false);

  const run = useCallback(
    async <T,>(op: GameOp, key: string, call: () => Promise<ActionResult<T>>): Promise<boolean> => {
      if (lock.current) return false;
      lock.current = true;
      setPending(key);
      try {
        const result = await call();
        if (result.ok) return true;
        const message = gameErrorMessage(op, result.error);
        if (message) toast.error(message);
        return false;
      } catch {
        const message = gameErrorMessage(op, { code: NETWORK_ERROR });
        if (message) toast.error(message);
        return false;
      } finally {
        lock.current = false;
        setPending(null);
      }
    },
    [],
  );

  const start = useCallback(() => run("start", "start", () => startGameAction({ roomId, gameId })), [run, roomId, gameId]);
  const pause = useCallback(() => run("pause", "pause", () => pauseGameAction({ roomId, gameId })), [run, roomId, gameId]);
  const resume = useCallback(() => run("resume", "resume", () => resumeGameAction({ roomId, gameId })), [run, roomId, gameId]);
  const claim = useCallback(
    (ticketId: TicketId) => run("claim", `claim:${ticketId}`, () => createClaimAction({ roomId, gameId, ticketId })),
    [run, roomId, gameId],
  );

  return { pending, start, pause, resume, claim };
}
