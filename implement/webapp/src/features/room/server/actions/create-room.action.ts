"use server";

import { AppError, defineAction } from "@/core/server/action";
import { CreateRoomInput } from "@/features/room/shared/schemas/create-room";
import type { RoomCreated } from "@/features/room/shared/types";

/** api-contract › createRoom (`POST /rooms`). */
export const createRoomAction = defineAction({
  name: "createRoom",
  input: CreateRoomInput,
  auth: "required",
  // TODO(S4): implement — gọi createRoom(uid, input) trong room.service.
  handler: async (): Promise<RoomCreated> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
