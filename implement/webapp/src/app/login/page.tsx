import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { t } from "@/core/shared/i18n/vi";
import { LoginScreen } from "@/features/auth/client";
import { getCurrentUser } from "@/features/auth/server/queries/current-user.query";
import { detectInAppBrowser } from "@/features/auth/shared/domain/detect-in-app-browser";
import { parseReturnTo } from "@/features/auth/shared/domain/parse-return-to";
import { postLoginPath } from "@/features/auth/shared/domain/post-login-path";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// SCR-01. Đọc phiên / searchParams / UA là dữ liệu theo request ⇒ nằm trong <Suspense> (cacheComponents).
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<p className="py-12 text-center text-muted-foreground">{t("common.loading")}</p>}>
      <LoginGate searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginGate({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const returnTo = parseReturnTo(first(params.returnTo));

  // FLOW-01 A1: đã có phiên → bỏ qua màn. `reauth=1`: client mất Firebase Auth, phải đăng nhập lại.
  if (first(params.reauth) !== "1") {
    const me = await getCurrentUser();
    if (me) redirect(postLoginPath({ returnTo, currentRoomId: me.currentRoomId }));
  }

  const requestHeaders = await headers();
  // [ASSUMED] `?__ua=` chỉ dùng ngoài production để giả lập trình duyệt trong ứng dụng chat.
  const uaOverride = process.env.NODE_ENV !== "production" ? first(params.__ua) : undefined;
  const { inApp, android, mobile } = detectInAppBrowser(uaOverride ?? requestHeaders.get("user-agent") ?? "");

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = first(value);
    if (v !== undefined) query.set(key, v);
  }
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const search = query.toString();
  const currentUrl = `${proto}://${host}/login${search ? `?${search}` : ""}`;

  return (
    <LoginScreen returnTo={returnTo} inApp={inApp} android={android} mobile={mobile} currentUrl={currentUrl} />
  );
}
