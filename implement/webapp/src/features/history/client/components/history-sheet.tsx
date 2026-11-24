"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/core/client/ui/avatar";
import { Button } from "@/core/client/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/core/client/ui/sheet";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { useGameHistory } from "@/features/history/client/hooks/use-game-history";
import type { HistoryCard } from "@/features/history/shared/domain/history-card";
import { TICKET_PALETTE } from "@/features/ticket/client";

type Props = {
  roomId: string;
  open: boolean;
  onClose: () => void;
  /** Khoảng đáy chừa cho thanh KINH + thanh nút dưới. */
  bottom: number;
};

/** SCR-08 Lịch sử ván (sheet trên SCR-04): thẻ ván mới nhất trên cùng, người thắng hoặc "Không ai thắng" / "Đã hủy". */
export function HistorySheet({ roomId, open, onClose, bottom }: Props) {
  const history = useGameHistory(roomId, open);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        data-testid="history-sheet"
        className="mx-auto h-[70dvh] max-w-[480px] gap-2 rounded-t-xl"
        style={{ bottom }}
      >
        <SheetHeader className="pb-0">
          <SheetTitle>{t("history.title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("history.title")}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
          <HistoryBody state={history} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HistoryBody({ state }: { state: ReturnType<typeof useGameHistory> }) {
  if (state.status === "error" && state.cards.length === 0) {
    return (
      <div data-testid="history-error" className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm">{t("history.error")}</p>
        <Button type="button" variant="outline" onClick={state.retry}>
          {t("history.retry")}
        </Button>
      </div>
    );
  }
  if (state.status !== "ready" && state.cards.length === 0) {
    return (
      <div data-testid="history-loading" aria-busy="true" className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (state.cards.length === 0) {
    return (
      <div data-testid="history-empty" className="flex flex-col items-center gap-1 py-8 text-center">
        <p className="text-base font-medium">{t("history.empty")}</p>
        <p className="text-sm text-muted-foreground">{t("history.emptyHint")}</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {state.cards.map((card) => (
        <HistoryCardItem key={card.gameId} card={card} />
      ))}
    </ul>
  );
}

function HistoryCardItem({ card }: { card: HistoryCard }) {
  const time =
    card.time.kind === "range"
      ? `${card.time.from} – ${card.time.to}`
      : card.time.kind === "cancelled"
        ? t("history.cancelledAt", { time: card.time.at })
        : "";
  return (
    <li data-testid={`history-card-${card.seqNo}`} data-outcome={card.outcome} className="rounded-lg border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold">{t("history.game", { n: card.seqNo })}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{time}</span>
      </div>
      {card.outcome === "won" ? (
        <ul className="mt-1.5 flex flex-col gap-1">
          {card.winners.map((w) => (
            <li key={`${w.uid}-${w.ticketId}`} data-testid={`history-winner-${card.seqNo}-${w.uid}`} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true">🏆</span>
              <Avatar className="size-6">
                {w.photoUrl && <AvatarImage src={w.photoUrl} alt="" />}
                <AvatarFallback className="text-[11px]">{w.initial}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate font-medium">{w.displayName}</span>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: TICKET_PALETTE[w.color]?.base, color: TICKET_PALETTE[w.color]?.onBase }}
              >
                {t("history.ticket", { color: t(`ticket.color.${w.color}`), side: t(w.ticketId.endsWith("_a") ? "ticket.side.a" : "ticket.side.b") })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          {card.outcome === "cancelled" ? t("history.cancelled") : t("history.noWinner")}
        </p>
      )}
    </li>
  );
}
