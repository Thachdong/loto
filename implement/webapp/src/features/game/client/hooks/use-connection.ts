"use client";

import "client-only";

import { useEffect, useState } from "react";
import { disableNetwork, enableNetwork } from "firebase/firestore";
import { goOffline, goOnline, onValue, ref } from "firebase/database";
import { getClientDatabase, getClientFirestore } from "@/core/client/firebase";

/** Chờ chút trước khi báo mất kết nối: `.info/connected` thường báo `false` rồi `true` lúc mới vào trang. */
export const OFFLINE_GRACE_MS = 1500;

/** RTDB `.info/connected`; `null` = chưa biết. */
function useRtdbConnected(): boolean | null {
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = onValue(
        ref(getClientDatabase(), ".info/connected"),
        (snap) => setConnected(snap.val() === true),
        () => setConnected(false),
      );
    } catch {
      // không có RTDB → coi như chưa biết
    }
    return () => unsubscribe?.();
  }, []);
  return connected;
}

/**
 * SCR-04 #22: `true` khi RTDB mất kết nối (sau thời gian chờ ngắn) hoặc listener Firestore lỗi (`snapshotError`).
 * Biến mất ngay khi kết nối lại.
 */
export function useConnection(snapshotError: boolean): boolean {
  const connected = useRtdbConnected();
  const [graceOver, setGraceOver] = useState(false);
  const rtdbLost = connected === false;

  useEffect(() => {
    if (!rtdbLost) return;
    const id = setTimeout(() => setGraceOver(true), OFFLINE_GRACE_MS);
    return () => {
      clearTimeout(id);
      setGraceOver(false);
    };
  }, [rtdbLost]);

  return snapshotError || (rtdbLost && graceOver);
}

/** `?debug=offline|online` — CHỈ dev (QC giả lập rớt/nối lại mạng): `goOffline`/`disableNetwork` hoặc ngược lại. */
export function useDebugConnection(): void {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const mode = new URLSearchParams(window.location.search).get("debug");
    if (mode !== "offline" && mode !== "online") return;
    const db = getClientDatabase();
    const firestore = getClientFirestore();
    console.debug("[conn]", { debug: mode });
    if (mode === "offline") {
      goOffline(db);
      void disableNetwork(firestore).catch(() => undefined);
    } else {
      goOnline(db);
      void enableNetwork(firestore).catch(() => undefined);
    }
  }, []);
}
