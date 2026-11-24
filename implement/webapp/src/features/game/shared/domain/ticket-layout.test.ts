import { describe, expect, it } from "vitest";
import { LAYOUT_HEIGHTS, ticketHeight, ticketLayout, ticketWidth } from "./ticket-layout";

describe("ticketLayout", () => {
  it("1 ticket: tall 28x48 cells, 22px font, 24px title, 12px gap, full header", () => {
    expect(ticketLayout(1)).toEqual({ cell: { w: 28, h: 48 }, font: 22, titleFont: 24, blockGap: 12, compactHeader: false });
  });
  it("2 tickets: tall 18x48 cells, 15px font, 14px title, 10px gap, compact header", () => {
    expect(ticketLayout(2)).toEqual({ cell: { w: 18, h: 48 }, font: 15, titleFont: 14, blockGap: 10, compactHeader: true });
  });
  it("ticket sizes (256x484 / 166x470), cells taller than wide; 2 tickets side by side fit 343px", () => {
    expect(ticketHeight(1)).toBe(484);
    expect(ticketHeight(2)).toBe(470);
    expect(ticketWidth(1)).toBe(256);
    expect(ticketWidth(2)).toBe(166);
    expect(2 * ticketWidth(2) + 8).toBeLessThanOrEqual(375 - 32);
    for (const n of [1, 2] as const) expect(ticketLayout(n).cell.h).toBeGreaterThan(ticketLayout(n).cell.w);
  });
  it("2 tickets side by side fit between the panel stack and the KINH bar at 375x812", () => {
    const h = LAYOUT_HEIGHTS.double;
    const top = h.header + h.panel + h.controls;
    const bottom = 812 - h.kinhBar - h.bottomBar;
    expect(top).toBe(144);
    expect(top + ticketHeight(2)).toBeLessThanOrEqual(bottom); // song song: 1 hàng
  });
  it("1 ticket fits above the bars", () => {
    const h = LAYOUT_HEIGHTS.single;
    expect(h.header + h.panel + h.controls + ticketHeight(1)).toBeLessThanOrEqual(812 - h.kinhBar - h.bottomBar);
  });
  it("header + panel heights match SCR-04", () => {
    expect(LAYOUT_HEIGHTS.single).toMatchObject({ header: 56, panel: 96 });
    expect(LAYOUT_HEIGHTS.double).toMatchObject({ header: 52, panel: 52 });
  });
});
