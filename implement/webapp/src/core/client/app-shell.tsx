import type { ReactNode } from "react";

/**
 * Khung mobile-first (NFR-12): cột nội dung tối đa 480px căn giữa;
 * ở màn rộng phần ngoài cột dùng màu nền `backdrop`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="app-shell"
      className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-x-hidden bg-background px-4"
    >
      {children}
    </div>
  );
}
