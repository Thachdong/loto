import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { TICKET_IDS, ticketColorOf } from "@/features/ticket/shared/constants";
import { TICKET_PALETTE } from "@/features/ticket/client/lib/ticket-colors";

/** Loading (SCR-05 §4): 16 thẻ skeleton theo màu. */
export function TicketSkeleton() {
  return (
    <div data-testid="ticket-skeleton" aria-busy="true" className="grid grid-cols-4 gap-2">
      <span className="sr-only">{t("common.loading")}</span>
      {TICKET_IDS.map((id) => (
        <Skeleton
          key={id}
          className="h-[88px] rounded-lg border-t-4 opacity-70"
          style={{ borderColor: TICKET_PALETTE[ticketColorOf(id)].base }}
        />
      ))}
    </div>
  );
}
