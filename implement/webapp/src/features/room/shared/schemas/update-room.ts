import { z } from "zod";
import { VoicePackInput } from "./create-room";

/**
 * api-contract › updateRoom. Zod chỉ kiểm kiểu (integer); 5 / 10 / 15 kiểm ở nghiệp vụ → `DRAW_INTERVAL_INVALID`.
 * Gửi ít nhất một trong `drawIntervalSec` / `voicePack`.
 */
export const UpdateRoomInput = z
  .strictObject({
    roomId: z.string().min(1).max(128),
    drawIntervalSec: z.number().int().optional(),
    voicePack: VoicePackInput.optional(),
  })
  .refine((v) => v.drawIntervalSec !== undefined || v.voicePack !== undefined, { message: "empty_update" });

export type UpdateRoomInput = z.infer<typeof UpdateRoomInput>;
