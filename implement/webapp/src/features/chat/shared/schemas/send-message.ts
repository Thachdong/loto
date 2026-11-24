import { z } from "zod";

/** api-contract › sendMessage. Zod chỉ kiểm kiểu; rỗng/dài kiểm ở nghiệp vụ (`normalizeMessage`) để trả mã 422 riêng. */
export const SendMessageInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  text: z.string().max(10_000),
});

export type SendMessageInput = z.infer<typeof SendMessageInput>;
