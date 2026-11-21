"use client";

import { useState } from "react";
import { Button } from "@/core/client/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/core/client/ui/sheet";
import { t } from "@/core/shared/i18n/vi";
import type { GameStatus } from "@/features/room/shared/types";
import { useTicketActions } from "@/features/ticket/client/hooks/use-ticket-actions";
import { useTicketBoard } from "@/features/ticket/client/hooks/use-ticket-board";
import type { StillHeldDetail } from "@/features/ticket/shared/types";
import { RenewConfirmDialog } from "./renew-confirm-dialog";
import { StillHeldDialog } from "./still-held-dialog";
import { TicketCard } from "./ticket-card";
import { TicketPreview } from "./ticket-preview";
import { TicketSkeleton } from "./ticket-skeleton";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  gameId: string | null;
  gameStatus: GameStatus | null;
  meUid: string;
  isHost: boolean;
};

/** SCR-05: sheet "Chọn vé" (#1–#9). Listener chỉ gắn khi sheet mở. */
export function TicketSheet({ open, onOpenChange, roomId, gameId, gameStatus, meUid, isHost }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        data-testid="ticket-sheet"
        className="mx-auto h-[85dvh] max-w-[480px] rounded-t-xl"
      >
        <TicketSheetBody roomId={roomId} gameId={gameId} gameStatus={gameStatus} meUid={meUid} isHost={isHost} />
      </SheetContent>
    </Sheet>
  );
}

type BodyProps = Omit<Props, "open" | "onOpenChange">;

function TicketSheetBody({ roomId, gameId, gameStatus, meUid, isHost }: BodyProps) {
  const { status, board, players, presence, retry } = useTicketBoard(roomId, gameId, gameStatus, meUid);
  const actions = useTicketActions(roomId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stillHeld, setStillHeld] = useState<StillHeldDetail[] | null>(null);

  const selected = selectedId ? (board.cards.find((c) => c.id === selectedId) ?? null) : null;
  const showRenew = isHost && gameStatus === "waiting";

  async function confirmRenew() {
    const outcome = await actions.renew();
    setConfirmOpen(false);
    if (outcome.kind === "still-held") setStillHeld(outcome.details);
  }

  return (
    <>
      <SheetHeader className="flex-row items-start justify-between gap-2 pb-0">
        <div className="flex min-w-0 flex-col gap-1">
          <SheetTitle className="text-lg">{t("ticket.title")}</SheetTitle>
          {status === "ready" && (
            <SheetDescription data-testid="ticket-counter" className="text-sm">
              {t("ticket.counter", { mine: board.myCount, held: board.heldCount })}
            </SheetDescription>
          )}
        </div>
        <SheetClose asChild>
          <Button type="button" variant="ghost" data-testid="ticket-close" className="h-11 shrink-0 px-3 text-base">
            {t("ticket.close")}
          </Button>
        </SheetClose>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6">
        {status === "loading" && <TicketSkeleton />}

        {status === "error" && (
          <div data-testid="ticket-load-error" role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-base">{t("ticket.loadError")}</p>
            <Button type="button" data-testid="ticket-retry" className="h-11 px-6 text-base" onClick={retry}>
              {t("ticket.retry")}
            </Button>
          </div>
        )}

        {status === "ready" && selected && (
          <TicketPreview
            card={selected}
            partnerHolderName={board.cards.find((c) => c.id === selected.partnerId)?.holder?.displayName ?? null}
            pending={actions.pending}
            onBack={() => setSelectedId(null)}
            onTake={() => void actions.take(selected.id)}
            onRelease={() => void actions.release(selected.id)}
          />
        )}

        {status === "ready" && !selected && (
          <>
            {showRenew && (
              <Button
                type="button"
                variant="outline"
                data-testid="ticket-renew"
                className="h-11 w-full text-base"
                disabled={actions.pending !== null}
                onClick={() => setConfirmOpen(true)}
              >
                {actions.pending === "renew" ? t("ticket.renewing") : t("ticket.renew")}
              </Button>
            )}
            {board.locked && (
              <p data-testid="ticket-lock-banner" role="status" className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
                {t("ticket.lockedBanner")}
              </p>
            )}
            {board.soldOut && (
              <p data-testid="ticket-sold-out" className="text-sm text-muted-foreground">
                {t("ticket.soldOut")}
              </p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {board.cards.map((card) => (
                <TicketCard key={card.id} card={card} onSelect={(c) => setSelectedId(c.id)} />
              ))}
            </div>
          </>
        )}
      </div>

      {isHost && (
        <>
          <RenewConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            pending={actions.pending === "renew"}
            onConfirm={() => void confirmRenew()}
          />
          <StillHeldDialog
            open={stillHeld !== null}
            onOpenChange={(next) => !next && setStillHeld(null)}
            initial={stillHeld ?? []}
            players={status === "ready" ? players : null}
            presence={presence}
            pending={actions.pending}
            onReclaim={(uid) => void actions.reclaim(uid)}
          />
        </>
      )}
    </>
  );
}
