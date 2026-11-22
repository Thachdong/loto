"use server";

import { AppError, defineAction } from "@/core/server/action";
import { ExpireRoomInput } from "@/features/room/shared/schemas/expire-room";
import type { RoomExpireResult } from "@/features/room/shared/types";

/** api-contract › expireRoom. Stub của bước contract (S1) — bước backend thay bằng service. */
export const expireRoomAction = defineAction({
  name: "expireRoom",
  input: ExpireRoomInput,
  auth: "required",
  handler: async (): Promise<RoomExpireResult> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
