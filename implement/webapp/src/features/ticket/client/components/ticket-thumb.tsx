import type { TicketColor } from "@/features/room/shared/types";
import { TICKET_PALETTE } from "@/features/ticket/client/lib/ticket-colors";

type Props = { color: TicketColor; grid: readonly number[] | null };

/** Hình thu nhỏ (SCR-05 #3): ô trống màu vé đậm, ô có số màu trắng, không hiện số. */
export function TicketThumb({ color, grid }: Props) {
  const { base } = TICKET_PALETTE[color];
  return (
    <div
      aria-hidden="true"
      data-testid="ticket-thumb"
      className="grid w-full grid-cols-9 gap-px rounded-[2px] p-px"
      style={{ backgroundColor: base }}
    >
      {Array.from({ length: 81 }, (_, i) => {
        const value = grid ? (grid[i] ?? 0) : 0;
        return (
          <span
            key={i}
            className="aspect-[32/40]"
            style={{ backgroundColor: grid && value !== 0 ? "#ffffff" : base, filter: grid ? undefined : "brightness(1.4)" }}
          />
        );
      })}
    </div>
  );
}
