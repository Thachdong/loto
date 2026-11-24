"use server";

import { defineAction } from "@/core/server/action";
import { sendMessage } from "@/features/chat/server/services/chat.service";
import { SendMessageInput } from "@/features/chat/shared/schemas/send-message";

/** api-contract › sendMessage. */
export const sendMessageAction = defineAction({
  name: "sendMessage",
  input: SendMessageInput,
  auth: "required",
  handler: ({ input, uid }) => sendMessage(uid, input),
});
