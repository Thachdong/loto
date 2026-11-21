"use server";

import { defineAction } from "@/core/server/action";
import { createRoom } from "@/features/room/server/services/room.service";
import { CreateRoomInput } from "@/features/room/shared/schemas/create-room";

/** api-contract › createRoom (`POST /rooms`). */
export const createRoomAction = defineAction({
  name: "createRoom",
  input: CreateRoomInput,
  auth: "required",
  handler: ({ input, uid }) => createRoom(uid, input),
});
