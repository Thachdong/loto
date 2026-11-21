import { formatTimeVN } from "@/core/shared/time";

/**
 * Giờ hết hạn link mời theo GMT+7 (NFR-16): "HH:mm"; khác ngày với `now` (GMT+7) → "HH:mm dd/MM".
 */
export function formatInviteExpiry(expiresAt: Date, now: Date): string {
  const time = formatTimeVN(expiresAt, "HH:mm");
  const expiryDay = formatTimeVN(expiresAt, "dd/MM HH:mm").slice(0, 5);
  const today = formatTimeVN(now, "dd/MM HH:mm").slice(0, 5);
  return expiryDay === today ? time : `${time} ${expiryDay}`;
}
