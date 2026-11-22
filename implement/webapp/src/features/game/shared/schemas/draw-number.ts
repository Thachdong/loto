import { z } from "zod";

/** api-contract › drawNumber: `seq` = số lượng số đã rao client thấy (0–89, ván kết thúc khi rao số 90). */
export const DrawNumberInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  gameId: z.string().min(1).max(128),
  seq: z.number().int().min(0).max(89),
});

export type DrawNumberInput = z.infer<typeof DrawNumberInput>;
