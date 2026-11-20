import "server-only";

/**
 * uid của phiên hiện tại, hoặc null khi chưa đăng nhập.
 * T-001: chưa có phiên — luôn null. T-002 hiện thực bằng session cookie (ADR-07).
 */
export async function getSessionUid(): Promise<string | null> {
  return null;
}
