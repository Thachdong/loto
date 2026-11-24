import { HistoryIcon, MessageCircleIcon, SettingsIcon, TicketIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/core/client/ui/sheet";
import { t, type I18nKey } from "@/core/shared/i18n/vi";

export type BottomTab = "tickets" | "chat" | "members" | "history" | "settings";

const TABS: { id: BottomTab; label: I18nKey; Icon: LucideIcon }[] = [
  { id: "tickets", label: "bottomBar.tickets", Icon: TicketIcon },
  { id: "chat", label: "bottomBar.chat", Icon: MessageCircleIcon },
  { id: "members", label: "bottomBar.members", Icon: UsersIcon },
  { id: "history", label: "bottomBar.history", Icon: HistoryIcon },
  { id: "settings", label: "bottomBar.settings", Icon: SettingsIcon },
];

type BarProps = { height: number; onSelect: (tab: BottomTab) => void; /** Badge tin chưa đọc trên "Chat". */ chatUnread?: number };

/** SCR-04 #16: Vé · Chat · Người · Lịch sử · Cài đặt. Chat/Người/Lịch sử/Cài đặt mở khung "Sắp có" (T-008..T-012). */
export function BottomBar({ height, onSelect, chatUnread = 0 }: BarProps) {
  return (
    <nav data-testid="bottom-bar" style={{ height }} className="flex items-stretch border-t bg-background">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          data-testid={`tab-${id}`}
          onClick={() => onSelect(id)}
          aria-label={id === "chat" && chatUnread > 0 ? `${t(label)} · ${t("chat.unread", { n: chatUnread })}` : undefined}
          className="relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground active:bg-accent"
        >
          <Icon className="size-5" aria-hidden="true" />
          {id === "chat" && chatUnread > 0 && (
            <span
              data-testid="chat-badge"
              className="absolute top-1 left-1/2 ml-1.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 font-bold text-white"
            >
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          )}
          {t(label)}
        </button>
      ))}
    </nav>
  );
}

type SoonProps = {
  tab: Exclude<BottomTab, "tickets"> | null;
  onClose: () => void;
  /** Chừa chỗ cho thanh KINH + thanh nút dưới (px). */
  bottom: number;
};

const TAB_LABEL: Record<Exclude<BottomTab, "tickets">, I18nKey> = {
  chat: "bottomBar.chat",
  members: "bottomBar.members",
  history: "bottomBar.history",
  settings: "bottomBar.settings",
};

/** Khung "Sắp có" cho sheet chưa làm; nằm giữa header và thanh KINH/thanh nút dưới. */
export function ComingSoonSheet({ tab, onClose, bottom }: SoonProps) {
  return (
    <Sheet open={tab !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        data-testid="sheet-coming-soon"
        className="mx-auto h-[50dvh] max-w-[480px] rounded-t-xl"
        style={{ bottom }}
      >
        <SheetHeader>
          <SheetTitle>{tab ? t(TAB_LABEL[tab]) : ""}</SheetTitle>
          <SheetDescription>{t("bottomBar.comingSoon")}</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
