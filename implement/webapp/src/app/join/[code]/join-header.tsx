import { t } from "@/core/shared/i18n/vi";

/** SCR-03 #1: header tối giản — chỉ logo, không avatar. */
export function JoinHeader() {
  return (
    <header className="flex h-14 items-center">
      <span data-testid="join-logo" className="text-xl font-extrabold tracking-wide text-primary">
        {t("account.logo")}
      </span>
    </header>
  );
}
