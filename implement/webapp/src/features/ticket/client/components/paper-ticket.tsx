import type { TicketId } from "@/features/room/shared/types";
import { ticketColorOf } from "@/features/ticket/shared/constants";
import { TICKET_PALETTE } from "@/features/ticket/client/lib/ticket-colors";
import { ticketLabel } from "@/features/ticket/client/lib/ticket-label";

type Props = {
  id: TicketId;
  /** 81 phần tử theo hàng; 0 = ô trống (BR-08, ADR-14). */
  grid: readonly number[];
  className?: string;
};

const SIZE = 9;

/**
 * Vé giấy 9×9 (SCR-04 §5, SCR-05 #4): khung + tiêu đề màu vé, 3 khối × 3 hàng, ô trống đặc màu vé,
 * ô số nền trắng chữ đen 17px, ô 38×32px (co theo bề rộng ≤ 360px nhưng không vượt 38px).
 * Dùng chung cho T-005 (xem trước), T-006 và T-007.
 */
export function PaperTicket({ id, grid, className }: Props) {
  const palette = TICKET_PALETTE[ticketColorOf(id)];
  const blocks = [0, 1, 2];

  return (
    <div
      data-testid={`paper-ticket-${id}`}
      className={`mx-auto w-full max-w-[368px] overflow-hidden rounded-md ${className ?? ""}`}
      style={{ border: `3px solid ${palette.base}`, backgroundColor: palette.base }}
    >
      <div className="px-2 py-1 text-center text-sm font-bold" style={{ color: palette.onBase }}>
        {ticketLabel(id)}
      </div>
      <div className="flex flex-col gap-[3px]" style={{ backgroundColor: palette.base }}>
        {blocks.map((block) => (
          <div key={block} data-testid={`paper-block-${block}`} className="grid grid-cols-9 gap-px bg-neutral-300">
            {Array.from({ length: 3 * SIZE }, (_, i) => {
              const row = block * 3 + Math.floor(i / SIZE);
              const col = i % SIZE;
              const value = grid[row * SIZE + col] ?? 0;
              return value === 0 ? (
                <span
                  key={i}
                  data-cell="empty"
                  className="aspect-[38/32] w-full"
                  style={{ backgroundColor: palette.base }}
                />
              ) : (
                <span
                  key={i}
                  data-cell="num"
                  className="flex aspect-[38/32] w-full items-center justify-center bg-white text-[17px] leading-none font-semibold text-black tabular-nums"
                >
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
