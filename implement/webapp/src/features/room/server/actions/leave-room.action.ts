"use server";

import { defineAction } from "@/core/server/action";
import { leaveRoom } from "@/features/room/server/services/room-leave.service";
import { LeaveRoomInput } from "@/features/room/shared/schemas/leave-room";

/** api-contract › leaveRoom. */
export const leaveRoomAction = defineAction({
  name: "leaveRoom",
  input: LeaveRoomInput,
  auth: "required",
  handler: ({ input, uid }) => leaveRoom(uid, input),
});
