import { z } from "zod";

/** api-contract › pauseGame: path `roomId`, `gameId`. */
export const PauseGameInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  gameId: z.string().min(1).max(128),
});

export type PauseGameInput = z.infer<typeof PauseGameInput>;
