import { z } from "zod";
import { INVITE_CODE_PATTERN, ROOM_CODE_PATTERN } from "@/features/room/shared/constants";

/**
 * api-contract › JoinRoomRequest: đúng 1 trong `inviteCode` (link, 22 ký tự base62) hoặc `roomCode`
 * (mã phòng 6 ký tự gõ tay, client đã chuẩn hóa in hoa — Q-056). Gửi cả hai / không gửi key nào → `VALIDATION_FAILED`.
 */
export const JoinRoomInput = z.union([
  z.strictObject({ inviteCode: z.string().regex(INVITE_CODE_PATTERN) }),
  z.strictObject({ roomCode: z.string().regex(ROOM_CODE_PATTERN) }),
]);

export type JoinRoomInput = z.infer<typeof JoinRoomInput>;
