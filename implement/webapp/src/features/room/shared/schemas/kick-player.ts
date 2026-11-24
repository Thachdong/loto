import { z } from "zod";

/** api-contract › kickPlayer: path `roomId`, `uid`. */
export const KickPlayerInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  uid: z.string().min(1).max(128),
});

export type KickPlayerInput = z.infer<typeof KickPlayerInput>;
