export type TicketLayout = {
  /** Kích thước ô (px). */
  cell: { w: 32; h: 40 } | { w: 24; h: 27 };
  /** Cỡ chữ số (px). */
  font: 20 | 14;
  /** Cỡ chữ tiêu đề vé (px). */
  titleFont: 24 | 16;
  /** Dải ngăn 3 khối (px). */
  blockGap: 12 | 9;
  /** Header 52px + panel số rao 1 dòng khi giữ 2 vé (Q-049). */
  compactHeader: boolean;
};

/** SCR-04 §5: bố cục theo số vé đang giữ (1 vé đầy đủ, 2 vé xếp dọc không cuộn). */
export function ticketLayout(count: 1 | 2): TicketLayout {
  return count === 2
    ? { cell: { w: 24, h: 27 }, font: 14, titleFont: 16, blockGap: 9, compactHeader: true }
    : { cell: { w: 32, h: 40 }, font: 20, titleFont: 24, blockGap: 12, compactHeader: false };
}

/** Chiều cao các dải cố định theo bố cục (px) — SCR-04 §5; cộng với vé phải ≤ 812. */
export const LAYOUT_HEIGHTS = {
  single: { header: 56, panel: 96, controls: 40, kinhBar: 56, bottomBar: 64 },
  double: { header: 52, panel: 52, controls: 40, kinhBar: 48, bottomBar: 48 },
} as const;

/** Chiều cao 1 vé theo bố cục: 9 hàng + 2 dải ngăn + tiêu đề + viền 2×2px (412 / 281, SCR-04 §5 — Q-064: ô dọc cao hơn rộng). */
export function ticketHeight(count: 1 | 2): number {
  const l = ticketLayout(count);
  return 9 * l.cell.h + 2 * l.blockGap + l.titleFont + 4;
}

/** Bề rộng 1 vé: 9 cột + viền 2×2px. */
export function ticketWidth(count: 1 | 2): number {
  return 9 * ticketLayout(count).cell.w + 4;
}
