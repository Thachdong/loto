import { LogOutIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/core/client/ui/button";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import type { GameView, RoomView } from "@/features/room/shared/types";

/** Chip "⏱ Còn mm:ss" hiện khi còn ≤ 15 phút (SCR-04 #2). */
export const EXPIRY_CHIP_WINDOW_MS = 15 * 60_000;

export function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

type Props = {
  room: RoomView;
  game: GameView | null;
  isHost: boolean;
  /** Header gọn 52px khi giữ 2 vé (Q-049). */
  compact: boolean;
  /** `expires_at − now` (đã trừ offset server); `null` = chưa biết. */
  expiryRemainingMs: number | null;
  onInvite: () => void;
  onLeave: () => void;
};

/** SCR-04 #1–#4: tên phòng, phụ đề trạng thái ván, chip hết hạn, nút Mời (host) + Rời (mọi người). */
export function RoomHeader({ room, game, isHost, compact, expiryRemainingMs, onInvite, onLeave }: Props) {
  const chip =
    room.status === "closing"
      ? t("game.closingChip")
      : expiryRemainingMs !== null && expiryRemainingMs <= EXPIRY_CHIP_WINDOW_MS
        ? t("game.expiryChip", { time: formatMmSs(expiryRemainingMs) })
        : null;

  return (
    <header
      data-testid="room-header"
      style={{ height: compact ? 52 : 56 }}
      className="flex shrink-0 items-center gap-2"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h1 data-testid="room-name" className="truncate text-base leading-tight font-bold">
          {room.name}
        </h1>
        <div className="flex items-center gap-2">
          {game ? (
            <p data-testid="game-subtitle" className="truncate text-xs leading-tight text-muted-foreground">
              {t("game.subtitle", { game: room.gameCount, status: t(`game.status.${game.status}`) })}
            </p>
          ) : (
            <Skeleton data-testid="game-subtitle-skeleton" className="h-3 w-32" />
          )}
          {chip && (
            <span
              data-testid="expiry-chip"
              className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs leading-none font-medium text-amber-900"
            >
              {chip}
            </span>
          )}
        </div>
      </div>
      {isHost && (
        <Button type="button" variant="outline" data-testid="btn-invite" className="h-11 px-3" onClick={onInvite}>
          <UserPlusIcon aria-hidden="true" />
          {t("game.invite")}
        </Button>
      )}
      <Button type="button" variant="outline" data-testid="btn-leave" className="h-11 px-3" onClick={onLeave}>
        <LogOutIcon aria-hidden="true" />
        {t("game.leave")}
      </Button>
    </header>
  );
}
