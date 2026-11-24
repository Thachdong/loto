import { z } from "zod";

/** api-contract › rejectClaims: path `roomId`, `gameId`. */
export const RejectClaimsInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  gameId: z.string().min(1).max(128),
});

export type RejectClaimsInput = z.infer<typeof RejectClaimsInput>;
