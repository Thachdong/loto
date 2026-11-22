"use server";

import { defineAction } from "@/core/server/action";
import { expireRoom } from "@/features/room/server/services/room-expire.service";
import { ExpireRoomInput } from "@/features/room/shared/schemas/expire-room";

/** api-contract › expireRoom. */
export const expireRoomAction = defineAction({
  name: "expireRoom",
  input: ExpireRoomInput,
  auth: "required",
  handler: ({ input, uid }) => expireRoom(uid, input),
});
