import "client-only";

import { LEAVE_REASON_STORAGE_KEY } from "@/features/room/shared/constants";
import type { LeaveReason, LeaveReasonRecord } from "@/features/room/shared/types";

/**
 * Lý do vừa rời phòng (SCR-02 banner 4, Q-050) lưu ở `sessionStorage['loto:leaveReason']`.
 * Mọi truy cập bọc try/catch (chế độ riêng tư / storage bị chặn). Thay đổi trong tab được báo qua `subscribe`.
 */
const REASONS: readonly LeaveReason[] = ["kicked", "expired", "host_left", "left", "unknown"];
const CHANGE_EVENT = "loto:leave-reason-change";

let cachedRaw: string | null = null;
let cachedValue: LeaveReasonRecord | null = null;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function parseLeaveReason(raw: string | null): LeaveReasonRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const { reason, roomName } = value as Record<string, unknown>;
    if (typeof reason !== "string" || !REASONS.includes(reason as LeaveReason)) return null;
    return { reason: reason as LeaveReason, roomName: typeof roomName === "string" ? roomName : null };
  } catch {
    return null;
  }
}

/** Đọc bản ghi hiện tại; cùng chuỗi trong storage → trả cùng object (dùng được cho `useSyncExternalStore`). */
export function readLeaveReason(): LeaveReasonRecord | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(LEAVE_REASON_STORAGE_KEY) ?? null;
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseLeaveReason(raw);
  }
  return cachedValue;
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function writeLeaveReason(record: LeaveReasonRecord): void {
  try {
    storage()?.setItem(LEAVE_REASON_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage bị chặn → bỏ qua, banner không hiện.
  }
  notify();
}

export function clearLeaveReason(): void {
  try {
    storage()?.removeItem(LEAVE_REASON_STORAGE_KEY);
  } catch {
    // bỏ qua
  }
  notify();
}

export function subscribeLeaveReason(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}
