import { t } from "@/core/shared/i18n/vi";

// Trang chào tạm (T-001). T-002 thay bằng điều hướng theo phiên đăng nhập.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
      <h1 data-testid="app-title" className="text-4xl font-bold tracking-tight">
        {t("app.name")}
      </h1>
      <p data-testid="app-tagline" className="text-base text-muted-foreground">
        {t("app.tagline")}
      </p>
    </main>
  );
}
