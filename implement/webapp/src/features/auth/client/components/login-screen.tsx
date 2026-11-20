"use client";

import { Loader2Icon } from "lucide-react";
import { Button } from "@/core/client/ui/button";
import { t } from "@/core/shared/i18n/vi";
import { useGoogleSignIn } from "@/features/auth/client/hooks/use-google-sign-in";
import { InAppBrowserPanel } from "@/features/auth/client/components/in-app-browser-panel";

type Props = {
  returnTo: string | null;
  inApp: boolean;
  android: boolean;
  mobile: boolean;
  currentUrl: string;
};

/** SCR-01 Đăng nhập. */
export function LoginScreen({ returnTo, inApp, android, mobile, currentUrl }: Props) {
  return (
    <main className="flex w-full flex-1 flex-col py-8">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {/* 1 */}
        <div className="flex flex-col items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground"
          >
            {t("app.name").charAt(0)}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("app.name")}</h1>
          <p className="text-base text-muted-foreground">{t("app.tagline")}</p>
        </div>

        {/* 2 */}
        {returnTo && (
          <div
            data-testid="login-invite-banner"
            className="w-full rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm"
          >
            {t("login.inviteBanner")}
          </div>
        )}

        {inApp ? (
          <InAppBrowserPanel android={android} currentUrl={currentUrl} />
        ) : (
          <GoogleSignIn mobile={mobile} returnTo={returnTo} />
        )}
      </div>

      {/* 5 */}
      <p data-testid="login-data-note" className="pt-6 text-center text-xs text-muted-foreground">
        {t("login.dataNote")}
      </p>
    </main>
  );
}

function GoogleSignIn({ mobile, returnTo }: { mobile: boolean; returnTo: string | null }) {
  const { state, signIn } = useGoogleSignIn({ mobile, returnTo });
  const loading = state === "loading";

  return (
    <div className="flex w-full flex-col gap-3">
      {/* 3 */}
      <Button
        type="button"
        data-testid="login-google-button"
        className="h-12 w-full text-base"
        disabled={loading}
        aria-busy={loading}
        onClick={signIn}
      >
        {loading && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {loading ? t("login.signingIn") : t("login.signInWithGoogle")}
      </Button>

      {/* 4 */}
      {state === "error" && (
        <p data-testid="login-error" role="alert" className="text-sm text-destructive">
          {t("login.error")}
        </p>
      )}
    </div>
  );
}
