import { describe, expect, it } from "vitest";
import { LAYOUT_HEIGHTS, ticketHeight, ticketLayout, ticketWidth } from "./ticket-layout";

describe("ticketLayout", () => {
  it("1 ticket: tall 32x40 cells, 20px font, 24px title, 12px gap, full header", () => {
    expect(ticketLayout(1)).toEqual({ cell: { w: 32, h: 40 }, font: 20, titleFont: 24, blockGap: 12, compactHeader: false });
  });
  it("2 tickets: tall 24x27 cells, 14px font, 16px title, 9px gap, compact header", () => {
    expect(ticketLayout(2)).toEqual({ cell: { w: 24, h: 27 }, font: 14, titleFont: 16, blockGap: 9, compactHeader: true });
  });
  it("ticket sizes (412x292 / 281x220), cells taller than wide", () => {
    expect(ticketHeight(1)).toBe(412);
    expect(ticketHeight(2)).toBe(281);
    expect(ticketWidth(1)).toBe(292);
    expect(ticketWidth(2)).toBe(220);
    for (const n of [1, 2] as const) expect(ticketLayout(n).cell.h).toBeGreaterThan(ticketLayout(n).cell.w);
  });
  it("2 tickets + gap fit between the panel stack and the KINH bar at 375x812", () => {
    const h = LAYOUT_HEIGHTS.double;
    const top = h.header + h.panel + h.controls;
    const bottom = 812 - h.kinhBar - h.bottomBar;
    expect(top).toBe(144);
    expect(top + 2 * ticketHeight(2) + 6).toBeLessThanOrEqual(bottom);
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
