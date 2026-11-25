import { z } from "zod";
import { VOICE_PACKS } from "@/features/room/shared/domain/voice-pack";

export const VoicePackInput = z.enum(VOICE_PACKS.map((p) => p.id) as [string, ...string[]]);

/**
 * api-contract › RoomCreate. Zod chỉ kiểm kiểu; độ dài 1–50 sau trim kiểm ở service → `ROOM_NAME_INVALID`.
 * `.max(200)` chặn payload quá lớn trước khi trim. `voicePack` thiếu → bộ mặc định.
 */
export const CreateRoomInput = z.strictObject({
  name: z.string().max(200).optional(),
  voicePack: VoicePackInput.optional(),
});

export type CreateRoomInput = z.infer<typeof CreateRoomInput>;
