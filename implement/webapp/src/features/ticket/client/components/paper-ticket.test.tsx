// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
      expect(el.querySelectorAll("[data-cell]:not([data-cell='empty'])")).toHaveLength(15);
    }
    const cells = Array.from(root.querySelectorAll("[data-cell]"));
    for (let row = 0; row < 9; row++) {
      const nums = cells.slice(row * 9, row * 9 + 9).filter((c) => c.getAttribute("data-cell") !== "empty");
      expect(nums).toHaveLength(5);
    }
  });

  it("paper style: ticket-color frame/title/empty cells, separators with ornament text between the 3 blocks", () => {
    render(<PaperTicket id="red_a" grid={grid} />);
    const root = screen.getByTestId("paper-ticket-red_a");
    expect(root).toHaveTextContent("Đỏ A");
    expect(root.style.borderColor).toBe("rgb(220, 38, 38)");
    expect(within(root).getByTestId("paper-title").style.color).toBe("rgb(220, 38, 38)");
    // 2 dải ngăn giữa 3 cụm, có chữ in giữa (bố cục xem trước)
    expect(within(root).getAllByTestId("paper-separator")).toHaveLength(2);
    expect(within(root).getAllByTestId("paper-separator")[0]).toHaveTextContent("buddio.com");
    const empty = root.querySelector("[data-cell='empty']") as HTMLElement;
    expect(empty.style.backgroundColor).toBe("rgb(220, 38, 38)");
    expect(root.querySelector("[data-cell]:not([data-cell='empty'])")).toHaveTextContent("1");
  });

  it("single/double sizes use the SCR-04 cell height and font (tall 28x48/22px, 18x48/15px) and width", () => {
    const { rerender } = render(<PaperTicket id="red_a" grid={grid} size="single" />);
    let cell = screen.getByTestId("paper-ticket-red_a").querySelector("[data-cell='1']") as HTMLElement;
    expect(cell.style.height).toBe("48px");
    expect(cell.style.fontSize).toBe("22px");
    expect(screen.getByTestId("paper-ticket-red_a").style.maxWidth).toBe("256px");
    rerender(<PaperTicket id="red_a" grid={grid} size="double" />);
    cell = screen.getByTestId("paper-ticket-red_a").querySelector("[data-cell='1']") as HTMLElement;
    expect(cell.style.height).toBe("48px");
    expect(cell.style.fontSize).toBe("15px");
    expect(screen.getByTestId("paper-ticket-red_a").style.maxWidth).toBe("166px");
  });

  it("marks, auto hit and waiting rows are exposed as data attributes", () => {
    render(<PaperTicket id="red_a" grid={grid} size="single" marks={new Set([1, 3])} autoHit={3} waitingRows={[0]} testId="ticket-red_a" />);
    const root = screen.getByTestId("ticket-red_a");
    const one = root.querySelector("[data-cell='1']") as HTMLElement;
    const three = root.querySelector("[data-cell='3']") as HTMLElement;
    expect(one).toHaveAttribute("data-marked", "true");
    expect(one).not.toHaveAttribute("data-hit");
    expect(three).toHaveAttribute("data-hit", "true");
    expect(one).toHaveAttribute("data-waiting", "true");
    expect(root.querySelector("[data-cell='5']")).toHaveAttribute("data-marked", "false");
  });

  it("onCellTap fires with the number only for number cells; without it cells are not buttons", async () => {
    const onCellTap = vi.fn();
    const { rerender } = render(<PaperTicket id="red_a" grid={grid} onCellTap={onCellTap} />);
    const root = screen.getByTestId("paper-ticket-red_a");
    await userEvent.click(root.querySelector("[data-cell='1']") as HTMLElement);
    expect(onCellTap).toHaveBeenCalledWith(1);
    expect(root.querySelectorAll("[data-cell='empty']")[0].tagName).toBe("SPAN");
    rerender(<PaperTicket id="red_a" grid={grid} />);
    expect(screen.getByTestId("paper-ticket-red_a").querySelectorAll("button")).toHaveLength(0);
  });
});
