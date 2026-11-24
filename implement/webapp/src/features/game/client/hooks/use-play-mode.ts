"use client";

import "client-only";

import { useSyncExternalStore } from "react";

export type PlayMode = "manual" | "auto";
/** `[ASSUMED]` tên key (Q-047): `manual` (mặc định) | `auto`. T-012 làm màn đổi mode. */
export const PLAY_MODE_KEY = "loto:mode";

/** localStorage bị chặn → giữ mode trong bộ nhớ trang (SCR-11.A1 lỗi). */
let memoryMode: PlayMode | null = null;

function read(): PlayMode {
  try {
    return window.localStorage.getItem(PLAY_MODE_KEY) === "auto" ? "auto" : "manual";
  } catch {
    return memoryMode ?? "manual";
  }
}
/** Sự kiện cùng tab (sự kiện `storage` chỉ bắn ở tab khác). */
const MODE_EVENT = "loto:mode-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(MODE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(MODE_EVENT, onChange);
  };
}

/** Đổi mode dò (nút "Auto" ở thanh KINH); lỗi localStorage → bỏ qua. */
export function setPlayMode(mode: PlayMode): void {
  memoryMode = mode;
  try {
    window.localStorage.setItem(PLAY_MODE_KEY, mode);
  } catch {
    /* bỏ qua */
  }
  window.dispatchEvent(new Event(MODE_EVENT));
}

/** Mode dò hiện tại từ localStorage (đổi từ tab khác cũng cập nhật). */
export function usePlayMode(): PlayMode {
  return useSyncExternalStore(subscribe, read, () => "manual");
}
