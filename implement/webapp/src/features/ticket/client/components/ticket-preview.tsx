import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/core/client/ui/button";
import { t } from "@/core/shared/i18n/vi";
import { ticketLabel } from "@/features/ticket/client/lib/ticket-label";
import type { TicketCardVM, TicketAction } from "@/features/ticket/shared/types";
import { PaperTicket } from "./paper-ticket";

type Props = {
  card: TicketCardVM;
  /** Người giữ vé cặp (null = Trống). */
  partnerHolderName: string | null;
  /** Khóa thao tác đang chạy (`take:…`/`release:…`) hoặc null. */
  pending: string | null;
  onBack: () => void;
  onTake: () => void;
  onRelease: () => void;
};

const DISABLED_LABEL: Record<Exclude<TicketAction, "take" | "release">, string> = {
  max: "ticket.takeMax",
  taken: "ticket.takeTaken",
  running: "ticket.takeRunning",
};

/** SCR-05 #4–#6: xem trước vé giấy 9×9 + dòng phụ + nút Lấy/Bỏ vé. */
export function TicketPreview({ card, partnerHolderName, pending, onBack, onTake, onRelease }: Props) {
  const busy = pending !== null;
  const taking = pending === `take:${card.id}`;
  const releasing = pending === `release:${card.id}`;
  const holder = card.holder?.displayName ?? t("ticket.empty");
  const partnerLabel = ticketLabel(card.partnerId);

  return (
    <div data-testid="ticket-preview" className="flex flex-col gap-3">
      <Button type="button" variant="ghost" data-testid="ticket-back" className="h-11 self-start px-2 text-base" onClick={onBack}>
        <ChevronLeftIcon aria-hidden="true" />
        {t("ticket.back")}
      </Button>

      {card.ticket ? (
        <PaperTicket id={card.id} grid={card.ticket.grid} />
      ) : (
        <p className="text-center text-sm text-muted-foreground">{t("ticket.loadError")}</p>
      )}

      <p data-testid="ticket-partner-line" className="text-center text-sm text-muted-foreground">
        {t("ticket.partnerLine", { holder, partner: partnerLabel, partnerHolder: partnerHolderName ?? t("ticket.empty") })}
      </p>

      {card.action === "release" && (
        <Button
          type="button"
          variant="outline"
          data-testid="ticket-release"
          className="h-12 w-full text-base"
          disabled={busy}
          onClick={onRelease}
        >
          {releasing ? t("ticket.releasing") : t("ticket.release")}
        </Button>
      )}
      {card.action === "take" && (
        <Button type="button" data-testid="ticket-take" className="h-12 w-full text-base" disabled={busy} onClick={onTake}>
          {taking ? t("ticket.taking") : t("ticket.take")}
        </Button>
      )}
      {card.action !== "take" && card.action !== "release" && (
        <Button type="button" data-testid="ticket-take" className="h-12 w-full text-base" disabled>
          {t(DISABLED_LABEL[card.action] as "ticket.takeMax")}
        </Button>
      )}
    </div>
  );
}
