"use client";

import "client-only";

import { useSyncExternalStore } from "react";

export type PlayMode = "manual" | "auto";
/** `[ASSUMED]` tên key (Q-047): `manual` (mặc định) | `auto`. T-012 làm màn đổi mode. */
export const PLAY_MODE_KEY = "loto:mode";

function read(): PlayMode {
  try {
    return window.localStorage.getItem(PLAY_MODE_KEY) === "auto" ? "auto" : "manual";
  } catch {
    return "manual";
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Mode dò hiện tại từ localStorage (đổi từ tab khác cũng cập nhật). */
export function usePlayMode(): PlayMode {
  return useSyncExternalStore(subscribe, read, () => "manual");
}
