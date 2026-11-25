"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/client/ui/button";
import { Input } from "@/core/client/ui/input";
import { t } from "@/core/shared/i18n/vi";
import { createRoomAction } from "@/features/room/server/actions/create-room.action";
import { clearLeaveReason } from "@/features/room/client/lib/leave-reason-store";
import { ROOM_NAME_MAX } from "@/features/room/shared/constants";
import { ChipRadioGroup } from "@/core/client/ui/chip-radio-group";
import { DEFAULT_VOICE_PACK, VOICE_PACK_OPTIONS, type VoicePackId } from "@/features/room/shared/domain/voice-pack";

/** Đếm theo ký tự Unicode (code point), không theo UTF-16. */
export const countChars = (value: string) => Array.from(value).length;
export const clampChars = (value: string, max = ROOM_NAME_MAX) =>
  countChars(value) > max ? Array.from(value).slice(0, max).join("") : value;

type Props = {
  displayName: string;
  /** `ALREADY_IN_ROOM` → id phòng hiện tại (details[0].currentRoomId) để màn chuyển sang card 9. */
  onAlreadyInRoom: (currentRoomId: string | null) => void;
};

/** SCR-02 thành phần 6 (ô tên + bộ đếm) và 7 (nút Tạo phòng) — thao tác A1. */
export function CreateRoomForm({ displayName, onAlreadyInRoom }: Props) {
  const router = useRouter();
  const inputId = useId();
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [voicePack, setVoicePack] = useState<VoicePackId>(DEFAULT_VOICE_PACK);
  const [navigating, setNavigating] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = pending || navigating;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    startTransition(async () => {
      try {
        const result = await createRoomAction(trimmed ? { name: trimmed, voicePack } : { voicePack });
        if (result.ok) {
          clearLeaveReason();
          setNavigating(true); // giữ nút khóa tới khi chuyển trang
          router.push("/room");
          return;
        }
        switch (result.error.code) {
          case "VALIDATION_FAILED":
          case "ROOM_NAME_INVALID":
            setInvalid(true);
            return;
          case "ALREADY_IN_ROOM": {
            const id = result.error.details?.[0]?.currentRoomId;
            onAlreadyInRoom(typeof id === "string" ? id : null);
            return;
          }
          default:
            toast.error(t("home.createFailed"));
        }
      } catch {
        toast.error(t("home.createFailed"));
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      {/* 6 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor={inputId} className="font-medium">
            {t("home.roomNameLabel")}
          </label>
          <span data-testid="room-name-counter" aria-live="polite" className="text-muted-foreground tabular-nums">
            {t("home.roomNameCounter", { count: countChars(name) })}
          </span>
        </div>
        <Input
          id={inputId}
          data-testid="room-name-input"
          className="h-11 text-base"
          value={name}
          placeholder={t("home.roomNamePlaceholder", { name: displayName })}
          autoComplete="off"
          enterKeyHint="go"
          disabled={busy}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${inputId}-error` : undefined}
          onChange={(event) => {
            // Chặn gõ/dán quá 50 ký tự Unicode (không dùng maxLength gốc vì nó đếm UTF-16).
            setName(clampChars(event.target.value));
            if (invalid) setInvalid(false);
          }}
        />
        {invalid && (
          <p id={`${inputId}-error`} data-testid="room-name-error" role="alert" className="text-sm text-destructive">
            {t("home.roomNameInvalid")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("home.voicePack")}</span>
        <ChipRadioGroup
          options={VOICE_PACK_OPTIONS}
          value={voicePack}
          onChange={setVoicePack}
          label={t("home.voicePack")}
          disabled={busy}
          testId="voice-pack"
        />
      </div>

      {/* 7 */}
      <Button
        type="submit"
        data-testid="create-room-button"
        className="h-12 w-full text-base"
        disabled={busy}
        aria-busy={busy}
      >
        {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {busy ? t("home.creating") : t("home.createRoom")}
      </Button>
    </form>
  );
}
