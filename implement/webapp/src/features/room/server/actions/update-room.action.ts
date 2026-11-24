"use server";

import { defineAction } from "@/core/server/action";
import { updateRoom } from "@/features/room/server/services/room-settings.service";
import { UpdateRoomInput } from "@/features/room/shared/schemas/update-room";

/** api-contract › updateRoom. */
export const updateRoomAction = defineAction({
  name: "updateRoom",
  input: UpdateRoomInput,
  auth: "required",
  handler: ({ input, uid }) => updateRoom(uid, input),
});
