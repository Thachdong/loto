"use client";

import { useMemo, useState } from "react";
import { Button } from "@/core/client/ui/button";
import { t } from "@/core/shared/i18n/vi";
import { ticketParts } from "@/features/game/client/lib/ticket-text";
import type { GameView } from "@/features/room/shared/types";
import type { TicketView } from "@/features/ticket/shared/types";
import { MiniTicket, rowNumbersText } from "./mini-ticket";

type Props = {
  game: GameView;
  tickets: readonly TicketView[];
  calledNumbers: readonly number[];
  ticketLine: "kept" | "released" | null;
  nextSeqNo: number;
  onClose: () => void;
};

const CONFETTI_COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"];

/**
 * SCR-09 `finished` (trang 4) / `no_winner` (#8): overlay toàn màn, giữ dữ liệu ván vừa xong tới khi bấm "Đóng"
 * (SCR-09.A0). Pháo giấy chỉ là hình, ẩn khi hệ điều hành bật "giảm chuyển động" (`motion-reduce:hidden`).
 */
export function ResultOverlay({ game, tickets, calledNumbers, ticketLine, nextSeqNo, onClose }: Props) {
  const won = game.result === "won" && game.winners.length > 0;
  const [selected, setSelected] = useState(0);
  const called = useMemo(() => new Set(calledNumbers), [calledNumbers]);
  const byId = useMemo(() => new Map(tickets.map((tk) => [tk.id, tk])), [tickets]);
  const active = won ? (game.winners[selected] ?? game.winners[0]) : null;
  const activeTicket = active ? byId.get(active.ticketId) : undefined;

  return (
    <div
      data-testid="result-overlay"
      data-result={won ? "won" : "no_winner"}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4"
    >
      {won && (
        <div data-testid="confetti" aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="absolute top-[-12px] h-3 w-1.5 animate-[confetti_2.4s_linear_infinite] rounded-sm"
              style={{
                left: `${(i * 37) % 100}%`,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 8) * 0.25}s`,
              }}
            />
          ))}
        </div>
      )}
      <section className="relative flex max-h-[90dvh] w-full max-w-[440px] flex-col gap-2 overflow-y-auto rounded-xl bg-background p-4 text-center shadow-xl">
        {won ? (
          <>
            <h2 className="text-xl font-bold">{t("result.congrats")}</h2>
            <p className="text-sm">{t("result.summary", { game: game.seqNo, k: game.winners.length })}</p>
            <ul className="flex flex-col gap-1 text-left text-sm">
              {game.winners.map((w, i) => {
                const grid = byId.get(w.ticketId)?.grid;
                return (
                  <li
                    key={`${w.uid}-${w.ticketId}`}
                    data-testid={`result-winner-${w.uid}-${w.ticketId}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-2 py-1"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{t("claim.item", { name: w.displayName, ...ticketParts(w.ticketId, w.color) })}</span>
                      {grid && <span className="text-xs text-emerald-700">{t("result.winnerRow", { row: w.row + 1, numbers: rowNumbersText(grid, w.row) })}</span>}
                    </span>
                    {i !== selected && (
                      <button type="button" className="min-h-6 shrink-0 text-xs underline" onClick={() => setSelected(i)}>
                        {t("review.viewTicket")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {activeTicket && active && <MiniTicket grid={activeTicket.grid} called={called} winRow={active.row} />}
          </>
        ) : (
          <h2 className="text-lg font-bold">{t("result.noWinner", { game: game.seqNo })}</h2>
        )}
        {ticketLine && (
          <p data-testid="result-keep-line" data-line={ticketLine} className="text-xs text-muted-foreground">
            {ticketLine === "kept" ? t("result.keep", { next: nextSeqNo }) : t("result.released")}
          </p>
        )}
        <Button data-testid="btn-result-close" className="min-h-11 w-full" onClick={onClose}>
          {t("result.close")}
        </Button>
      </section>
    </div>
  );
}
