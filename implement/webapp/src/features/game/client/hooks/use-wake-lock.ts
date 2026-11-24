"use client";

import "client-only";

import { useEffect } from "react";

export type WakeLockState = "active" | "released" | "unsupported";

function mark(state: WakeLockState) {
  document.documentElement.dataset.wakelock = state;
}

/**
 * NFR-15: giữ màn hình sáng khi `active` (ván `running`), nhả khi không; xin lại khi tab hiện lại.
 * Ghi `document.documentElement.dataset.wakelock = active | released | unsupported` để kiểm thử.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) {
      mark("released");
      return;
    }
    const wakeLock = typeof navigator !== "undefined" ? navigator.wakeLock : undefined;
    if (!wakeLock) {
      mark("unsupported");
      return;
    }
    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;

    const acquire = async () => {
      if (cancelled || sentinel || document.visibilityState !== "visible") return;
      try {
        const lock = await wakeLock.request("screen");
        if (cancelled) {
          void lock.release().catch(() => undefined);
          return;
        }
        sentinel = lock;
        mark("active");
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
          if (!cancelled) mark("released");
        });
      } catch {
        if (!cancelled) mark("released");
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
      mark("released");
    };
  }, [active]);
}
