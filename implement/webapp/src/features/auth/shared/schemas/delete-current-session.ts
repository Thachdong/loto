import { z } from "zod";

/** api-contract › deleteCurrentSession (`DELETE /sessions/current`) — không có body. */
export const DeleteCurrentSessionInput = z.strictObject({});

export type DeleteCurrentSessionInput = z.infer<typeof DeleteCurrentSessionInput>;
