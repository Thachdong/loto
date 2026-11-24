"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/client/ui/avatar";
import { Button } from "@/core/client/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/core/client/ui/sheet";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { formatTimeVN } from "@/core/shared/time";
import type { ChatMessage, ChatMessagesState } from "@/features/chat/client/hooks/use-chat-messages";
import { useSendMessage, type PendingMessage } from "@/features/chat/client/hooks/use-send-message";
import { MESSAGE_COUNTER_FROM, MESSAGE_MAX, messageLength } from "@/features/chat/shared/domain/message-rules";

type Props = {
  roomId: string;
  uid: string;
  open: boolean;
  onClose: () => void;
  /** Khoảng đáy chừa cho thanh KINH + thanh nút dưới. */
  bottom: number;
  chat: ChatMessagesState;
  /** Tiêm khi test. */
  sender?: ReturnType<typeof useSendMessage>;
  /** Tiêm khi test: thiết bị cảm ứng (Enter = xuống dòng). */
  coarsePointer?: boolean;
};

const NEAR_EDGE_PX = 40;

/** Chiều cao bàn phím ảo (visualViewport) — 0 khi không có / đóng. */
function useKeyboardInset(enabled: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!enabled || !vv) return;
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [enabled]);
  return enabled ? inset : 0;
}

/** SCR-06 Chat (sheet trên SCR-04): danh sách tin (mới nhất ở dưới, cuộn lên tải thêm) + ô nhập. */
export function ChatSheet({ roomId, uid, open, onClose, bottom, chat, sender: injected, coarsePointer }: Props) {
  const liveSender = useSendMessage(roomId);
  const sender = injected ?? liveSender;
  const [text, setText] = useState("");
  const [rateError, setRateError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const keyboard = useKeyboardInset(open);
  const coarse = useMemo(
    () => coarsePointer ?? (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches),
    [coarsePointer],
  );

  const liveIds = useMemo(() => new Set(chat.messages.map((m) => m.id)), [chat.messages]);
  const pending = sender.visible(liveIds);
  const length = messageLength(text);
  const sendingNow = pending.some((p) => p.status === "sending");
  const canSend = length > 0 && length <= MESSAGE_MAX && !sendingNow && !blocked;

  async function submit() {
    if (!canSend) return;
    const value = text;
    setText("");
    const outcome = await sender.submit(value.trim());
    if (outcome === "ok") setRateError(false);
    else if (outcome === "rate_limited") {
      setRateError(true);
      setText(value);
    } else if (outcome === "blocked") {
      setBlocked(true);
      setText(value);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || coarse || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void submit();
  }

  const sheetBottom = keyboard > 80 ? keyboard : bottom;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        data-testid="chat-sheet"
        className="mx-auto h-[70dvh] max-w-[480px] gap-0 rounded-t-xl"
        style={{ bottom: sheetBottom, maxHeight: keyboard > 80 ? `calc(100dvh - ${keyboard + 8}px)` : undefined }}
      >
        <SheetHeader className="pb-2">
          <SheetTitle>{t("chat.title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("chat.title")}</SheetDescription>
        </SheetHeader>
        <MessageList chat={chat} uid={uid} pending={pending} open={open} onResend={(id) => void sender.resend(id).then((o) => o === "ok" && setRateError(false))} />
        {rateError && !blocked && (
          <p role="alert" data-testid="chat-rate-error" className="px-4 pb-1 text-sm text-destructive">
            {t("chat.rateLimited")}
          </p>
        )}
        {blocked ? (
          <div data-testid="chat-blocked" className="border-t bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
            {t("chat.blocked")}
          </div>
        ) : (
          <div className="flex items-end gap-2 border-t px-4 py-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <textarea
                data-testid="chat-input"
                value={text}
                rows={1}
                placeholder={t("chat.placeholder")}
                aria-label={t("chat.placeholder")}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                className="field-sizing-content max-h-[6.5rem] min-h-10 w-full resize-none rounded-md border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {length >= MESSAGE_COUNTER_FROM && (
                <span
                  data-testid="chat-counter"
                  data-over={length > MESSAGE_MAX}
                  className={`self-end text-xs tabular-nums ${length > MESSAGE_MAX ? "font-semibold text-destructive" : "text-muted-foreground"}`}
                >
                  {t("chat.counter", { n: length })}
                </span>
              )}
            </div>
            <Button type="button" data-testid="btn-chat-send" disabled={!canSend} className="h-10 px-4" onClick={() => void submit()}>
              {t("chat.send")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

type ListProps = { chat: ChatMessagesState; uid: string; pending: PendingMessage[]; open: boolean; onResend: (tempId: string) => void };

function MessageList({ chat, uid, pending, open, onResend }: ListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const prepend = useRef<{ height: number; top: number } | null>(null);
  const first = chat.messages[0]?.id;
  const count = chat.messages.length + pending.length;

  // Giữ vị trí khi chèn trang cũ; còn lại: đang ở cuối → cuộn xuống cuối.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prepend.current) {
      el.scrollTop = prepend.current.top + (el.scrollHeight - prepend.current.height);
      prepend.current = null;
      return;
    }
    if (atBottom.current) el.scrollTop = el.scrollHeight;
  }, [first, count, open]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_EDGE_PX;
    if (el.scrollTop < NEAR_EDGE_PX && chat.hasMore && !chat.loadingOlder) {
      prepend.current = { height: el.scrollHeight, top: el.scrollTop };
      void chat.loadOlder();
    }
  }

  let body;
  if (chat.status === "error" && chat.messages.length === 0) {
    body = (
      <div data-testid="chat-error" className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm">{t("chat.error")}</p>
        <Button type="button" variant="outline" onClick={chat.retry}>
          {t("chat.retry")}
        </Button>
      </div>
    );
  } else if (chat.status !== "ready" && chat.messages.length === 0) {
    body = (
      <div data-testid="chat-loading" aria-busy="true" className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className={`h-12 rounded-2xl ${i % 2 ? "ml-auto w-1/2" : "w-2/3"}`} />
        ))}
      </div>
    );
  } else if (count === 0) {
    body = (
      <p data-testid="chat-empty" className="py-8 text-center text-sm text-muted-foreground">
        {t("chat.empty")}
      </p>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-2">
        {chat.messages.map((m) => (
          <Bubble key={m.id} message={m} mine={m.senderUid === uid} />
        ))}
        {pending.map((p) => (
          <PendingBubble key={p.tempId} item={p} onResend={() => onResend(p.tempId)} />
        ))}
      </ul>
    );
  }

  return (
    <div ref={scroller} data-testid="chat-list" onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
      {chat.loadingOlder && (
        <p data-testid="chat-loading-older" className="py-2 text-center text-xs text-muted-foreground">
          {t("chat.loadingOlder")}
        </p>
      )}
      {body}
    </div>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const time = formatTimeVN(message.createdAt, "HH:mm");
  if (mine) {
    return (
      <li data-testid={`chat-msg-${message.id}`} data-mine="true" className="flex flex-col items-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm whitespace-pre-wrap break-words text-primary-foreground">
          {message.text}
        </div>
        <span className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{time}</span>
      </li>
    );
  }
  const initial = message.senderName.trim().charAt(0).toUpperCase() || "?";
  return (
    <li data-testid={`chat-msg-${message.id}`} data-mine="false" className="flex items-end gap-2">
      <Avatar className="size-7 shrink-0">
        {message.senderPhotoUrl && <AvatarImage src={message.senderPhotoUrl} alt="" />}
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 max-w-[80%] flex-col">
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{message.senderName}</span> · <span className="tabular-nums">{time}</span>
        </span>
        <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm whitespace-pre-wrap break-words">{message.text}</div>
      </div>
    </li>
  );
}

function PendingBubble({ item, onResend }: { item: PendingMessage; onResend: () => void }) {
  const failed = item.status === "failed";
  return (
    <li data-testid={`chat-pending-${item.tempId}`} data-status={item.status} className="flex flex-col items-end">
      <div className={`max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm whitespace-pre-wrap break-words text-primary-foreground ${failed ? "" : "opacity-60"}`}>
        {item.text}
      </div>
      {failed ? (
        <button type="button" data-testid={`btn-chat-resend-${item.tempId}`} onClick={onResend} className="mt-0.5 text-[11px] text-destructive underline">
          {t("chat.failed")} · {t("chat.resend")}
        </button>
      ) : (
        <span className="mt-0.5 text-[11px] text-muted-foreground">{t("chat.sending")}</span>
      )}
    </li>
  );
}
