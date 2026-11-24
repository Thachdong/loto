"use client";

import "client-only";

import { useEffect, useState } from "react";
import { onDisconnect, onValue, ref, serverTimestamp, set } from "firebase/database";
import { getClientAuth, getClientDatabase } from "@/core/client/firebase";

export type PresenceMe = { uid: string; displayName: string; photoUrl: string | null };

/**
 * ADR-06 / TBL-08: ghi `presence/{roomId}/{uid}` = online + `onDisconnect` → online:false.
 * Ghi lại mỗi khi `.info/connected` thành true (mất mạng rồi nối lại). Không đặt offline thủ công khi unmount
 * (đổi trang trong cùng tab vẫn đang online; đóng tab/mất mạng do `onDisconnect` lo).
 */
export function usePresence(roomId: string | null, me: PresenceMe | null): void {
  const uid = me?.uid ?? null;
  const displayName = me?.displayName ?? "";
  const photoUrl = me?.photoUrl ?? null;

  useEffect(() => {
    if (!roomId || !uid) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    getClientAuth()
      .authStateReady()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        const db = getClientDatabase();
        const node = ref(db, `presence/${roomId}/${uid}`);
        unsubscribe = onValue(ref(db, ".info/connected"), (snap) => {
          if (snap.val() !== true) return;
          // Đăng ký onDisconnect trước, rồi mới ghi online (tránh kẹt online nếu rớt giữa chừng).
          // `set` đủ field (không `update`): node chưa tồn tại thì `update` thiếu `display_name` → rule `.validate`
          // từ chối việc đăng ký onDisconnect và cả chuỗi ghi online bị bỏ.
          onDisconnect(node)
            .set({ online: false, display_name: displayName, photo_url: photoUrl, at: serverTimestamp() })
            .then(() => {
              if (cancelled) return undefined;
              return set(node, { online: true, display_name: displayName, photo_url: photoUrl, at: serverTimestamp() });
            })
            .catch(() => undefined);
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [roomId, uid, displayName, photoUrl]);
}

/**
 * Trước khi rời phòng: hủy `onDisconnect` đã đăng ký cho `presence/{roomId}/{uid}` (server xóa node sau khi rời,
 * không để lệnh offline ghi lại sau đó). Lỗi chỉ bỏ qua — việc rời vẫn tiếp tục.
 */
export async function cancelPresence(roomId: string, uid: string): Promise<void> {
  try {
    await getClientAuth().authStateReady();
    await onDisconnect(ref(getClientDatabase(), `presence/${roomId}/${uid}`)).cancel();
  } catch {
    // bỏ qua
  }
}

export type RoomPresenceState = {
  status: "idle" | "loading" | "ready" | "error";
  /** `map[uid] = online`; uid KHÔNG có key = đã rời / chưa vào. */
  map: Record<string, boolean>;
};

type Internal = { roomId: string | null; status: RoomPresenceState["status"]; map: Record<string, boolean> };

/** Đọc realtime `presence/{roomId}` (CHỈ ĐỌC) → `{uid: online}`. */
export function useRoomPresence(roomId: string | null): RoomPresenceState {
  const [state, setState] = useState<Internal>({ roomId, status: roomId ? "loading" : "idle", map: {} });

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    getClientAuth()
      .authStateReady()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        unsubscribe = onValue(
          ref(getClientDatabase(), `presence/${roomId}`),
          (snap) => {
            if (cancelled) return;
            const next: Record<string, boolean> = {};
            snap.forEach((child) => {
              const value = child.val() as { online?: unknown } | null;
              next[child.key as string] = value?.online === true;
            });
            setState({ roomId, status: "ready", map: next });
          },
          () => {
            if (cancelled) return;
            setState((prev) => ({ roomId, status: "error", map: prev.roomId === roomId ? prev.map : {} }));
          },
        );
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [roomId]);

  if (state.roomId !== roomId) return { status: roomId ? "loading" : "idle", map: {} };
  return { status: state.status, map: state.map };
}
