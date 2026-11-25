"use client";

import { useEffect, useState } from "react";
import { t } from "@/core/shared/i18n/vi";
import type { StreamPlayer } from "@/features/game/client/lib/stream-player";
import { getStreamPlayer } from "@/features/game/client/lib/stream-singleton";
import { isSoundOn, markSoundUnlocked, wasSoundUnlocked } from "@/features/game/client/lib/sound-pref";

type Props = { engine?: StreamPlayer };

/**
 * SCR-04 #18 / A1: lớp "Chạm để bật tiếng" hiện lần đầu vào phòng trong phiên khi tiếng đang Bật (NFR-14).
 * Chạm → bắt đầu phát luồng tiếng rao của phòng. Đã chạm trong phiên (tải lại trang) → thử mở lại ngay, nếu trình duyệt
 * chưa cho thì mở ở lần chạm đầu bất kỳ. Tải lỗi → toast, vẫn chơi bằng hình.
 */
export function SoundGate({ engine }: Props) {
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && isSoundOn() && !wasSoundUnlocked());
  const audio = engine ?? getStreamPlayer();

  useEffect(() => {
    if (!isSoundOn() || !wasSoundUnlocked()) return;
    let cancelled = false;
    const tryUnlock = () => {
      void audio.unlock().then(() => {
        if (!cancelled && audio.isBlocked()) {
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
