import { t } from "@/core/shared/i18n/vi";
import { ticketParts } from "@/features/game/client/lib/ticket-text";
import type { ClaimView } from "@/features/room/shared/types";

type Props = { claims: ClaimView[] };

/**
 * Thẻ tạm `awaiting_confirm` (T-006; T-007 thay bằng SCR-09): "{tên} KINH!" + danh sách lượt KINH
 * kèm gợi ý đủ/chưa đủ hàng, KHÔNG có nút host. Nằm phía trên vé, không che vé và thanh KINH.
 */
export function ClaimCard({ claims }: Props) {
  if (claims.length === 0) return null;
  return (
    <section
      data-testid="claim-card"
      className="max-h-[112px] shrink-0 overflow-y-auto rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-950"
    >
      <p className="text-sm leading-tight font-bold">{t("claim.title", { name: claims[0].displayName })}</p>
      <p className="text-xs leading-tight">{t("claim.waitingHost")}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {claims.map((c) => (
          <li
            key={`${c.uid}-${c.ticketId}`}
            data-testid={`claim-item-${c.uid}-${c.ticketId}`}
            data-result={c.result}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="truncate">{t("claim.item", { name: c.displayName, ...ticketParts(c.ticketId, c.color) })}</span>
            <span className="shrink-0 font-medium">{c.result === "win" ? t("claim.hintWin") : t("claim.hintMiss")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
