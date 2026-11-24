"use client";

import "client-only";

import { useEffect, useState } from "react";
import type { ChatMessage } from "./use-chat-messages";

const storageKey = (roomId: string) => `loto.chatSeenAt.${roomId}`;

function readSeenAt(roomId: string): number {
  try {
    const raw = window.localStorage.getItem(storageKey(roomId));
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Số tin người khác gửi sau mốc "đã xem" (`created_at > seenAt`). */
export function countUnread(messages: readonly ChatMessage[], myUid: string, seenAt: number): number {
  return messages.filter((m) => m.senderUid !== myUid && m.createdAt.getTime() > seenAt).length;
}

/**
 * SCR-04 #16 badge: mốc `loto.chatSeenAt.{roomId}` (localStorage; lỗi → giữ trong bộ nhớ trang). Sheet đang mở
 * → mốc theo tin mới nhất, badge = 0.
 */
export function useChatUnread(roomId: string, myUid: string, messages: readonly ChatMessage[], open: boolean): number {
  const [seen, setSeen] = useState<{ roomId: string; at: number }>(() => ({ roomId, at: readSeenAt(roomId) }));
  if (seen.roomId !== roomId) setSeen({ roomId, at: readSeenAt(roomId) });

  const latest = messages.at(-1)?.createdAt.getTime() ?? 0;
  // Sheet đang mở và có tin mới hơn mốc → dời mốc (setState lúc render, không qua effect).
  if (open && seen.roomId === roomId && latest > seen.at) setSeen({ roomId, at: latest });

  useEffect(() => {
    if (seen.at <= 0) return;
    try {
      window.localStorage.setItem(storageKey(seen.roomId), String(seen.at));
    } catch {
      // chỉ giữ trong bộ nhớ
    }
  }, [seen]);

  if (open) return 0;
  return countUnread(messages, myUid, seen.at);
}
