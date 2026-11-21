"use client";

import "client-only";

import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { getClientAuth, getClientFirestore } from "@/core/client/firebase";

export type DocListenerStatus = "idle" | "loading" | "ready" | "error";

export type DocListenerState<T> = {
  /** `idle`: không có path · `loading`: chờ snapshot đầu · `ready`: có snapshot · `error`: listener lỗi (đang thử lại). */
  status: DocListenerStatus;
  /** Dữ liệu đã map; `null` khi doc không tồn tại hoặc chưa có. Khi `error` giữ dữ liệu lần cuối. */
  data: T | null;
  /** Mã lỗi Firestore lần cuối (VD `permission-denied`), `null` khi không lỗi. */
  errorCode: string | null;
};

type Internal<T> = DocListenerState<T> & { path: string | null };

/** Thời gian chờ trước khi đăng ký lại listener sau lỗi: 2s, 4s, 8s… tối đa 30s. */
export const retryDelayMs = (attempt: number) => Math.min(30_000, 2_000 * 2 ** Math.min(attempt, 4));

/**
 * Nghe realtime 1 doc Firestore (CHỈ ĐỌC). `path = null` → không nghe (`idle`).
 * Chờ Firebase Auth client khôi phục phiên rồi mới đăng ký (Security Rules cần `request.auth`).
 * Lỗi (mất mạng, `permission-denied`…) → `status: 'error'`, giữ dữ liệu cũ và tự đăng ký lại theo `retryDelayMs`.
 * `map` phải ổn định (khai báo ở module) — đổi `map` sẽ đăng ký lại.
 */
export function useDocListener<T>(
  path: string | null,
  map: (data: DocumentData, id: string) => T,
): DocListenerState<T> {
  const [state, setState] = useState<Internal<T>>({ path, status: path ? "loading" : "idle", data: null, errorCode: null });
  const [attempt, setAttempt] = useState(0);
  /** Số lần lỗi liên tiếp — tính backoff; snapshot thành công đặt lại 0. */
  const failures = useRef(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    getClientAuth()
      .authStateReady()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(getClientFirestore(), path),
          (snap) => {
            if (cancelled) return;
            failures.current = 0;
            setState({ path, status: "ready", data: snap.exists() ? map(snap.data(), snap.id) : null, errorCode: null });
          },
          (error) => {
            if (cancelled) return;
            setState((prev) => ({
              path,
              status: "error",
              data: prev.path === path ? prev.data : null,
              errorCode: error.code ?? "unknown",
            }));
            retryTimer = setTimeout(() => setAttempt((a) => a + 1), retryDelayMs(failures.current++));
          },
        );
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [path, map, attempt]);

  // Path vừa đổi mà chưa có snapshot của path mới → coi như đang tải (không đặt state trong effect).
  if (state.path !== path) return { status: path ? "loading" : "idle", data: null, errorCode: null };
  return { status: state.status, data: state.data, errorCode: state.errorCode };
}
