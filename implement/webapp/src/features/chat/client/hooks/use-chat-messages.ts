"use client";

import "client-only";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  endBefore,
  getDocs,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { getClientAuth, getClientFirestore } from "@/core/client/firebase";
import type { Message } from "@/features/chat/shared/types";

/** SCR-06.A0 (Q-050): kích thước trang. */
export const CHAT_PAGE = 50;

/** Tin đã map cho UI (`createdAt` là Date). */
export type ChatMessage = Omit<Message, "createdAt"> & { createdAt: Date };

/** TBL-04 → ChatMessage. */
export function mapMessageDoc(data: DocumentData, id: string): ChatMessage {
  const at = data.created_at as Timestamp | null | undefined;
  return {
    id,
    senderUid: data.sender_uid as string,
    senderName: (data.sender_name as string) ?? "",
    senderPhotoUrl: (data.sender_photo_url as string | null | undefined) ?? null,
    text: (data.text as string) ?? "",
    createdAt: at ? at.toDate() : new Date(0),
  };
}

/** Gộp trang cũ + trang realtime, bỏ trùng theo id, cũ → mới. */
export function mergeMessages(older: readonly ChatMessage[], live: readonly ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of [...older, ...live]) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
}

export type ChatMessagesState = {
  status: "idle" | "loading" | "ready" | "error";
  messages: ChatMessage[];
  /** Còn tin cũ hơn để tải. */
  hasMore: boolean;
  loadingOlder: boolean;
  loadOlder: () => Promise<void>;
  retry: () => void;
};

type Live = { key: string; status: "ready" | "error"; messages: ChatMessage[]; full: boolean };

/** Listener `rooms/{roomId}/messages` orderBy `created_at` limitToLast 50 + tải trang cũ hơn (`endBefore`). */
export function useChatMessages(roomId: string | null): ChatMessagesState {
  const [attempt, setAttempt] = useState(0);
  const [live, setLive] = useState<Live | null>(null);
  const [older, setOlder] = useState<{ roomId: string; messages: ChatMessage[]; exhausted: boolean }>({ roomId: "", messages: [], exhausted: false });
  const [loadingOlder, setLoadingOlder] = useState(false);
  const key = roomId ? `${roomId}#${attempt}` : null;

  useEffect(() => {
    if (!key || !roomId) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    getClientAuth()
      .authStateReady()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        const q = query(collection(getClientFirestore(), `rooms/${roomId}/messages`), orderBy("created_at"), limitToLast(CHAT_PAGE));
        unsubscribe = onSnapshot(
          q,
          (snap) => {
            if (cancelled) return;
            const messages = snap.docs.map((d) => mapMessageDoc(d.data(), d.id));
            setLive({ key, status: "ready", messages, full: messages.length >= CHAT_PAGE });
          },
          () => !cancelled && setLive((prev) => ({ key, status: "error", messages: prev?.messages ?? [], full: prev?.full ?? false })),
        );
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [key, roomId]);

  const current = key && live?.key === key ? live : null;
  const olderHere = older.roomId === roomId ? older : { messages: [], exhausted: false };
  const messages = useMemo(() => mergeMessages(olderHere.messages, current?.messages ?? []), [olderHere.messages, current?.messages]);
  const hasMore = Boolean(current?.full) && !olderHere.exhausted;

  const loadOlder = useCallback(async () => {
    if (!roomId || !hasMore || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0];
      const q = query(
        collection(getClientFirestore(), `rooms/${roomId}/messages`),
        orderBy("created_at"),
        endBefore(Timestamp.fromDate(oldest.createdAt)),
        limitToLast(CHAT_PAGE),
      );
      const snap = await getDocs(q);
      const page = snap.docs.map((d) => mapMessageDoc(d.data(), d.id));
      setOlder((prev) => ({
        roomId,
        messages: mergeMessages(prev.roomId === roomId ? prev.messages : [], page),
        exhausted: page.length < CHAT_PAGE,
      }));
    } catch {
      // giữ nguyên; lần cuộn sau thử lại
    } finally {
      setLoadingOlder(false);
    }
  }, [roomId, hasMore, loadingOlder, messages]);

  return {
    status: !roomId ? "idle" : (current?.status ?? "loading"),
    messages,
    hasMore,
    loadingOlder,
    loadOlder,
    retry: () => setAttempt((n) => n + 1),
  };
}
