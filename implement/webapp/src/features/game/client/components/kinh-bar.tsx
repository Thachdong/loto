import { useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/core/client/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/core/client/ui/sheet";
import { t } from "@/core/shared/i18n/vi";
import { ticketParts } from "@/features/game/client/lib/ticket-text";
import type { ClaimView, GameStatus, TicketId } from "@/features/room/shared/types";
import type { TicketView } from "@/features/ticket/shared/types";

/** Khóa chống bấm đúp sau khi bấm KINH (SCR-04 #14). */
export const KINH_LOCK_MS = 1000;

const CLAIMABLE: readonly GameStatus[] = ["running", "paused", "awaiting_confirm"];

/** Thanh KINH hiện khi ván đang chơi (kể cả chờ host duyệt) và mình có ≥ 1 vé tham gia (Q-055). */
export function isKinhVisible(status: GameStatus, ticketCount: number): boolean {
  return CLAIMABLE.includes(status) && ticketCount > 0;
}

/** Nút "Check" chỉ bấm lại được sau 10 giây (Q-062). */
export const CHECK_COOLDOWN_SEC = 10;

type Props = {
  status: GameStatus;
  myTickets: TicketView[];
  /** `games.claims` — vé đã có trong đó → "Đã KINH vé này" (BR-28). */
  claims: ClaimView[];
  /** `claim:{ticketId}` đang gọi, hoặc null. */
  pending: string | null;
  onClaim: (ticketId: TicketId) => Promise<boolean> | void;
  /** Chiều cao thanh (px) và khoảng đáy mà action sheet phải chừa cho thanh nút dưới. */
  height: number;
  sheetBottom: number;
  /** Mode dò hiện tại; nút "Auto" bật/tắt (bật = đang auto). */
  mode: "manual" | "auto";
  onToggleAuto: () => void;
  /** Nút "Check": đồng bộ ô đã đánh với số đã gọi (chỉ mode Tự dò). */
  onCheck: () => void;
  /** Đã có số được gọi (ván không `waiting`). */
  canCheck: boolean;
  /** Tiếng đang bật; nút cạnh "Check" đổi "Tắt tiếng"/"Bật tiếng". */
  soundOn: boolean;
  onToggleSound: () => void;
};

/** SCR-04 #14 + #15: thanh KINH + action sheet chọn vé (2 vé). Hiện cả khi `awaiting_confirm` (Q-055). */
export function KinhBar({ status, myTickets, claims, pending, onClaim, height, sheetBottom, mode, onToggleAuto, onCheck, canCheck, soundOn, onToggleSound }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  /** Giây còn lại trước khi bấm "Check" lại được (0 = bấm được). */
  const [checkWait, setCheckWait] = useState(0);
  const checkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (checkTimer.current) clearInterval(checkTimer.current);
    },
    [],
  );

  function check() {
    onCheck();
    setCheckWait(CHECK_COOLDOWN_SEC);
    if (checkTimer.current) clearInterval(checkTimer.current);
    checkTimer.current = setInterval(() => {
      setCheckWait((s) => {
        if (s <= 1 && checkTimer.current) {
          clearInterval(checkTimer.current);
          checkTimer.current = null;
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
  }

  if (!isKinhVisible(status, myTickets.length)) return null;

  const claimed = new Set(claims.map((c) => c.ticketId));
  const allClaimed = myTickets.every((tk) => claimed.has(tk.id));
  const busy = pending !== null;

  function lock() {
    setLocked(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLocked(false), KINH_LOCK_MS);
  }

  function claim(id: TicketId) {
    lock();
    void onClaim(id);
  }

  function press() {
    if (myTickets.length === 1) claim(myTickets[0].id);
    else setSheetOpen(true);
  }

  return (
    <div data-testid="kinh-bar" style={{ height }} className="grid grid-cols-4 items-center gap-1.5 px-0 py-1">
      <Button
        type="button"
        variant="outline"
        data-testid="btn-check"
        className="h-full px-1 text-xs font-semibold"
        disabled={mode === "auto" || !canCheck || checkWait > 0}
        onClick={check}
      >
        {checkWait > 0 ? t("kinh.checkWait", { n: checkWait }) : t("kinh.check")}
      </Button>
      <Button
        type="button"
        variant="outline"
        data-testid="btn-sound"
        aria-pressed={!soundOn}
        className="h-full px-1 text-xs font-semibold"
        onClick={onToggleSound}
      >
        {soundOn ? t("kinh.mute") : t("kinh.unmute")}
      </Button>
      <Button
        type="button"
        variant={mode === "auto" ? "default" : "outline"}
        data-testid="btn-auto"
        aria-pressed={mode === "auto"}
        className="h-full px-1 text-xs font-semibold"
        onClick={onToggleAuto}
      >
        {t("kinh.auto")}
      </Button>
      <Button
        type="button"
        variant="destructive"
        data-testid="btn-kinh"
        className="h-full text-base font-extrabold tracking-wide"
        disabled={allClaimed || locked || busy}
        onClick={press}
      >
        {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {allClaimed ? t("kinh.claimed") : t("kinh.button")}
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          data-testid="kinh-sheet"
          className="mx-auto max-w-[480px] rounded-t-xl"
          style={{ bottom: sheetBottom }}
        >
          <SheetHeader>
            <SheetTitle>{t("kinh.sheetTitle")}</SheetTitle>
            <SheetDescription className="sr-only">{t("kinh.sheetTitle")}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {myTickets.map((tk) => {
              const done = claimed.has(tk.id);
              const parts = ticketParts(tk.id, tk.color);
              return (
                <Button
                  key={tk.id}
                  type="button"
                  variant={done ? "outline" : "destructive"}
                  data-testid={`kinh-sheet-${tk.id}`}
                  className="h-12 w-full text-base"
                  disabled={done || busy}
                  onClick={() => {
                    setSheetOpen(false);
                    claim(tk.id);
                  }}
                >
                  {done ? `${t("kinh.ticket", parts)} · ${t("kinh.claimed")}` : t("kinh.ticket", parts)}
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
