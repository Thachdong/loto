"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/core/client/ui/button";
import { Input } from "@/core/client/ui/input";
import { t } from "@/core/shared/i18n/vi";

type Props = { android: boolean; currentUrl: string };

/** Android intent mở đúng URL hiện tại (giữ `returnTo`) bằng Chrome. */
export function toChromeIntentUrl(currentUrl: string): string | null {
  try {
    const url = new URL(currentUrl);
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end`;
  } catch {
    return null;
  }
}

/** SCR-01 khối 6–8: hướng dẫn mở bằng trình duyệt khi đang ở trình duyệt trong ứng dụng chat (NFR-13). */
export function InAppBrowserPanel({ android, currentUrl }: Props) {
  const [manualCopy, setManualCopy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const intentUrl = android ? toChromeIntentUrl(currentUrl) : null;

  useEffect(() => {
    if (!manualCopy) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [manualCopy]);

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(currentUrl);
      toast.success(t("login.inApp.copied"));
    } catch {
      setManualCopy(true);
      // Đã hiện sẵn thì chọn lại toàn bộ chữ.
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  return (
    <section data-testid="inapp-panel" className="flex w-full flex-col gap-4 rounded-lg border bg-card p-4 text-left">
      {/* 6 */}
      <h2 className="text-lg font-semibold">{t("login.inApp.title")}</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>{t("login.inApp.step1")}</li>
        <li>{t("login.inApp.step2")}</li>
      </ol>

      {/* 7 — chỉ Android */}
      {intentUrl && (
        <Button asChild className="h-12 w-full text-base">
          <a data-testid="inapp-open-chrome" href={intentUrl}>
            {t("login.inApp.openChrome")}
          </a>
        </Button>
      )}

      {/* 8 */}
      <Button
        type="button"
        variant={intentUrl ? "outline" : "default"}
        data-testid="inapp-copy-link"
        className="h-12 w-full text-base"
        onClick={copyLink}
      >
        {t("login.inApp.copyLink")}
      </Button>

      {manualCopy && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t("login.inApp.copyManual")}</p>
          <Input
            ref={inputRef}
            data-testid="inapp-link-input"
            readOnly
            value={currentUrl}
            className="h-11"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </section>
  );
}
