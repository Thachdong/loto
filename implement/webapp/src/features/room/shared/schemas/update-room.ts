import { z } from "zod";

/** api-contract › updateRoom. Zod chỉ kiểm kiểu (integer); 5 / 10 / 15 kiểm ở nghiệp vụ → `DRAW_INTERVAL_INVALID`. */
export const UpdateRoomInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  drawIntervalSec: z.number().int(),
});

export type UpdateRoomInput = z.infer<typeof UpdateRoomInput>;
