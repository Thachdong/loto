import { Button } from "@/core/client/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/client/ui/dialog";
import { t } from "@/core/shared/i18n/vi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
};

/** SCR-05 #9: dialog xác nhận tạo bộ vé mới. */
export function RenewConfirmDialog({ open, onOpenChange, pending, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent data-testid="renew-confirm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("ticket.renewConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("ticket.renewConfirmBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            data-testid="renew-cancel"
            className="h-11 text-base"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t("ticket.cancel")}
          </Button>
          <Button type="button" data-testid="renew-create" className="h-11 text-base" disabled={pending} onClick={onConfirm}>
            {pending ? t("ticket.renewing") : t("ticket.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
