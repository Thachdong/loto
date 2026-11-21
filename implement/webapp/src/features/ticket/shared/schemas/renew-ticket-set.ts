import { z } from "zod";

/** api-contract › renewTicketSet: path `roomId`. */
export const RenewTicketSetInput = z.strictObject({
  roomId: z.string().min(1).max(128),
});

export type RenewTicketSetInput = z.infer<typeof RenewTicketSetInput>;
