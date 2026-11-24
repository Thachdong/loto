import { Fragment, type CSSProperties } from "react";
import type { TicketId } from "@/features/room/shared/types";
import { ticketLayout, ticketWidth } from "@/features/game/shared/domain/ticket-layout";
import { ticketColorOf } from "@/features/ticket/shared/constants";
import { TICKET_PALETTE } from "@/features/ticket/client/lib/ticket-colors";
import { ticketLabel } from "@/features/ticket/client/lib/ticket-label";

type Props = {
  id: TicketId;
  /** 81 phần tử theo hàng; 0 = ô trống (BR-08, ADR-14). */
  grid: readonly number[];
  className?: string;
  /**
   * Bố cục SCR-04 §5: `single` (ô dọc 32×40, chữ 20px, tiêu đề 24px) / `double` (ô 24×27, chữ 14px, tiêu đề 16px).
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

  const titleStyle: CSSProperties = {
    color: palette.base,
    ...(layout ? { fontSize: layout.titleFont, lineHeight: 1 } : {}),
  };
  const sepHeight = layout ? layout.blockGap : 14;

  return (
    <div
      data-testid={testId ?? `paper-ticket-${id}`}
      data-size={size}
      className={`mx-auto w-full overflow-hidden rounded-[3px] ${layout ? "" : "max-w-[300px]"} ${className ?? ""}`}
      style={{
        ...(layout ? { maxWidth: ticketWidth(size === "double" ? 2 : 1) } : {}),
        border: `${layout ? 2 : 3}px solid ${palette.base}`,
        backgroundColor: PAPER,
        // Vân giấy nhẹ + viền kép bên trong như vé in.
        backgroundImage:
          "radial-gradient(rgba(120,90,40,0.06) 1px, transparent 1px)",
        backgroundSize: "4px 4px",
        boxShadow: `inset 0 0 0 1px ${PAPER}, inset 0 0 0 2px ${palette.base}55, 0 1px 3px rgba(0,0,0,0.25)`,
      }}
    >
      <div
        data-testid="paper-title"
        className={`flex items-center justify-center gap-1.5 px-2 text-center font-black tracking-wide uppercase ${layout ? "" : "py-1 text-sm"}`}
        style={titleStyle}
      >
        <span aria-hidden="true" className="text-[0.6em] opacity-80">
          ❖ ✦
        </span>
        {ticketLabel(id)}
        <span aria-hidden="true" className="text-[0.6em] opacity-80">
          ✦ ❖
        </span>
      </div>
      <div className="flex flex-col">
        {blocks.map((block) => (
          <Fragment key={block}>
            {block > 0 && (
              <BlockSeparator height={sepHeight} color={palette.base} />
            )}
            <div
              data-testid={`paper-block-${block}`}
              className={`grid grid-cols-9 ${layout ? "" : "gap-px p-px"}`}
              style={{ backgroundColor: GRID_LINE }}
            >
              {Array.from({ length: 3 * SIZE }, (_, i) => {
                const row = block * 3 + Math.floor(i / SIZE);
                const col = i % SIZE;
                const value = grid[row * SIZE + col] ?? 0;
                const cellStyle: CSSProperties | undefined = layout
                  ? { height: layout.cell.h, fontSize: layout.font }
                  : undefined;
                const aspect = layout ? "" : "aspect-[32/40] ";
                const lines0 = layout
                  ? "outline-1 -outline-offset-1 outline-[#3b2f24] "
                  : "";
                if (value === 0) {
                  return (
                    <span
                      key={i}
                      data-cell="empty"
                      className={`${lines0}${aspect}w-full`}
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
                const lines = layout
                  ? "outline-1 -outline-offset-1 outline-[#3b2f24] "
                  : "";
                const common = `${lines}${aspect}flex w-full items-center justify-center leading-none font-black tracking-[-0.04em] tabular-nums [font-family:'Arial_Narrow','Roboto_Condensed','Helvetica_Neue',Arial,sans-serif] ${layout ? "" : "text-[17px]"} ${state} ${ring}`;
                const attrs = {
                  "data-cell": String(value),
                  "data-marked": marked ? "true" : "false",
                  "data-hit": hit ? "true" : undefined,
                  "data-waiting": isWaiting ? "true" : undefined,
                  style: cellStyle,
                };
                return onCellTap ? (
                  <button
                    key={i}
                    type="button"
                    className={`${common} cursor-pointer`}
                    onClick={() => onCellTap(value)}
                    {...attrs}
                  >
                    {value}
                  </button>
                ) : (
                  <span key={i} className={common} {...attrs}>
                    {value}
                  </span>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** Màu giấy vé và màu kẻ ô caro. */
const PAPER = "#fdf8ec";
const GRID_LINE = "#3b2f24";
/** Chữ in giữa các cụm 3 hàng (như vé thật in tên nhà in). */
const SEPARATOR_TEXT = "buddio.com";

/** Dải ngăn giữa 2 cụm 3 hàng: "-------buddio.com-------" (gạch đứt màu vé, chữ in nghiêng). */
function BlockSeparator({ height, color }: { height: number; color: string }) {
  const dashes = { backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`, height: 1.5 };
  return (
    <div
      data-testid="paper-separator"
      aria-hidden="true"
      className="flex items-center justify-center gap-1 overflow-hidden px-1"
      style={{ height, color }}
    >
      <span className="flex-1" style={dashes} />
      <span className="shrink-0 leading-none font-semibold italic" style={{ fontSize: Math.min(10, height - 1) }}>
        {SEPARATOR_TEXT}
      </span>
      <span className="flex-1" style={dashes} />
    </div>
  );
}
