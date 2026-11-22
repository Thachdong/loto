// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Board90Sheet } from "./board90-sheet";

describe("Board90Sheet", () => {
  afterEach(cleanup);

  it("renders 90 cells, marks called ones and the last", () => {
    render(<Board90Sheet open onClose={vi.fn()} calledNumbers={[3, 40, 7]} bottom={120} />);
    expect(screen.getAllByTestId(/^board-cell-/)).toHaveLength(90);
    expect(screen.getByTestId("board-cell-40")).toHaveAttribute("data-called", "true");
    expect(screen.getByTestId("board-cell-41")).toHaveAttribute("data-called", "false");
    expect(screen.getByTestId("board-cell-7")).toHaveAttribute("data-last", "true");
    expect(screen.getByTestId("board-cell-3")).toHaveAttribute("data-last", "false");
    expect(screen.getByTestId("board-called")).toHaveTextContent("3/90");
    expect(screen.getByTestId("board-recent")).toHaveTextContent("7, 40, 3");
  });

  it("empty state has no recent line", () => {
    render(<Board90Sheet open onClose={vi.fn()} calledNumbers={[]} bottom={0} />);
    expect(screen.queryByTestId("board-recent")).toBeNull();
    expect(screen.getByTestId("board-called")).toHaveTextContent("0/90");
  });

  it("is not rendered when closed", () => {
    render(<Board90Sheet open={false} onClose={vi.fn()} calledNumbers={[]} bottom={0} />);
    expect(screen.queryByTestId("board90")).toBeNull();
  });
});
