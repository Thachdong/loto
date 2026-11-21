"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/client/ui/avatar";
import { Button } from "@/core/client/ui/button";
import { t } from "@/core/shared/i18n/vi";
import { InOtherRoomDialog } from "@/features/invite/client/components/in-other-room-dialog";
import { JoinError, type JoinErrorVariant } from "@/features/invite/client/components/join-error";
import { joinRoomAction } from "@/features/invite/server/actions/join-room.action";

type Props = {
  /** Mã mời (đoạn `[code]` của URL). */
  code: string;
  hostName: string;
  hostPhotoUrl: string | null;
  roomName: string;
  /** "HH:mm" (hoặc "HH:mm dd/MM") — server tính bằng `formatInviteExpiry`. */
  expiresLabel: string;
  signedIn: boolean;
  /** Phòng khác của viewer → mở dialog 8 ngay khi tải trang. */
  otherRoomId: string | null;
};

const initialOf = (name: string) => (Array.from(name.trim())[0] ?? "?").toLocaleUpperCase("vi");

/** SCR-03 thân trang: 2 ảnh host, 3 lời mời, 4 tên phòng, 5 hạn link, 6 nút chính, 7/8 lỗi. */
export function JoinScreen({ code, hostName, hostPhotoUrl, roomName, expiresLabel, signedIn, otherRoomId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<JoinErrorVariant | null>(null);
  const [otherOpen, setOtherOpen] = useState(otherRoomId !== null);
  const [otherId, setOtherId] = useState<string | null>(otherRoomId);
  const busy = pending || navigating;
  const loginHref = `/login?returnTo=/join/${code}`;

  if (error) return <JoinError variant={error} signedIn={signedIn} />;

  function join() {
    if (busy) return;
    startTransition(async () => {
      try {
        const result = await joinRoomAction({ inviteCode: code });
        if (result.ok) {
          setNavigating(true); // giữ nút khóa tới khi chuyển trang (kể cả alreadyMember)
          router.push("/room");
          return;
        }
        switch (result.error.code) {
          case "INVITE_INVALID":
          case "INVITE_EXPIRED":
            setError("invalid");
            return;
          case "ROOM_FULL":
            setError("full");
            return;
          case "BLOCKED_FROM_ROOM":
            setError("blocked");
            return;
          case "ALREADY_IN_ROOM": {
            const id = result.error.details?.[0]?.currentRoomId;
            setOtherId(typeof id === "string" ? id : null);
            setOtherOpen(true);
            return;
          }
          case "UNAUTHENTICATED":
            router.replace(loginHref);
            return;
          default:
            toast.error(t("join.joinFailed"));
        }
      } catch {
        toast.error(t("join.joinFailed"));
      }
    });
  }

  return (
    <main className="flex w-full flex-1 flex-col items-center gap-3 py-8 text-center">
      {/* 2 */}
      <Avatar data-testid="join-host-avatar" className="size-20">
        {hostPhotoUrl && <AvatarImage src={hostPhotoUrl} alt="" referrerPolicy="no-referrer" />}
        <AvatarFallback className="text-2xl font-semibold">{initialOf(hostName)}</AvatarFallback>
      </Avatar>
      {/* 3 */}
      <h1 data-testid="join-title" className="text-2xl font-bold break-words">
        {t("join.inviteTitle", { host: hostName })}
      </h1>
      {/* 4 */}
      <p data-testid="join-room-name" className="text-lg font-semibold break-words">
        {roomName}
      </p>
      {/* 5 — không hiện số người (Q-049) */}
      <p data-testid="join-expires" className="text-sm text-muted-foreground">
        {t("join.expires", { time: expiresLabel })}
      </p>

      {/* 6 */}
      <div className="mt-4 w-full">
        {signedIn ? (
          <Button
            type="button"
            data-testid="join-primary-button"
            className="h-12 w-full text-base"
            disabled={busy}
            aria-busy={busy}
            onClick={join}
          >
            {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            {busy ? t("join.joining") : t("join.joinRoom")}
          </Button>
        ) : (
          <Button asChild className="h-12 w-full text-base">
            <Link data-testid="join-primary-button" href={loginHref}>
              {t("join.signInToJoin")}
            </Link>
          </Button>
        )}
      </div>

      {/* 8 */}
      <InOtherRoomDialog open={otherOpen} onOpenChange={setOtherOpen} currentRoomId={otherId} />
    </main>
  );
}
