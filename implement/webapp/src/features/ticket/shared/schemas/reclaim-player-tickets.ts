import { z } from "zod";

/** api-contract › reclaimPlayerTickets: path `roomId`, `uid`. */
export const ReclaimPlayerTicketsInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  uid: z.string().min(1).max(128),
});

export type ReclaimPlayerTicketsInput = z.infer<typeof ReclaimPlayerTicketsInput>;
