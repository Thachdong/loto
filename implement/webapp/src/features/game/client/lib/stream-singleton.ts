import "client-only";

import { toast } from "sonner";
import { getClientAuth } from "@/core/client/firebase";
import { t } from "@/core/shared/i18n/vi";
import { createStreamPlayer, type StreamPlayer } from "./stream-player";

/** Gốc stream server (`stream/server.ts`), VD `https://stream.example.com`. */
export const STREAM_BASE_URL = (process.env.NEXT_PUBLIC_AUDIO_STREAM_URL ?? "http://localhost:8787").replace(/\/$/, "");

let player: StreamPlayer | null = null;

/** Player dùng chung cả trang; URL kèm Firebase ID token (server kiểm user đang ở phòng). */
export function getStreamPlayer(): StreamPlayer {
  player =
    player ??
    createStreamPlayer({
      streamUrl: async (roomId) => {
        const user = getClientAuth().currentUser;
        if (!user) return null;
        const token = await user.getIdToken();
        return `${STREAM_BASE_URL}/rooms/${encodeURIComponent(roomId)}/stream?token=${encodeURIComponent(token)}`;
      },
      onLoadError: () => toast.error(t("sound.loadFailed")),
    });
  return player;
}
