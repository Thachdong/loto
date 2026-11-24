"use client";

import "client-only";

import { useCallback, useRef, useState } from "react";
import type { ActionResult } from "@/core/shared/action-result";
import { sendMessageAction } from "@/features/chat/server/actions/send-message.action";
import type { Message } from "@/features/chat/shared/types";

/** Bubble tạm (optimistic) của mình. `id` = id thật sau khi action trả về. */
export type PendingMessage = { tempId: string; text: string; status: "sending" | "failed" | "sent"; id: string | null };

export type SendOutcome = "ok" | "rate_limited" | "blocked" | "failed";

type Send = (input: { roomId: string; text: string }) => Promise<ActionResult<Message>>;

/** SCR-06.A1: gửi optimistic, gửi lại bubble lỗi. */
export function useSendMessage(roomId: string, send: Send = sendMessageAction) {
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const seq = useRef(0);

  const deliver = useCallback(
    async (tempId: string, text: string): Promise<SendOutcome> => {
      const patch = (p: Partial<PendingMessage> | null) =>
        setPending((list) => (p === null ? list.filter((m) => m.tempId !== tempId) : list.map((m) => (m.tempId === tempId ? { ...m, ...p } : m))));
      let result: ActionResult<Message>;
      try {
        result = await send({ roomId, text });
      } catch {
        patch({ status: "failed" });
        return "failed";
      }
      if (result.ok) {
        patch({ status: "sent", id: result.data.id });
        return "ok";
      }
      if (result.error.code === "RATE_LIMITED") {
        patch(null);
        return "rate_limited";
      }
      if (result.error.code === "NOT_ROOM_MEMBER" || result.error.code === "UNAUTHENTICATED") {
        patch(null);
        return "blocked";
      }
      patch({ status: "failed" });
      return "failed";
    },
    [roomId, send],
  );

  const submit = useCallback(
    (text: string) => {
      seq.current += 1;
      const tempId = `tmp-${seq.current}`;
      setPending((list) => [...list, { tempId, text, status: "sending", id: null }]);
      return deliver(tempId, text);
    },
    [deliver],
  );

  const resend = useCallback(
    (tempId: string) => {
      const item = pending.find((m) => m.tempId === tempId);
      if (!item) return Promise.resolve<SendOutcome>("failed");
      setPending((list) => list.map((m) => (m.tempId === tempId ? { ...m, status: "sending" } : m)));
      return deliver(tempId, item.text);
    },
    [deliver, pending],
  );

  /** Bỏ bubble tạm đã có tin thật trong listener. */
  const visible = (liveIds: ReadonlySet<string>) => pending.filter((m) => !(m.id && liveIds.has(m.id)));

  return { pending, visible, submit, resend };
}
