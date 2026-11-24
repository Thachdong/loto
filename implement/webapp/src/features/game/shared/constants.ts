import { TICKET_IDS } from "@/features/ticket/shared/constants";

/** Thứ tự cố định Đỏ A → Hồng B (Q-052): xác định vai trò dự phòng. */
export const TICKET_ORDER = TICKET_IDS;

/** ADR-05: người dự phòng thứ k gọi `drawNumber` sau `next_call_at + k × 5 giây`. */
export const BACKUP_STEP_MS = 5000;
/** ADR-05: server chấp nhận gọi sớm tối đa 300ms so với `next_call_at`. */
export const DRAW_EARLY_TOLERANCE_MS = 300;
/** BR-14 (Q-059): số người giữ vé tối thiểu để Bắt đầu ván (host có vé cũng tính). */
export const MIN_PLAYERS_TO_START = 2;
/** Tổng số trong ván (1–90). */
export const MAX_NUMBER = 90;
