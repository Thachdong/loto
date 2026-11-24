import { z } from "zod";

/** api-contract › confirmGame: path `roomId`, `gameId`. */
export const ConfirmGameInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  gameId: z.string().min(1).max(128),
});

export type ConfirmGameInput = z.infer<typeof ConfirmGameInput>;
