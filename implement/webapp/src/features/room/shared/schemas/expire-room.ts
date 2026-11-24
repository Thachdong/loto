import { z } from "zod";

/** api-contract › expireRoom: path `roomId`. */
export const ExpireRoomInput = z.strictObject({
  roomId: z.string().min(1).max(128),
});

export type ExpireRoomInput = z.infer<typeof ExpireRoomInput>;
