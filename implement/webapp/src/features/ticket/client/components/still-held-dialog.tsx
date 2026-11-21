import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/client/ui/avatar";
import { Button } from "@/core/client/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/client/ui/dialog";
import { t } from "@/core/shared/i18n/vi";
import { ticketLabel } from "@/features/ticket/client/lib/ticket-label";
import type { PlayerView, StillHeldDetail } from "@/features/ticket/shared/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `details` của lỗi TICKETS_STILL_HELD — chỉ là dữ liệu đầu. */
  initial: StillHeldDetail[];
  /** Realtime: players hiện tại; null khi chưa đọc được → dùng `initial`. */
  players: PlayerView[] | null;
  /** Realtime: `{uid: online}`; uid không có key = đã rời (coi như offline). */
  presence: Record<string, boolean> | null;
  /** `reclaim:{uid}` đang chạy hoặc khóa khác; null = rảnh. */
  pending: string | null;
  onReclaim: (uid: string) => void;
};

/** SCR-05 #8: dialog "Chưa tạo được bộ vé mới" — người giữ vé, online/offline, "Thu hồi" chỉ cho người offline. */
export function StillHeldDialog({ open, onOpenChange, initial, players, presence, pending, onReclaim }: Props) {
  const live = players
    ? players
        .filter((p) => p.ticketIds.length > 0)
        .map<StillHeldDetail>((p) => ({
          code: "holder",
          uid: p.uid,
          displayName: p.displayName,
          ticketIds: p.ticketIds,
          online: presence?.[p.uid] === true,
        }))
    : null;
  const rows = live ?? initial;
  const photoOf = (uid: string) => players?.find((p) => p.uid === uid)?.photoUrl ?? null;

  // Hết người giữ (đã thu hồi / tự bỏ vé) → đóng dialog.
  const emptied = live !== null && live.length === 0;
  useEffect(() => {
    if (open && emptied) onOpenChange(false);
  }, [open, emptied, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="still-held-dialog" showCloseButton={false} className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("ticket.stillHeldTitle")}</DialogTitle>
          <DialogDescription>{t("ticket.stillHeldBody")}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const reclaiming = pending === `reclaim:${row.uid}`;
            return (
              <li key={row.uid} data-testid={`still-held-row-${row.uid}`} className="flex items-center gap-3">
                <Avatar className="size-9">
                  {photoOf(row.uid) && <AvatarImage src={photoOf(row.uid)!} alt="" />}
                  <AvatarFallback>{row.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-medium">{row.displayName}</span>
                  <span className="truncate text-sm text-muted-foreground">{row.ticketIds.map(ticketLabel).join(", ")}</span>
                  <span
                    data-testid={`still-held-status-${row.uid}`}
                    className={`text-sm ${row.online ? "text-green-600" : "text-muted-foreground"}`}
                  >
                    {row.online ? t("ticket.online") : t("ticket.offline")}
                  </span>
                </div>
                {row.online ? (
                  <span className="max-w-[110px] text-right text-xs text-muted-foreground">{t("ticket.stillHeldRemind")}</span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    data-testid={`ticket-reclaim-${row.uid}`}
                    className="h-11 shrink-0"
                    disabled={pending !== null}
                    onClick={() => onReclaim(row.uid)}
                  >
                    {reclaiming ? t("ticket.reclaiming") : t("ticket.reclaim")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" data-testid="still-held-close" className="h-11 text-base" onClick={() => onOpenChange(false)}>
            {t("ticket.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
