"use client";

import "client-only";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { t } from "@/core/shared/i18n/vi";
import type { ActionError, ActionResult } from "@/core/shared/action-result";
import type { TicketId } from "@/features/room/shared/types";
import { reclaimPlayerTicketsAction } from "@/features/ticket/server/actions/reclaim-player-tickets.action";
import { releaseTicketAction } from "@/features/ticket/server/actions/release-ticket.action";
import { renewTicketSetAction } from "@/features/ticket/server/actions/renew-ticket-set.action";
import { takeTicketAction } from "@/features/ticket/server/actions/take-ticket.action";
import type { StillHeldDetail } from "@/features/ticket/shared/types";

type Op = "take" | "release" | "renew" | "reclaim";

/** SCR-05 §3 / task mục 3 UI: mã lỗi → câu toast; `null` = không toast. */
export function ticketErrorMessage(op: Op, error: ActionError): string | null {
  switch (error.code) {
    case "TICKET_TAKEN":
      return t("ticket.err.taken");
    case "TICKET_LIMIT_REACHED":
      return t("ticket.err.limit");
    case "GAME_NOT_WAITING":
      return t(op === "take" || op === "release" ? "ticket.err.notWaitingTake" : "ticket.err.notWaitingRenew");
    case "TICKET_NOT_HELD":
      return null; // listener tự làm mới
    case "PLAYER_NOT_FOUND":
      return op === "reclaim" ? null : t("ticket.err.generic"); // đã không còn giữ vé
    case "TARGET_ONLINE":
      return t("ticket.err.targetOnline");
    default:
      return t("ticket.err.generic");
  }
}

export type RenewOutcome = { kind: "ok" } | { kind: "still-held"; details: StillHeldDetail[] } | { kind: "error" };

export type TicketActions = {
  /** Khóa đang chạy, VD `take:red_a`, `renew`, `reclaim:uid`; `null` = rảnh. */
  pending: string | null;
  take: (ticketId: TicketId) => Promise<boolean>;
  release: (ticketId: TicketId) => Promise<boolean>;
  renew: () => Promise<RenewOutcome>;
  reclaim: (uid: string) => Promise<boolean>;
};

/** Gọi 4 Server Action của ticket; một thao tác tại một thời điểm (chống bấm đúp). */
export function useTicketActions(roomId: string): TicketActions {
  const [pending, setPending] = useState<string | null>(null);
  const lock = useRef(false);

  const run = useCallback(async <T,>(key: string, call: () => Promise<ActionResult<T>>): Promise<ActionResult<T> | null> => {
    if (lock.current) return null;
    lock.current = true;
    setPending(key);
    try {
      return await call();
    } catch {
      return { ok: false, error: { code: "INTERNAL_ERROR", message: "" } };
    } finally {
      lock.current = false;
      setPending(null);
    }
  }, []);

  const simple = useCallback(
    async <T,>(op: Op, key: string, call: () => Promise<ActionResult<T>>): Promise<boolean> => {
      const result = await run(key, call);
      if (!result) return false;
      if (result.ok) return true;
      const message = ticketErrorMessage(op, result.error);
      if (message) toast.error(message);
      return false;
    },
    [run],
  );

  const take = useCallback(
    (ticketId: TicketId) => simple("take", `take:${ticketId}`, () => takeTicketAction({ roomId, ticketId })),
    [simple, roomId],
  );
  const release = useCallback(
    (ticketId: TicketId) => simple("release", `release:${ticketId}`, () => releaseTicketAction({ roomId, ticketId })),
    [simple, roomId],
  );
  const reclaim = useCallback(
    (uid: string) => simple("reclaim", `reclaim:${uid}`, () => reclaimPlayerTicketsAction({ roomId, uid })),
    [simple, roomId],
  );

  const renew = useCallback(async (): Promise<RenewOutcome> => {
    const result = await run("renew", () => renewTicketSetAction({ roomId }));
    if (!result) return { kind: "error" };
    if (result.ok) return { kind: "ok" };
    if (result.error.code === "TICKETS_STILL_HELD") {
      return { kind: "still-held", details: (result.error.details ?? []) as unknown as StillHeldDetail[] };
    }
    const message = ticketErrorMessage("renew", result.error);
    if (message) toast.error(message);
    return { kind: "error" };
  }, [run, roomId]);

  return { pending, take, release, renew, reclaim };
}
