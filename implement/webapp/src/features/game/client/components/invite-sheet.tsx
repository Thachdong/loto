"use client";

import { CopyIcon, Share2Icon } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/core/client/ui/button";
import { Input } from "@/core/client/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/core/client/ui/sheet";
import { t } from "@/core/shared/i18n/vi";
import type { RoomView } from "@/features/room/shared/types";

type Props = {
  open: boolean;
  onClose: () => void;
  room: Pick<RoomView, "inviteCode" | "joinCode" | "expiresAt" | "memberCount" | "name">;
  /** Chừa chỗ cho thanh KINH + thanh nút dưới (px). */
  bottom: number;
  /** Gốc URL (test); mặc định `window.location.origin`. */
  origin?: string;
};

/** `HH:mm` giờ Việt Nam (GMT+7), không phụ thuộc múi giờ máy. */
export function formatExpiryTime(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

/** `K7M2QX` → `K7M 2QX` (chữ lớn cách quãng). */
export function spacedCode(code: string): string {
  return code.length > 3 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

/** SCR-04 #19 / A7: link mời + mã phòng + Copy link / Copy mã / Chia sẻ (ẩn nếu máy không hỗ trợ Web Share). */
export function InviteSheet({ open, onClose, room, bottom, origin }: Props) {
  const linkRef = useRef<HTMLInputElement>(null);
  const link = `${origin ?? (typeof window === "undefined" ? "" : window.location.origin)}/join/${room.inviteCode}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy(text: string, okMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMessage);
    } catch {
      // Clipboard lỗi → chọn sẵn text trong ô link (A7).
      linkRef.current?.focus();
      linkRef.current?.select();
      toast.error(t("inviteSheet.copyFailed"));
    }
  }

  async function share() {
    try {
      await navigator.share({ title: room.name, text: t("inviteSheet.shareText", { code: room.joinCode }), url: link });
    } catch {
      // người dùng hủy → không làm gì.
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        data-testid="invite-sheet"
        className="mx-auto max-w-[480px] rounded-t-xl"
        style={{ bottom, maxHeight: `calc(100dvh - ${bottom}px - 56px)` }}
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="text-lg">{t("inviteSheet.title")}</SheetTitle>
          <SheetDescription data-testid="invite-expires" className="text-sm">
            {t("inviteSheet.expires", { time: formatExpiryTime(room.expiresAt), members: room.memberCount })}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <section className="flex flex-col gap-2">
            <label htmlFor="invite-link-input" className="text-sm font-medium">
              {t("inviteSheet.link")}
            </label>
            <Input id="invite-link-input" ref={linkRef} readOnly data-testid="invite-link" value={link} className="h-11" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" data-testid="btn-copy-link" className="h-11 text-base" onClick={() => void copy(link, t("inviteSheet.linkCopied"))}>
              <CopyIcon aria-hidden="true" />
              {t("inviteSheet.copyLink")}
            </Button>
          </section>
          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t("inviteSheet.code")}</p>
            <p data-testid="invite-code" className="text-center text-4xl font-bold tracking-widest">
              {spacedCode(room.joinCode)}
            </p>
            <Button type="button" variant="outline" data-testid="btn-copy-code" className="h-11 text-base" onClick={() => void copy(room.joinCode, t("inviteSheet.codeCopied"))}>
              <CopyIcon aria-hidden="true" />
              {t("inviteSheet.copyCode")}
            </Button>
          </section>
          {canShare && (
            <Button type="button" variant="secondary" data-testid="btn-share" className="h-11 text-base" onClick={() => void share()}>
              <Share2Icon aria-hidden="true" />
              {t("inviteSheet.share")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
