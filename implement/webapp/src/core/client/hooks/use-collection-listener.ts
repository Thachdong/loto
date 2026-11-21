"use client";

import "client-only";

import { useCallback, useEffect, useRef, useState } from "react";
import { collection, onSnapshot, type DocumentData } from "firebase/firestore";
import { getClientAuth, getClientFirestore } from "@/core/client/firebase";
import { retryDelayMs, type DocListenerStatus } from "@/core/client/hooks/use-doc-listener";

export type CollectionListenerState<T> = {
  /** `idle`: không có path · `loading`: chờ snapshot đầu · `ready`: có snapshot · `error`: listener lỗi (đang thử lại). */
  status: DocListenerStatus;
  /** Các doc đã map (thứ tự snapshot); khi `error` giữ dữ liệu lần cuối. */
  data: T[];
  errorCode: string | null;
  /** Đăng ký lại listener ngay (nút "Thử lại"). */
  retry: () => void;
};

type Internal<T> = { path: string | null; status: DocListenerStatus; data: T[]; errorCode: string | null };

/**
 * Nghe realtime 1 collection Firestore (CHỈ ĐỌC). Cùng hợp đồng với `useDocListener`:
 * chờ Auth client, lỗi → `status: 'error'` + đăng ký lại theo backoff. `map` phải ổn định (khai báo ở module).
 */
export function useCollectionListener<T>(
  path: string | null,
  map: (data: DocumentData, id: string) => T,
): CollectionListenerState<T> {
  const [state, setState] = useState<Internal<T>>({ path, status: path ? "loading" : "idle", data: [], errorCode: null });
  const [attempt, setAttempt] = useState(0);
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
          collection(getClientFirestore(), path),
          (snap) => {
            if (cancelled) return;
            failures.current = 0;
            setState({ path, status: "ready", data: snap.docs.map((d) => map(d.data(), d.id)), errorCode: null });
          },
          (error) => {
            if (cancelled) return;
            setState((prev) => ({
              path,
              status: "error",
              data: prev.path === path ? prev.data : [],
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

  const retry = useCallback(() => {
    failures.current = 0;
    setAttempt((a) => a + 1);
  }, []);

  if (state.path !== path) return { status: path ? "loading" : "idle", data: [], errorCode: null, retry };
  return { status: state.status, data: state.data, errorCode: state.errorCode, retry };
}
