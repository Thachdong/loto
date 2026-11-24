"use client";

import "client-only";

import { useSyncExternalStore } from "react";
import { isSoundOn, SOUND_EVENT } from "@/features/game/client/lib/sound-pref";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SOUND_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SOUND_EVENT, onChange);
  };
}

/** Bật/tắt tiếng hiện tại (localStorage `loto:sound`), cập nhật khi đổi ở tab này hoặc tab khác. */
export function useSoundOn(): boolean {
  return useSyncExternalStore(subscribe, isSoundOn, () => true);
}
