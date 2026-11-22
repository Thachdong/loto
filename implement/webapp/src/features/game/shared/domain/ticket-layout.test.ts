import { describe, expect, it } from "vitest";
import { LAYOUT_HEIGHTS, ticketHeight, ticketLayout } from "./ticket-layout";

describe("ticketLayout", () => {
  it("1 ticket: 38x32 cells, 17px font, 24px title, 10px gap, full header", () => {
    expect(ticketLayout(1)).toEqual({ cell: { w: 38, h: 32 }, font: 17, titleFont: 24, blockGap: 10, compactHeader: false });
  });
  it("2 tickets: 38x28 cells, 15px font, 16px title, 5px gap, compact header", () => {
    expect(ticketLayout(2)).toEqual({ cell: { w: 38, h: 28 }, font: 15, titleFont: 16, blockGap: 5, compactHeader: true });
  });
  it("ticket heights match SCR-04 (≈336 / 282)", () => {
    expect(ticketHeight(1)).toBe(336);
    expect(ticketHeight(2)).toBe(282);
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
