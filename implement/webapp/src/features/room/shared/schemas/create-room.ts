import { z } from "zod";

/**
 * api-contract › RoomCreate. Zod chỉ kiểm kiểu; độ dài 1–50 sau trim kiểm ở service → `ROOM_NAME_INVALID`.
 * `.max(200)` chặn payload quá lớn trước khi trim.
 */
export const CreateRoomInput = z.strictObject({
  name: z.string().max(200).optional(),
});

export type CreateRoomInput = z.infer<typeof CreateRoomInput>;
