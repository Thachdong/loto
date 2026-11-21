/** Chỉ nhận đường dẫn nội bộ `/join/{22 ký tự base62}` (SCR-01 §5, Q-050) — chống open redirect. */
const RETURN_TO_PATTERN = /^\/join\/[0-9A-Za-z]{22}$/;

export function parseReturnTo(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  return RETURN_TO_PATTERN.test(raw) ? raw : null;
}
