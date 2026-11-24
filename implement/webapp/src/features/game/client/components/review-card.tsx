"use client";

import { useMemo, useState } from "react";
import { Button } from "@/core/client/ui/button";
import { t } from "@/core/shared/i18n/vi";
import { ticketParts } from "@/features/game/client/lib/ticket-text";
import type { ClaimView, TicketId } from "@/features/room/shared/types";
import type { TicketView } from "@/features/ticket/shared/types";
import { MiniTicket, rowNumbersText } from "./mini-ticket";

type Props = {
  claims: ClaimView[];
  tickets: readonly TicketView[];
  calledNumbers: readonly number[];
  isHost: boolean;
  /** RTDB presence của host; null = chưa biết (coi như online). */
  hostOnline: boolean | null;
  /** Vé tham gia ván của mình (để hiện lời nhắc KINH #9). */
  myTicketIds: readonly TicketId[];
  pending: string | null;
  onConfirm: () => void;
  onReject: () => void;
};

const keyOf = (c: Pick<ClaimView, "uid" | "ticketId">) => `${c.uid}-${c.ticketId}`;

/**
 * SCR-09 `awaiting_confirm` (Q-055): thẻ nửa trên SCR-04, không che vé và thanh KINH. Danh sách lượt KINH kèm gợi ý
 * ✅ Đúng / ❌ Hụt, vé thu nhỏ của lượt đang chọn. Host: "Xác nhận kết thúc ván" khi có lượt đúng, ngược lại
 * "Bác bỏ – quay tiếp". Player: dòng chờ host (+ host offline), lời nhắc KINH khi còn vé chưa báo.
 */
export function ReviewCard({ claims, tickets, calledNumbers, isHost, hostOnline, myTicketIds, pending, onConfirm, onReject }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const called = useMemo(() => new Set(calledNumbers), [calledNumbers]);
  const byId = useMemo(() => new Map(tickets.map((tk) => [tk.id, tk])), [tickets]);
  if (claims.length === 0) return null;

  const active = claims.find((c) => keyOf(c) === selected) ?? claims[0];
  const activeTicket = byId.get(active.ticketId);
  const hasWin = claims.some((c) => c.result === "win");
  const claimedIds = new Set(claims.map((c) => c.ticketId));
  const canStillClaim = !isHost && myTicketIds.some((id) => !claimedIds.has(id));
  const busy = pending === "confirm" || pending === "reject";

  return (
    <section
      data-testid="review-card"
      className="flex max-h-[46dvh] shrink-0 flex-col gap-1.5 overflow-y-auto rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 shadow-sm"
    >
      <p className="text-sm leading-tight font-bold">{t("review.title", { k: claims.length })}</p>
      <ul className="flex flex-col gap-1">
        {claims.map((c) => {
          const grid = byId.get(c.ticketId)?.grid;
          const isActive = keyOf(c) === keyOf(active);
          return (
            <li
              key={keyOf(c)}
              data-testid={`review-item-${keyOf(c)}`}
              data-result={c.result}
              className="flex flex-col gap-0.5 rounded-md bg-white/70 px-2 py-1 text-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{t("claim.item", { name: c.displayName, ...ticketParts(c.ticketId, c.color) })}</span>
                {!isActive && (
                  <button
                    type="button"
                    data-testid={`btn-review-view-${keyOf(c)}`}
                    className="min-h-6 shrink-0 text-amber-800 underline"
                    onClick={() => setSelected(keyOf(c))}
                  >
                    {t("review.viewTicket")}
                  </button>
                )}
              </div>
              <span className={c.result === "win" ? "text-emerald-700" : "text-rose-700"}>
                {c.result === "win" && c.row !== null && grid
                  ? t("review.win", { row: c.row + 1, numbers: rowNumbersText(grid, c.row) })
                  : t("review.miss")}
              </span>
            </li>
          );
        })}
      </ul>
      {activeTicket && (
        <MiniTicket grid={activeTicket.grid} called={called} winRow={active.result === "win" ? active.row : null} />
      )}
      {isHost ? (
        hasWin ? (
          <div className="flex flex-col gap-0.5">
            <Button data-testid="btn-confirm-game" className="min-h-11 w-full" disabled={busy} onClick={onConfirm}>
              {t("review.confirm")}
            </Button>
            <p className="text-center text-[11px]">{t("review.confirmHint")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <Button data-testid="btn-reject-claims" variant="outline" className="min-h-11 w-full" disabled={busy} onClick={onReject}>
              {t("review.reject")}
            </Button>
            <p className="text-center text-[11px]">{t("review.rejectHint")}</p>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-0.5 text-xs">
          <p data-testid="review-waiting">{t("review.waiting")}</p>
          {hostOnline === false && (
            <p data-testid="review-host-offline" className="font-medium text-rose-700">
              {t("review.hostOffline")}
            </p>
          )}
          {canStillClaim && (
            <p data-testid="review-nudge" className="font-semibold">
              {t("review.nudge")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
