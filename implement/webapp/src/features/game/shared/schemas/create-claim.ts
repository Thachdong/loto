import { z } from "zod";
import { TICKET_ID_PATTERN } from "@/features/ticket/shared/constants";

/** api-contract › createClaim: path `roomId`, `gameId`; body `ticketId`. */
export const CreateClaimInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  gameId: z.string().min(1).max(128),
  ticketId: z.string().max(32).regex(TICKET_ID_PATTERN),
});

export type CreateClaimInput = z.infer<typeof CreateClaimInput>;
