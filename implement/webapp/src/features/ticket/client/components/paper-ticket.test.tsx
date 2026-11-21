// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PaperTicket } from "./paper-ticket";

/** 9×9: mỗi hàng đúng 5 số (cột 0,2,4,6,8), còn lại 0. */
const grid = Array.from({ length: 81 }, (_, i) => (i % 9) % 2 === 0 ? (i % 90) + 1 : 0);

describe("PaperTicket", () => {
  afterEach(cleanup);

  it("renders a 9x9 grid in 3 blocks of 3 rows with 5 numbers per row", () => {
    render(<PaperTicket id="red_a" grid={grid} />);
    const root = screen.getByTestId("paper-ticket-red_a");
    expect(root.querySelectorAll("[data-cell]")).toHaveLength(81);
    for (const block of [0, 1, 2]) {
      const el = within(root).getByTestId(`paper-block-${block}`);
      expect(el.querySelectorAll("[data-cell]")).toHaveLength(27);
      expect(el.querySelectorAll("[data-cell='num']")).toHaveLength(15);
    }
    const cells = Array.from(root.querySelectorAll("[data-cell]"));
    for (let row = 0; row < 9; row++) {
      const nums = cells.slice(row * 9, row * 9 + 9).filter((c) => c.getAttribute("data-cell") === "num");
      expect(nums).toHaveLength(5);
    }
  });

  it("shows grid numbers, colors the title and empty cells with the ticket color", () => {
    render(<PaperTicket id="red_a" grid={grid} />);
    const root = screen.getByTestId("paper-ticket-red_a");
    expect(root).toHaveTextContent("Đỏ A");
    expect(root.style.backgroundColor).toBe("rgb(220, 38, 38)");
    const empty = root.querySelector("[data-cell='empty']") as HTMLElement;
    expect(empty.style.backgroundColor).toBe("rgb(220, 38, 38)");
    expect(root.querySelector("[data-cell='num']")).toHaveTextContent("1");
  });
});
