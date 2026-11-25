import { t } from "@/core/shared/i18n/vi";
import type { GameView, RoomView } from "@/features/room/shared/types";

type Props = {
  room: RoomView;
  game: GameView;
  /** Panel 1 dòng 52px khi giữ 2 vé (Q-049); ngược lại 96px. */
  compact: boolean;
  onOpenBoard: () => void;
};

/** Ván chưa bắt đầu: `called_numbers` còn giữ số của ván trước (TBL-02) — không hiện (plan §7). */
function visibleNumbers(room: RoomView, game: GameView): number[] {
  return game.status === "waiting" ? [] : room.calledNumbers;
}

function countdownText(game: GameView): string | null {
  if (game.status === "awaiting_confirm") return t("panel.checking");
  if (game.status === "paused") return t("panel.paused");
  // Nhịp theo audio (ADR-05 sửa đổi): số hiện khi clip rao gần hết — không đếm giây.
  if (game.status === "running") return t("panel.calling");
  return null;
}

/** SCR-04 #5–#8: số vừa rao, "Số thứ n/90", trạng thái rao, 5 số gần nhất, link "Bảng 90". */
export function NumberPanel({ room, game, compact, onOpenBoard }: Props) {
  const numbers = visibleNumbers(room, game);
  const last = numbers.length > 0 ? numbers[numbers.length - 1] : null;
  // Mọi số đã rao trước số vừa rao, mới nhất bên trái; vuốt ngang để xem số cũ hơn.
  const recent = numbers.slice(0, -1).reverse();
  const countdown = countdownText(game);

  const board = (
    <button
      type="button"
      data-testid="btn-board90"
      onClick={onOpenBoard}
      className="shrink-0 px-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
      style={{ minHeight: 44 }}
    >
      {t("panel.board")}
    </button>
  );

  const recentChips = (
    <ul
      data-testid="recent-numbers"
      aria-label={t("panel.recentScroll")}
      className="flex min-w-0 touch-pan-x items-center gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {recent.map((n) => (
        <li key={n} className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs leading-none font-semibold tabular-nums">
          {n}
        </li>
      ))}
    </ul>
  );

  if (compact) {
    return (
      <section
        data-testid="number-panel"
        data-compact="true"
        style={{ height: 52 }}
        className="flex shrink-0 items-center gap-2 rounded-lg border bg-card px-2"
      >
        <span data-testid="last-number" aria-label={t("panel.lastNumber")} className="w-[52px] text-center text-[44px] leading-none font-extrabold tabular-nums">
          {last ?? "–"}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {recentChips}
          <span data-testid="next-countdown" className="truncate text-[11px] leading-none text-muted-foreground">
            {countdown ?? ""}
          </span>
        </div>
        <span data-testid="called-count" className="sr-only">{`${numbers.length}/90`}</span>
        {board}
      </section>
    );
  }

  return (
    <section
      data-testid="number-panel"
      data-compact="false"
      style={{ height: 96 }}
      className="flex shrink-0 items-center gap-3 rounded-lg border bg-card px-3"
    >
      <div className="flex w-[88px] shrink-0 flex-col items-center">
        <span data-testid="last-number" aria-label={t("panel.lastNumber")} className="text-[76px] leading-none font-extrabold tabular-nums">
          {last ?? "–"}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {last === null ? (
          <>
            <span className="text-sm font-medium">{t("panel.none")}</span>
            <span data-testid="next-countdown" className="text-xs text-muted-foreground">
              {countdown ?? ""}
            </span>
            <span data-testid="called-count" className="sr-only">{`${numbers.length}/90`}</span>
            {recentChips}
          </>
        ) : (
          <>
            <span data-testid="called-count" className="text-sm font-medium">
              {t("panel.count", { n: numbers.length })}
            </span>
            <span data-testid="next-countdown" className="text-xs text-muted-foreground">
              {countdown ?? ""}
            </span>
            {recentChips}
          </>
        )}
        <div className="flex justify-end">{board}</div>
      </div>
    </section>
  );
}
