import { Avatar, AvatarFallback, AvatarImage } from "@/core/client/ui/avatar";
import { t } from "@/core/shared/i18n/vi";
import { TICKET_PALETTE } from "@/features/ticket/client/lib/ticket-colors";
import { ticketLabel } from "@/features/ticket/client/lib/ticket-label";
import type { TicketCardVM } from "@/features/ticket/shared/types";
import { TicketThumb } from "./ticket-thumb";

type Props = { card: TicketCardVM; onSelect: (card: TicketCardVM) => void };

/** SCR-05 #3: thẻ vé — thu nhỏ, nhãn màu/cạnh, người giữ hoặc "Trống", viền đậm + "Bạn" nếu của tôi. */
export function TicketCard({ card, onSelect }: Props) {
  const label = ticketLabel(card.id);
  const holderName = card.holder?.displayName ?? t("ticket.empty");
  const palette = TICKET_PALETTE[card.color];

  return (
    <button
      type="button"
      data-testid={`ticket-card-${card.id}`}
      data-mine={card.mine ? "true" : undefined}
      aria-label={t("ticket.holderAria", { label, holder: holderName })}
      onClick={() => onSelect(card)}
      className={`flex min-h-[44px] min-w-0 flex-col gap-1 rounded-lg border bg-card p-1 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
        card.mine ? "border-2" : ""
      }`}
      style={card.mine ? { borderColor: palette.base } : undefined}
    >
      <TicketThumb color={card.color} grid={card.ticket?.grid ?? null} />
      <span className="flex items-center justify-between gap-1 text-xs font-semibold">
        <span className="truncate">{label}</span>
        {card.mine && (
          <span className="rounded px-1 text-[10px] leading-4 font-bold" style={{ backgroundColor: palette.base, color: palette.onBase }}>
            {t("ticket.mine")}
          </span>
        )}
      </span>
      <span data-testid={`ticket-holder-${card.id}`} className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
        {card.holder ? (
          <>
            <Avatar className="size-4">
              {card.holder.photoUrl && <AvatarImage src={card.holder.photoUrl} alt="" />}
              <AvatarFallback className="text-[8px]">{card.holder.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate">{card.holder.displayName}</span>
          </>
        ) : (
          <span>{t("ticket.empty")}</span>
        )}
      </span>
      {card.lockedUntilEnd && <span className="text-[10px] leading-3 text-amber-600">{t("ticket.lockedUntilEnd")}</span>}
    </button>
  );
}
