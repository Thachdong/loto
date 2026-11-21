"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LinkIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/core/client/ui/button";
import { t } from "@/core/shared/i18n/vi";

export type JoinErrorVariant = "invalid" | "full" | "blocked" | "load";

type Props = {
  variant: JoinErrorVariant;
  /** Đã đăng nhập → "Về trang chủ" tới `/`; chưa → `/login`. */
  signedIn: boolean;
};

const TITLE = {
  invalid: "join.errorTitleInvalid",
  full: "join.errorTitleFull",
  blocked: "join.errorTitleBlocked",
  load: "join.errorTitleLoad",
} as const;
const DESC = {
  invalid: "join.errorDescInvalid",
  full: "join.errorDescFull",
  blocked: "join.errorDescBlocked",
  load: "join.errorDescLoad",
} as const;

/** SCR-03 khung lỗi 7: icon, tiêu đề, mô tả, "Về trang chủ" (+ "Thử lại" khi lỗi tải). */
export function JoinError({ variant, signedIn }: Props) {
  const router = useRouter();
  return (
    <section
      data-testid="join-error"
      data-variant={variant}
      className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center"
    >
      <LinkIcon className="size-12 text-muted-foreground" aria-hidden="true" />
      <h1 data-testid="join-error-title" className="text-2xl font-bold break-words">
        {t(TITLE[variant])}
      </h1>
      <p className="text-base text-muted-foreground">{t(DESC[variant])}</p>
      <div className="mt-4 flex w-full flex-col gap-3">
        {variant === "load" && (
          <Button
            type="button"
            data-testid="join-error-retry"
            className="h-12 w-full text-base"
            onClick={() => router.refresh()}
          >
            <RefreshCwIcon aria-hidden="true" />
            {t("join.retry")}
          </Button>
        )}
        <Button asChild variant={variant === "load" ? "outline" : "default"} className="h-12 w-full text-base">
          <Link data-testid="join-error-home" href={signedIn ? "/" : "/login"}>
            {t("join.backHome")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
