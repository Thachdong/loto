import { useEffect, useRef } from "react";
import { Button } from "@/core/client/ui/button";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { useMarks } from "@/features/game/client/hooks/use-marks";
import type { PlayMode } from "@/features/game/client/hooks/use-play-mode";
import { autoEffects } from "@/features/game/shared/domain/auto-effects";
import type { GameView } from "@/features/room/shared/types";
import { PaperTicket, useTicketActions } from "@/features/ticket/client";
import type { TicketView } from "@/features/ticket/shared/types";

type Props = {
  roomId: string;
  gameId: string;
  game: GameView;
  tickets: TicketView[];
  /** Đã nghe xong `players` + `tickets` (chưa xong → skeleton 1 vé). */
  ready: boolean;
  calledNumbers: number[];
  mode: PlayMode;
  onOpenTickets: () => void;
};

const PLAYING = new Set(["running", "paused", "awaiting_confirm"]);

/** SCR-04 #11–#13: vé của tôi (0–2 vé), trạng thái "chưa có vé" / "đang xem ván". */
export function MyTickets({ roomId, gameId, game, tickets, ready, calledNumbers, mode, onOpenTickets }: Props) {
  const waiting = game.status === "waiting";
  const called = waiting ? [] : calledNumbers;
  const last = called.length > 0 ? called[called.length - 1] : null;

  if (!ready) {
    return <Skeleton data-testid="tickets-skeleton" aria-busy="true" className="mx-auto h-[336px] w-full max-w-[346px] rounded-md" />;
  }

  if (tickets.length === 0) {
    if (waiting) {
      return (
        <div data-testid="no-ticket-card" className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center">
          <p className="text-base font-medium">{t("me.noTicket")}</p>
          <Button type="button" data-testid="btn-pick-ticket" className="h-11 px-6" onClick={onOpenTickets}>
            {t("me.pickTicket")}
          </Button>
        </div>
      );
    }
    return (
      <p data-testid="spectator-note" className="rounded-xl border bg-card p-6 text-center text-base text-muted-foreground">
        {t("me.spectator")}
      </p>
    );
  }

  return <TicketList roomId={roomId} gameId={gameId} game={game} tickets={tickets} called={called} last={last} mode={mode} onOpenTickets={onOpenTickets} />;
}

function TicketList({
  roomId,
  gameId,
  game,
  tickets,
  called,
  last,
  mode,
  onOpenTickets,
}: Omit<Props, "ready" | "calledNumbers"> & { called: number[]; last: number | null }) {
  const waiting = game.status === "waiting";
  // Ván chờ bắt đầu: bỏ vé ngay trên vé (BR-11 — vé tự giữ sang ván sau, bỏ khi không muốn chơi tiếp).
  const ticketActions = useTicketActions(roomId);
  const size = tickets.length >= 2 ? "double" : "single";
  const canMark = mode === "manual" && PLAYING.has(game.status);
  return (
    <div data-testid="my-tickets" data-count={tickets.length} className="flex flex-col" style={{ gap: tickets.length >= 2 ? 6 : 0 }}>
      {tickets.slice(0, 2).map((ticket) => (
        <MyTicket
          key={ticket.id}
          gameId={gameId}
          ticket={ticket}
          size={size}
          waiting={waiting}
          called={called}
          last={last}
          mode={mode}
          canMark={canMark}
          onOpenTickets={onOpenTickets}
          releasing={ticketActions.pending === `release:${ticket.id}`}
          releaseDisabled={ticketActions.pending !== null}
          onRelease={() => void ticketActions.release(ticket.id)}
        />
      ))}
    </div>
  );
}

type TicketProps = {
  gameId: string;
  ticket: TicketView;
  size: "single" | "double";
  waiting: boolean;
  called: number[];
  last: number | null;
  mode: PlayMode;
  canMark: boolean;
  onOpenTickets: () => void;
  releasing: boolean;
  releaseDisabled: boolean;
  onRelease: () => void;
};

function MyTicket({ gameId, ticket, size, waiting, called, last, mode, canMark, onOpenTickets, releasing, releaseDisabled, onRelease }: TicketProps) {
  const manual = useMarks(gameId, ticket.id);
  const auto = mode === "auto" && !waiting ? autoEffects(ticket.grid, called, last) : null;
  const marks = waiting ? new Set<number>() : auto ? auto.marked : manual.marks;
  const hit = auto?.hit ?? null;

  // Auto: số vừa rao có trên vé → rung (không rung ở lần render đầu).
  const lastHit = useRef<number | null>(hit);
  useEffect(() => {
    if (hit !== null && hit !== lastHit.current && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(100);
    lastHit.current = hit;
  }, [hit]);

  const ticketNode = (
    <PaperTicket
      id={ticket.id}
      grid={ticket.grid}
      size={size}
      testId={`ticket-${ticket.id}`}
      marks={marks}
      autoHit={hit}
      waitingRows={auto?.waitingRows}
      markedStyle={auto ? "soft" : "solid"}
      onCellTap={canMark ? manual.toggle : undefined}
    />
  );

  if (!waiting) return ticketNode;
  // Ván chờ bắt đầu: chạm vé mở SCR-05 (AC-14), không đánh dấu.
  return (
    <div className="flex flex-col gap-1">
      <div role="button" tabIndex={0} data-testid={`ticket-open-${ticket.id}`} onClick={onOpenTickets} onKeyDown={(e) => e.key === "Enter" && onOpenTickets()}>
        {ticketNode}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid={`btn-release-${ticket.id}`}
        className="h-9 self-center px-4 text-xs"
        disabled={releaseDisabled}
        onClick={onRelease}
      >
        {releasing ? t("ticket.releasing") : t("ticket.release")}
      </Button>
    </div>
  );
}
