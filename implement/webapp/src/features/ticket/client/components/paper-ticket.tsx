import type { CSSProperties } from "react";
import type { TicketId } from "@/features/room/shared/types";
import { ticketLayout } from "@/features/game/shared/domain/ticket-layout";
import { ticketColorOf } from "@/features/ticket/shared/constants";
import { TICKET_PALETTE } from "@/features/ticket/client/lib/ticket-colors";
import { ticketLabel } from "@/features/ticket/client/lib/ticket-label";

type Props = {
  id: TicketId;
  /** 81 phần tử theo hàng; 0 = ô trống (BR-08, ADR-14). */
  grid: readonly number[];
  className?: string;
  /**
   * Bố cục SCR-04 §5: `single` (ô 38×32, chữ 17px, tiêu đề 24px) / `double` (ô 38×28, chữ 15px, tiêu đề 16px).
   * Bỏ trống = bố cục co theo bề rộng của SCR-05 (xem trước).
   */
  size?: "single" | "double";
  /** Các số đã đánh dấu (nền tối chữ trắng). */
  marks?: ReadonlySet<number> | readonly number[];
  /** Chạm ô có số (chỉ truyền khi cho phép: mode Tự dò và ván không `waiting`). */
  onCellTap?: (n: number) => void;
  /** Mode Auto: số vừa rao có trên vé → viền đỏ. */
  autoHit?: number | null;
  /** Mode Auto: các hàng còn thiếu 1 số → viền "chờ". */
  waitingRows?: readonly number[];
  /** `solid` (Tự dò) / `soft` (Auto: tô nhạt hơn, không chạm được). */
  markedStyle?: "solid" | "soft";
  /** Ghi đè `data-testid` gốc (mặc định `paper-ticket-{id}`). */
  testId?: string;
};

const SIZE = 9;

/**
 * Vé giấy 9×9 (SCR-04 §5, SCR-05 #4): khung + tiêu đề màu vé, 3 khối × 3 hàng, ô trống đặc màu vé,
 * ô số nền trắng chữ đen, ô đã đánh dấu nền tối chữ trắng.
 * Dùng chung cho T-005 (xem trước), T-006 và T-007.
 */
export function PaperTicket({
  id,
  grid,
  className,
  size,
  marks,
  onCellTap,
  autoHit = null,
  waitingRows,
  markedStyle = "solid",
  testId,
}: Props) {
  const palette = TICKET_PALETTE[ticketColorOf(id)];
  const layout = size ? ticketLayout(size === "double" ? 2 : 1) : null;
  const markSet = marks instanceof Set ? marks : new Set(marks ?? []);
  const waiting = new Set(waitingRows ?? []);
  const blocks = [0, 1, 2];

  const titleStyle: CSSProperties = { color: palette.onBase, ...(layout ? { fontSize: layout.titleFont, lineHeight: 1 } : {}) };
  const stackStyle: CSSProperties = { backgroundColor: palette.base, ...(layout ? { gap: layout.blockGap } : {}) };

  return (
    <div
      data-testid={testId ?? `paper-ticket-${id}`}
      data-size={size}
      className={`mx-auto w-full overflow-hidden rounded-md ${layout ? "max-w-[346px]" : "max-w-[368px]"} ${className ?? ""}`}
      style={{ border: `${layout ? 2 : 3}px solid ${palette.base}`, backgroundColor: palette.base }}
    >
      <div className={`px-2 text-center font-bold ${layout ? "" : "py-1 text-sm"}`} style={titleStyle}>
        {ticketLabel(id)}
      </div>
      <div className={`flex flex-col ${layout ? "" : "gap-[3px]"}`} style={stackStyle}>
        {blocks.map((block) => (
          <div key={block} data-testid={`paper-block-${block}`} className={`grid grid-cols-9 bg-neutral-300 ${layout ? "" : "gap-px"}`}>
            {Array.from({ length: 3 * SIZE }, (_, i) => {
              const row = block * 3 + Math.floor(i / SIZE);
              const col = i % SIZE;
              const value = grid[row * SIZE + col] ?? 0;
              const cellStyle: CSSProperties | undefined = layout
                ? { height: layout.cell.h, fontSize: layout.font }
                : undefined;
              const aspect = layout ? "" : "aspect-[38/32] ";
              if (value === 0) {
                return (
                  <span
                    key={i}
                    data-cell="empty"
                    className={`${aspect}w-full`}
                    style={{ ...cellStyle, backgroundColor: palette.base }}
                  />
                );
              }
              const marked = markSet.has(value);
              const hit = autoHit === value;
              const isWaiting = waiting.has(row);
              const state = marked
                ? markedStyle === "soft"
                  ? "bg-neutral-400 text-black"
                  : "bg-neutral-800 text-white"
                : "bg-white text-black";
              const ring = hit
                ? "ring-2 ring-inset ring-red-600"
                : isWaiting
                  ? "ring-2 ring-inset ring-amber-400"
                  : "";
              const lines = layout ? "outline-1 -outline-offset-1 outline-neutral-300 " : "";
              const common = `${lines}${aspect}flex w-full items-center justify-center leading-none font-semibold tabular-nums ${layout ? "" : "text-[17px]"} ${state} ${ring}`;
              const attrs = {
                "data-cell": String(value),
                "data-marked": marked ? "true" : "false",
                "data-hit": hit ? "true" : undefined,
                "data-waiting": isWaiting ? "true" : undefined,
                style: cellStyle,
              };
              return onCellTap ? (
                <button key={i} type="button" className={`${common} cursor-pointer`} onClick={() => onCellTap(value)} {...attrs}>
                  {value}
                </button>
              ) : (
                <span key={i} className={common} {...attrs}>
                  {value}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
