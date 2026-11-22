import { z } from "zod";

/** api-contract › leaveRoom: path `roomId`. */
export const LeaveRoomInput = z.strictObject({
  roomId: z.string().min(1).max(128),
});

export type LeaveRoomInput = z.infer<typeof LeaveRoomInput>;
