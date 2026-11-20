"use server";

import { AppError, defineAction } from "@/core/server/action";
import { CreateSessionInput } from "@/features/auth/shared/schemas/create-session";
import type { SessionResult } from "@/features/auth/shared/types";

// TODO(S3): implement — gọi session.service.createSession
export const createSessionAction = defineAction({
  name: "createSession",
  input: CreateSessionInput,
  auth: "none",
  handler: async (): Promise<SessionResult> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
