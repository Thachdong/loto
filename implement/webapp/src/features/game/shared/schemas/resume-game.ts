import { z } from "zod";

/** api-contract › resumeGame: path `roomId`, `gameId`. */
export const ResumeGameInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  gameId: z.string().min(1).max(128),
});

export type ResumeGameInput = z.infer<typeof ResumeGameInput>;
