import { WifiOffIcon } from "lucide-react";
import { t } from "@/core/shared/i18n/vi";

/** Banner "Mất kết nối – đang thử lại…" (SCR-02 trạng thái Error). */
export function OfflineBanner() {
  return (
    <div
      data-testid="home-offline-banner"
      role="status"
      className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <WifiOffIcon className="size-4 shrink-0" aria-hidden="true" />
      {t("common.offline")}
    </div>
  );
}
