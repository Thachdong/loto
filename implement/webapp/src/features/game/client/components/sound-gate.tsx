"use client";

import { useEffect, useState } from "react";
import { t } from "@/core/shared/i18n/vi";
import type { AudioEngine } from "@/features/game/client/lib/audio-engine";
import { getAudioEngine } from "@/features/game/client/lib/audio-singleton";
import { isSoundOn, markSoundUnlocked, wasSoundUnlocked } from "@/features/game/client/lib/sound-pref";

type Props = { engine?: AudioEngine };

/**
 * SCR-04 #18 / A1: lớp "Chạm để bật tiếng" hiện lần đầu vào phòng trong phiên khi tiếng đang Bật (NFR-14).
 * Chạm → tạo `AudioContext` + tải kho tiếng. Đã chạm trong phiên (tải lại trang) → thử mở lại ngay, nếu trình duyệt
 * chưa cho thì mở ở lần chạm đầu bất kỳ. Tải lỗi → toast, vẫn chơi bằng hình.
 */
export function SoundGate({ engine }: Props) {
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && isSoundOn() && !wasSoundUnlocked());
  const audio = engine ?? getAudioEngine();

  useEffect(() => {
    if (!isSoundOn() || !wasSoundUnlocked()) return;
    let cancelled = false;
    const tryUnlock = () => {
      void audio.unlock().then(() => {
        if (!cancelled && audio.contextState() === "suspended") {
          document.addEventListener("pointerdown", onTouch, { once: true });
        }
      });
    };
    const onTouch = () => void audio.unlock().then(() => undefined);
    tryUnlock();
    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", onTouch);
    };
  }, [audio]);

  if (!visible) return null;

  const enable = () => {
    markSoundUnlocked();
    setVisible(false);
    void audio.unlock();
  };

  return (
    <button
      type="button"
      data-testid="sound-gate"
      onClick={enable}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 text-xl font-bold text-white"
    >
      {t("sound.gate")}
    </button>
  );
}
