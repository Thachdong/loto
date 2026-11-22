// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ClaimView } from "@/features/room/shared/types";
import { ClaimCard } from "./claim-card";

const claims: ClaimView[] = [
  { uid: "u_c", displayName: "Cúc", ticketId: "blue_a", color: "blue", result: "win", row: 0, claimedAtMs: 1 },
  { uid: "u_b", displayName: "Bình", ticketId: "red_a", color: "red", result: "miss", row: null, claimedAtMs: 2 },
];

describe("ClaimCard", () => {
  afterEach(cleanup);

  it("shows the first claimer, waiting-host line and one item per claim with the hint", () => {
    render(<ClaimCard claims={claims} />);
    const card = screen.getByTestId("claim-card");
    expect(card).toHaveTextContent("Cúc KINH!");
    expect(card).toHaveTextContent("Đang chờ host duyệt…");
    expect(screen.getByTestId("claim-item-u_c-blue_a")).toHaveTextContent("Cúc · vé Lam A");
    expect(screen.getByTestId("claim-item-u_c-blue_a")).toHaveTextContent("Vé đủ hàng");
    expect(screen.getByTestId("claim-item-u_b-red_a")).toHaveTextContent("Vé chưa đủ hàng");
  });

  it("has no host buttons (T-007 adds them) and renders nothing without claims", () => {
    const { rerender } = render(<ClaimCard claims={claims} />);
    expect(screen.getByTestId("claim-card").querySelector("button")).toBeNull();
    rerender(<ClaimCard claims={[]} />);
    expect(screen.queryByTestId("claim-card")).not.toBeInTheDocument();
  });
});
