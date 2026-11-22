import { z } from "zod";

/** api-contract › startGame: path `roomId`, `gameId`. */
export const StartGameInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  gameId: z.string().min(1).max(128),
});

export type StartGameInput = z.infer<typeof StartGameInput>;
