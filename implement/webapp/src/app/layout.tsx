import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AppShell } from "@/core/client/app-shell";
import { Toaster } from "@/core/client/ui/sonner";
import { t } from "@/core/shared/i18n/vi";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.description"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <AppShell>{children}</AppShell>
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  );
}
