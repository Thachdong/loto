"use client";

import "client-only";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { getClientAuth, getClientDatabase } from "@/core/client/firebase";
import type { PresenceEntry } from "@/features/members/shared/domain/member-rows";

export type RoomPresenceState = { status: "loading" | "ready" | "error"; entries: PresenceEntry[]; retry: () => void };

/** RTDB `presence/{roomId}` value → danh sách (bỏ node thiếu `display_name`). */
export function mapPresence(value: unknown): PresenceEntry[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, Record<string, unknown>>).flatMap(([uid, node]) => {
    if (!node || typeof node.display_name !== "string") return [];
    return [
      {
        uid,
        online: node.online === true,
        displayName: node.display_name,
        photoUrl: typeof node.photo_url === "string" ? node.photo_url : null,
        at: typeof node.at === "number" ? node.at : null,
      },
    ];
  });
}

/** SCR-07.A0 (CHỈ ĐỌC): listener RTDB `presence/{roomId}`, chỉ chạy khi sheet mở. */
export function useRoomPresence(roomId: string, enabled: boolean): RoomPresenceState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; status: "ready" | "error"; entries: PresenceEntry[] } | null>(null);
  const key = enabled ? `${roomId}#${attempt}` : null;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    // Chờ Auth khôi phục phiên — đọc trước khi có `auth` sẽ bị rules từ chối.
    getClientAuth()
      .authStateReady()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        unsubscribe = onValue(
          ref(getClientDatabase(), `presence/${roomId}`),
          (snap) => !cancelled && setState({ key, status: "ready", entries: mapPresence(snap.val()) }),
          () => !cancelled && setState((prev) => ({ key, status: "error", entries: prev?.entries ?? [] })),
        );
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [key, roomId]);

  const current = key && state?.key === key ? state : null;
  return { status: current?.status ?? "loading", entries: current?.entries ?? [], retry: () => setAttempt((n) => n + 1) };
}
