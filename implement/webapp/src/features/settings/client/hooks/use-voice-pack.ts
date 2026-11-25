"use client";

import "client-only";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/core/shared/action-result";
import { t } from "@/core/shared/i18n/vi";
import { updateRoomAction } from "@/features/room/server/actions/update-room.action";
import type { VoicePackId } from "@/features/room/shared/domain/voice-pack";
import type { RoomSettings } from "@/features/room/shared/types";

type Update = (input: { roomId: string; voicePack: VoicePackId }) => Promise<ActionResult<RoomSettings>>;

export type VoicePackState = { value: VoicePackId; change: (id: VoicePackId) => void; pending: boolean };

/** SCR-11: host đổi bộ giọng rao — lạc quan, lỗi → về giá trị server + toast. Stream áp dụng từ câu rao kế tiếp. */
export function useVoicePack(roomId: string, serverValue: VoicePackId, update: Update = updateRoomAction): VoicePackState {
  const [draft, setDraft] = useState<VoicePackId | null>(null);
  const [pending, setPending] = useState(false);

  const change = useCallback(
    async (id: VoicePackId) => {
      setDraft(id);
      setPending(true);
      let result: ActionResult<RoomSettings> | null = null;
      try {
        result = await update({ roomId, voicePack: id });
      } catch {
        result = null;
      }
      if (!result || !result.ok) toast.error(t("settings.voicePackFailed"));
      setDraft(null);
      setPending(false);
    },
    [roomId, update],
  );

  return { value: draft ?? serverValue, change: (id) => void change(id), pending };
}
