import type { TicketColor } from "@/features/room/shared/types";

export type TicketPalette = {
  /** Màu đậm: khung, tiêu đề, ô trống. */
  base: string;
  /** Màu chữ trên nền `base`. */
  onBase: string;
};

/** 8 màu vé (BR-08) → hex hằng số. Dùng cho khung/tiêu đề/ô trống của vé giấy và hình thu nhỏ. */
export const TICKET_PALETTE: Record<TicketColor, TicketPalette> = {
  red: { base: "#dc2626", onBase: "#ffffff" },
  orange: { base: "#ea580c", onBase: "#ffffff" },
  yellow: { base: "#eab308", onBase: "#1f2937" },
  green: { base: "#16a34a", onBase: "#ffffff" },
  teal: { base: "#0d9488", onBase: "#ffffff" },
  blue: { base: "#2563eb", onBase: "#ffffff" },
  purple: { base: "#7c3aed", onBase: "#ffffff" },
  pink: { base: "#db2777", onBase: "#ffffff" },
};
