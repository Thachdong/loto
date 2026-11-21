"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/core/client/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/client/ui/dialog";
import { Input } from "@/core/client/ui/input";
import { t, type I18nKey } from "@/core/shared/i18n/vi";
import { joinRoomAction } from "@/features/invite/server/actions/join-room.action";
import { clearLeaveReason } from "@/features/room/client/lib/leave-reason-store";
import { isRoomCode, normalizeRoomCode } from "@/features/room/shared/domain/room-code";

type Props = {
  /** `ALREADY_IN_ROOM` → id phòng hiện tại (details[0].currentRoomId) để màn chuyển sang card 9. */
  onAlreadyInRoom: (currentRoomId: string | null) => void;
};

type JoinCodeError = "invalid" | "full" | "blocked" | "failed";
const ERROR_TEXT: Record<JoinCodeError, I18nKey> = {
  invalid: "error.ROOM_CODE_INVALID",
  full: "error.ROOM_FULL",
  blocked: "error.BLOCKED_FROM_ROOM",
  failed: "join.joinFailed",
};

/** SCR-02 card 8 "Vào phòng" + dialog 10 nhập mã 6 ký tự — thao tác A4 (`joinRoom({roomCode})`). */
export function JoinRoomCard({ onAlreadyInRoom }: Props) {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<JoinCodeError | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = pending || navigating;

  function onOpenChange(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) {
      setCode("");
      setError(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !isRoomCode(code)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await joinRoomAction({ roomCode: code });
        if (result.ok) {
          clearLeaveReason();
          setNavigating(true); // giữ ô/nút khóa tới khi chuyển trang
          router.push("/room");
          return;
        }
        switch (result.error.code) {
          case "ROOM_CODE_INVALID":
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
            setOpen(false);
            setCode("");
            onAlreadyInRoom(typeof id === "string" ? id : null);
            return;
          }
          case "UNAUTHENTICATED":
            router.replace("/login");
            return;
          default:
            setError("failed");
        }
      } catch {
        setError("failed");
      }
    });
  }

  return (
    <section data-testid="join-hint-card" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("home.joinTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("home.joinHint")}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        data-testid="join-room-open-button"
        className="h-12 w-full text-base"
        onClick={() => setOpen(true)}
      >
        {t("home.joinButton")}
      </Button>

      {/* 10 */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="join-code-dialog">
          <DialogHeader>
            <DialogTitle>{t("home.joinDialogTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("home.joinHint")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={inputId} className="text-sm font-medium">
                {t("home.joinCodeLabel")}
              </label>
              <Input
                id={inputId}
                data-testid="join-code-input"
                className="h-14 text-center font-mono text-3xl font-bold tracking-[0.3em] uppercase"
                value={code}
                placeholder={t("home.joinCodePlaceholder")}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="go"
                disabled={busy}
                aria-invalid={error === "invalid" || undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                onChange={(event) => {
                  setCode(normalizeRoomCode(event.target.value));
                  if (error) setError(null);
                }}
              />
              {error && (
                <p id={`${inputId}-error`} data-testid="join-code-error" role="alert" className="text-sm text-destructive">
                  {t(ERROR_TEXT[error])}
                </p>
              )}
            </div>
            <Button
              type="submit"
              data-testid="join-code-submit"
              className="h-12 w-full text-base"
              disabled={busy || !isRoomCode(code)}
              aria-busy={busy}
            >
              {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
              {busy ? t("home.joining") : t("home.joinSubmit")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
