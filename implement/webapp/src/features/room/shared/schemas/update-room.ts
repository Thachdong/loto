import { z } from "zod";
import { VoicePackInput } from "./create-room";

/** api-contract › updateRoom: host đổi giọng rao (nhịp quay 5/10/15 đã bỏ — nhịp theo audio, ADR-05 sửa đổi). */
export const UpdateRoomInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  voicePack: VoicePackInput,
});

export type UpdateRoomInput = z.infer<typeof UpdateRoomInput>;
