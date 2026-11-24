import { WifiOffIcon } from "lucide-react";
import { t } from "@/core/shared/i18n/vi";

/** SCR-04 #22: "Mất kết nối – đang kết nối lại…". */
export function ConnectionBanner() {
  return (
    <div
      data-testid="conn-banner"
      role="status"
      className="flex shrink-0 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <WifiOffIcon className="size-4 shrink-0" aria-hidden="true" />
      {t("conn.lost")}
    </div>
  );
}
