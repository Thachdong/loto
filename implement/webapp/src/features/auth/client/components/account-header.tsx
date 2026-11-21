"use client";

import type { DocumentData } from "firebase/firestore";
import { Loader2Icon, LogOutIcon } from "lucide-react";
import { useDocListener } from "@/core/client/hooks/use-doc-listener";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/client/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/client/ui/dropdown-menu";
import { t } from "@/core/shared/i18n/vi";
import { useSignOut } from "@/features/auth/client/hooks/use-sign-out";

type HeaderUser = { displayName: string; photoUrl: string | null; currentRoomId: string | null };

function mapHeaderUser(data: DocumentData): HeaderUser {
  return {
    displayName: typeof data.display_name === "string" ? data.display_name : "",
    photoUrl: typeof data.photo_url === "string" && data.photo_url ? data.photo_url : null,
    currentRoomId: typeof data.current_room_id === "string" && data.current_room_id ? data.current_room_id : null,
  };
}

/** Chữ cái đầu (theo ký tự Unicode) của tên hiển thị, in hoa. */
export const initialOf = (name: string) => (Array.from(name.trim())[0] ?? "?").toLocaleUpperCase("vi");

type Props = {
  uid: string;
  /** Dữ liệu server đọc lúc render — dùng tới khi listener `users/{uid}` trả dữ liệu. */
  displayName: string;
  photoUrl: string | null;
  currentRoomId: string | null;
};

/**
 * Header chung ngoài phòng (wireframe §5, SCR-02 thành phần 1–3): logo, avatar, menu avatar.
 * "Đăng xuất" chỉ hiện khi `current_room_id = null` (T-003 [ASSUMED]); "Hồ sơ cá nhân" ẩn tới T-011.
 */
export function AccountHeader({ uid, displayName, photoUrl, currentRoomId }: Props) {
  const live = useDocListener(`users/${uid}`, mapHeaderUser).data;
  const user: HeaderUser = live ?? { displayName, photoUrl, currentRoomId };
  const { pending, signOut } = useSignOut();
  const canSignOut = user.currentRoomId === null;

  return (
    <header className="flex h-14 items-center justify-between">
      {/* 1 */}
      <span data-testid="account-logo" className="text-xl font-extrabold tracking-wide text-primary">
        {t("account.logo")}
      </span>

      <DropdownMenu>
        {/* 2 */}
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="account-avatar"
            aria-label={t("account.menu")}
            className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Avatar className="size-9">
              {user.photoUrl && <AvatarImage src={user.photoUrl} alt="" referrerPolicy="no-referrer" />}
              <AvatarFallback className="font-semibold">{initialOf(user.displayName)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        {/* 3 */}
        <DropdownMenuContent data-testid="account-menu" align="end" className="min-w-48">
          <DropdownMenuLabel className="truncate">{user.displayName}</DropdownMenuLabel>
          {canSignOut && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-testid="sign-out-item"
                className="min-h-11"
                disabled={pending}
                onSelect={(event) => {
                  event.preventDefault();
                  void signOut();
                }}
              >
                {pending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <LogOutIcon aria-hidden="true" />}
                {pending ? t("account.signingOut") : t("account.signOut")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
