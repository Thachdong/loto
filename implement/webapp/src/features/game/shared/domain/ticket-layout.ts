export type TicketLayout = {
  /** Kích thước ô (px). */
  cell: { w: 38; h: 32 } | { w: 38; h: 28 };
  /** Cỡ chữ số (px). */
  font: 17 | 15;
  /** Cỡ chữ tiêu đề vé (px). */
  titleFont: 24 | 16;
  /** Dải ngăn 3 khối (px). */
  blockGap: 10 | 5;
  /** Header 52px + panel số rao 1 dòng khi giữ 2 vé (Q-049). */
  compactHeader: boolean;
};

/** SCR-04 §5: bố cục theo số vé đang giữ (1 vé đầy đủ, 2 vé xếp dọc không cuộn). */
export function ticketLayout(count: 1 | 2): TicketLayout {
  return count === 2
    ? { cell: { w: 38, h: 28 }, font: 15, titleFont: 16, blockGap: 5, compactHeader: true }
    : { cell: { w: 38, h: 32 }, font: 17, titleFont: 24, blockGap: 10, compactHeader: false };
}

/** Chiều cao các dải cố định theo bố cục (px) — SCR-04 §5; cộng với vé phải ≤ 812. */
export const LAYOUT_HEIGHTS = {
  single: { header: 56, panel: 96, controls: 40, kinhBar: 56, bottomBar: 64 },
  double: { header: 52, panel: 52, controls: 40, kinhBar: 48, bottomBar: 48 },
} as const;

/** Chiều cao 1 vé theo bố cục: 9 hàng + 2 dải ngăn + tiêu đề + viền 2×2px (≈336 / ≈282, SCR-04 §5). */
export function ticketHeight(count: 1 | 2): number {
  const l = ticketLayout(count);
  return 9 * l.cell.h + 2 * l.blockGap + l.titleFont + 4;
}
