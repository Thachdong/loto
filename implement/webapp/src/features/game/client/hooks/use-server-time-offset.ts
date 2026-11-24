"use client";

import "client-only";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { getClientDatabase } from "@/core/client/firebase";

/**
 * `serverTime − localTime` (ms) từ RTDB `.info/serverTimeOffset` (ADR-05, ❓1). Chưa biết / lỗi → 0.
 * Dùng quy đổi `next_call_at` (giờ server) sang giờ máy cho scheduler và đếm ngược.
 */
export function useServerTimeOffset(): number {
  const [offsetMs, setOffsetMs] = useState(0);
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = onValue(
        ref(getClientDatabase(), ".info/serverTimeOffset"),
        (snap) => {
          const value = snap.val();
          if (typeof value === "number" && Number.isFinite(value)) setOffsetMs(value);
        },
        () => undefined,
      );
    } catch {
      // không có RTDB (test / SSR) → giữ 0
    }
    return () => unsubscribe?.();
  }, []);
  return offsetMs;
}
