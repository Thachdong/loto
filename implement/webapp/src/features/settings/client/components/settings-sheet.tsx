"use client";

import { ChevronRightIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/core/client/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/core/client/ui/sheet";
import { t } from "@/core/shared/i18n/vi";
import { formatTimeVN } from "@/core/shared/time";
import { DRAW_INTERVAL_MAX, DRAW_INTERVAL_MIN } from "@/features/room/shared/domain/draw-interval";
import { useDrawInterval, type DrawIntervalState } from "@/features/settings/client/hooks/use-draw-interval";

export type TrackMode = "manual" | "auto";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Khoảng đáy chừa cho thanh KINH + thanh nút dưới. */
  bottom: number;
  roomId: string;
  isHost: boolean;
  drawIntervalSec: number;
  expiresAt: Date;
  mode: TrackMode;
  onModeChange: (mode: TrackMode) => void;
  soundOn: boolean;
  onSoundChange: (on: boolean) => void;
  /** Tiêm khi test. */
  interval?: DrawIntervalState;
};

/** SCR-11 Cài đặt (sheet thấp trên SCR-04): cách dò, tiếng rao, nhịp quay, hồ sơ, giờ hết hạn phòng. */
export function SettingsSheet(props: Props) {
  const { open, onClose, bottom, isHost, mode, soundOn } = props;
  const live = useDrawInterval(props.roomId, props.drawIntervalSec);
  const interval = props.interval ?? live;
  const canEdit = isHost && !interval.forbidden;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" data-testid="settings-sheet" className="mx-auto max-w-[480px] gap-0 rounded-t-xl pb-4" style={{ bottom }}>
        <SheetHeader className="pb-2">
          <SheetTitle>{t("settings.title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("settings.title")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <section className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t("settings.trackMode")}</span>
            <div role="radiogroup" aria-label={t("settings.trackMode")} className="grid grid-cols-2 rounded-lg bg-muted p-1">
              {(["manual", "auto"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  data-testid={`settings-mode-${m}`}
                  onClick={() => mode !== m && props.onModeChange(m)}
                  className={`h-9 rounded-md text-sm font-medium transition-colors ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  {t(m === "manual" ? "settings.manual" : "settings.auto")}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.trackHint")}</p>
          </section>

          <section className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t("settings.sound")}</span>
              <span className="text-xs text-muted-foreground">{t("settings.soundHint")}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundOn}
              aria-label={t("settings.sound")}
              data-testid="settings-sound"
              onClick={() => props.onSoundChange(!soundOn)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${soundOn ? "bg-primary" : "bg-muted-foreground/40"}`}
            >
              <span className={`absolute top-1 size-5 rounded-full bg-background shadow transition-all ${soundOn ? "left-6" : "left-1"}`} />
            </button>
          </section>

          <section className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t("settings.interval")}</span>
              {canEdit && <span className="text-xs text-muted-foreground">{t("settings.nextNumber")}</span>}
            </div>
            {canEdit ? (
              <div className="flex items-center gap-2" data-testid="settings-interval-stepper">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={t("settings.decrease")}
                  data-testid="btn-interval-minus"
                  disabled={interval.value <= DRAW_INTERVAL_MIN}
                  onClick={() => interval.step(-1)}
                >
                  <MinusIcon />
                </Button>
                <span data-testid="settings-interval-value" className="w-16 text-center font-semibold tabular-nums">
                  {t("settings.seconds", { n: interval.value })}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={t("settings.increase")}
                  data-testid="btn-interval-plus"
                  disabled={interval.value >= DRAW_INTERVAL_MAX}
                  onClick={() => interval.step(1)}
                >
                  <PlusIcon />
                </Button>
              </div>
            ) : (
              <span data-testid="settings-interval-readonly" className="text-sm text-muted-foreground tabular-nums">
                {t("settings.intervalReadonly", { n: props.drawIntervalSec })}
              </span>
            )}
          </section>

          <hr />
          {/* T-011 chưa có `/profile` — hàng hiện sẵn nhưng khóa. */}
          <div data-testid="settings-profile" aria-disabled="true" className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t("settings.profile")}</span>
            <span className="flex items-center gap-1 text-xs">
              {t("settings.soon")}
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p data-testid="settings-expires" className="text-xs text-muted-foreground">
            {t("settings.expires", { time: formatTimeVN(props.expiresAt, "HH:mm") })}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
