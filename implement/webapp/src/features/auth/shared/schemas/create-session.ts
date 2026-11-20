import { z } from "zod";

/** api-contract › SessionCreate. ID token Firebase ~1–1.5 KB; 4096 chặn payload quá lớn. */
export const CreateSessionInput = z.strictObject({
  idToken: z.string().min(1).max(4096),
});

export type CreateSessionInput = z.infer<typeof CreateSessionInput>;
