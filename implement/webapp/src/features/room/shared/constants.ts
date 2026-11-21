/** Thứ tự màu vé cố định (TBL-03, BR-08). */
export const TICKET_COLORS = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"] as const;

export const ROOM_NAME_MAX = 50;
/** BR-03: phòng tối đa 16 thành viên, kể cả host. */
export const MAX_MEMBERS = 16;
/** BR-04: phòng hết hạn sau 8 giờ. */
export const ROOM_TTL_MS = 8 * 60 * 60 * 1000;
export const DEFAULT_DRAW_INTERVAL_SEC = 5;

/** ADR-09: `invite_code` 22 ký tự base62. */
export const INVITE_CODE_LENGTH = 22;
export const INVITE_CODE_PATTERN = /^[0-9A-Za-z]{22}$/;

/** BR-30: `join_code` 6 ký tự, chữ in hoa + số, bỏ O/0/I/1. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

/** Khóa `sessionStorage` lưu lý do vừa rời phòng (SCR-02 banner 4). */
export const LEAVE_REASON_STORAGE_KEY = "loto:leaveReason";
