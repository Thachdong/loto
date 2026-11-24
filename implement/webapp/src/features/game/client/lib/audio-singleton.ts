import "client-only";

import { toast } from "sonner";
import { t } from "@/core/shared/i18n/vi";
import { createAudioEngine, type AudioEngine } from "./audio-engine";

let engine: AudioEngine | null = null;

/** Engine dùng chung cho cả trang (AudioContext tạo 1 lần sau lần chạm đầu); tải lỗi → toast, vẫn chơi bằng hình. */
export function getAudioEngine(): AudioEngine {
  engine = engine ?? createAudioEngine({ onLoadError: () => toast.error(t("sound.loadFailed")) });
  return engine;
}
