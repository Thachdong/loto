"use server";

import { AppError, defineAction } from "@/core/server/action";
import { LeaveRoomInput } from "@/features/room/shared/schemas/leave-room";


/** api-contract › leaveRoom. Stub của bước contract (S1) — bước backend thay bằng service. */
export const leaveRoomAction = defineAction({
  name: "leaveRoom",
  input: LeaveRoomInput,
  auth: "required",
  handler: async (): Promise<null> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
