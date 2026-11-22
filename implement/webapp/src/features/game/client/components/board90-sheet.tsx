import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/core/client/ui/sheet";
import { Button } from "@/core/client/ui/button";
import { t } from "@/core/shared/i18n/vi";
import { cn } from "@/core/shared/utils";
import { MAX_NUMBER } from "@/features/game/shared/constants";

const NUMBERS = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
const RECENT_LIMIT = 10;

type Props = {
  open: boolean;
  onClose: () => void;
  calledNumbers: readonly number[];
  /** Chừa chỗ cho thanh KINH + thanh nút dưới (px). */
  bottom: number;
};

/** SCR-04 #20: lưới 1–90 (10 cột), số đã rao tô đậm, số vừa rao viền đỏ, dòng thứ tự gần nhất. */
export function Board90Sheet({ open, onClose, calledNumbers, bottom }: Props) {
  const called = new Set(calledNumbers);
  const last = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null;
  const recent = calledNumbers.slice(-RECENT_LIMIT).reverse().join(", ");

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        data-testid="board90"
        className="mx-auto max-w-[480px] rounded-t-xl"
        style={{ bottom, maxHeight: `calc(100dvh - ${bottom}px - 56px)` }}
      >
        <SheetHeader className="flex-row items-start justify-between gap-2 pb-0">
          <div className="flex min-w-0 flex-col gap-1">
            <SheetTitle className="text-lg">{t("board.title")}</SheetTitle>
            <SheetDescription data-testid="board-called" className="text-sm">
              {t("board.called", { n: calledNumbers.length })}
            </SheetDescription>
          </div>
          <Button type="button" variant="ghost" data-testid="board-close" className="h-11 shrink-0 px-3 text-base" onClick={onClose}>
            {t("board.close")}
          </Button>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-10 gap-1">
            {NUMBERS.map((n) => {
              const isCalled = called.has(n);
              return (
                <div
                  key={n}
                  data-testid={`board-cell-${n}`}
                  data-called={isCalled}
                  data-last={n === last}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded text-sm border",
                    isCalled ? "bg-foreground font-bold text-background" : "bg-muted text-muted-foreground",
                    n === last && "border-2 border-red-600 ring-2 ring-red-600/40",
                  )}
                >
                  {n}
                </div>
              );
            })}
          </div>
          {recent && (
            <p data-testid="board-recent" className="text-sm text-muted-foreground">
              {t("board.recent", { numbers: recent })}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
