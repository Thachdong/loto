import { vi } from "./i18n/vi";

/**
 * Bảng mã lỗi nghiệp vụ — nguồn: specs/api-contract.yml › info.description › Bảng mã lỗi.
 * Message tiếng Việt lấy từ `vi.error`.
 */
const HTTP_STATUS = {
  VALIDATION_FAILED: 400,
  GOOGLE_TOKEN_INVALID: 401,
  UNAUTHENTICATED: 401,
  NOT_ROOM_MEMBER: 403,
  NOT_ROOM_HOST: 403,
  BLOCKED_FROM_ROOM: 403,
  NOT_TICKET_HOLDER: 403,
  INVITE_INVALID: 404,
  TICKET_NOT_FOUND: 404,
  PLAYER_NOT_FOUND: 404,
  ALREADY_IN_ROOM: 409,
  INVITE_EXPIRED: 410,
  ROOM_FULL: 409,
  ROOM_CODE_INVALID: 404,
  DRAW_TOO_EARLY: 409,
  ROOM_NOT_EXPIRED: 409,
  ROOM_CLOSING: 409,
  GAME_STALE: 409,
  GAME_NOT_WAITING: 409,
  GAME_NOT_RUNNING: 409,
  GAME_NOT_PAUSED: 409,
  GAME_NOT_AWAITING_CONFIRM: 409,
  CLAIMS_CLOSED: 409,
  TICKET_ALREADY_CLAIMED: 409,
  CLAIM_HAS_WIN: 409,
  NO_WINNING_CLAIM: 409,
  TICKET_TAKEN: 409,
  TICKET_NOT_HELD: 409,
  TICKETS_STILL_HELD: 409,
  TARGET_ONLINE: 409,
  NO_TICKETS_HELD: 422,
  TICKET_LIMIT_REACHED: 422,
  CANNOT_TARGET_SELF: 422,
  ROOM_NAME_INVALID: 422,
  DRAW_INTERVAL_INVALID: 422,
  DISPLAY_NAME_INVALID: 422,
  AVATAR_INVALID: 422,
  MESSAGE_EMPTY: 422,
  MESSAGE_TOO_LONG: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const satisfies Record<keyof typeof vi.error, number>;

export type ErrorCode = keyof typeof HTTP_STATUS;

export type ErrorCodeInfo = { http: number; message: string };

export const ERROR_CODES = Object.fromEntries(
  (Object.keys(HTTP_STATUS) as ErrorCode[]).map((code) => [
    code,
    { http: HTTP_STATUS[code], message: vi.error[code] },
  ]),
) as Record<ErrorCode, ErrorCodeInfo>;

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(HTTP_STATUS, value);
}
