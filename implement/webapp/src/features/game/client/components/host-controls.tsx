import { Loader2Icon } from "lucide-react";
import { Button } from "@/core/client/ui/button";
import { t } from "@/core/shared/i18n/vi";
import type { PlayMode } from "@/features/game/client/hooks/use-play-mode";
import type { GameActions } from "@/features/game/client/hooks/use-game-actions";
import type { GameView, RoomView } from "@/features/room/shared/types";

type HostProps = {
  room: RoomView;
  game: GameView;
  /** Tổng vé đã có chủ trong ván hiện tại (x/16). */
  heldCount: number;
  actions: Pick<GameActions, "pending" | "start" | "pause" | "resume">;
};

/** SCR-04 #9: thanh điều khiển host theo trạng thái ván. `awaiting_confirm` → ẩn (host duyệt ở SCR-09, T-007). */
export function HostControls({ room, game, heldCount, actions }: HostProps) {
  const busy = actions.pending !== null;
  const base = "h-10 min-w-28 px-4 text-sm";

  let button: React.ReactNode = null;
  let hint: string | null = null;

  if (game.status === "waiting") {
    if (room.status !== "closing") {
      const none = heldCount === 0;
      button = (
        <Button type="button" data-testid="btn-start" className={base} disabled={none || busy} onClick={() => void actions.start()}>
          {actions.pending === "start" && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          {t("host.start")}
        </Button>
      );
      hint = none ? t("host.needTicket") : t("host.summary", { held: heldCount, members: room.memberCount });
    }
  } else if (game.status === "running") {
    button = (
      <Button type="button" variant="secondary" data-testid="btn-pause" className={base} disabled={busy} onClick={() => void actions.pause()}>
        {actions.pending === "pause" && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {t("host.pause")}
      </Button>
    );
  } else if (game.status === "paused" && game.pauseReason === "host") {
    button = (
      <Button type="button" data-testid="btn-resume" className={base} disabled={busy} onClick={() => void actions.resume()}>
        {actions.pending === "resume" && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {t("host.resume")}
      </Button>
    );
  }

  return (
    <div data-testid="host-bar" style={{ height: 40 }} className="flex shrink-0 items-center gap-3">
      {button}
      {hint && (
        <p data-testid="host-hint" className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

type MeProps = {
  game: GameView;
  heldCount: number;
  /** Số vé tham gia ván của mình. */
  myTicketCount: number;
  mode: PlayMode;
};

/** SCR-04 #10: dòng trạng thái của player (thay thanh điều khiển host). */
export function MeStatusLine({ game, heldCount, myTicketCount, mode }: MeProps) {
  let text: string | null = null;
  if (game.status === "waiting") text = t("me.waiting", { held: heldCount });
  else if (game.status === "paused") text = t("me.paused");
  else if (myTicketCount > 0 && (game.status === "running" || game.status === "awaiting_confirm")) {
    text = t("me.playing", { n: myTicketCount, mode: mode === "auto" ? t("me.modeAuto") : t("me.modeManual") });
  }
  return (
    <div data-testid="me-status-bar" style={{ height: 40 }} className="flex shrink-0 items-center">
      {text && (
        <p data-testid="me-status" className="truncate text-xs text-muted-foreground">
          {text}
        </p>
      )}
    </div>
  );
}
