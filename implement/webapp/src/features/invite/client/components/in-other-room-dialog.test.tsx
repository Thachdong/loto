// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { InOtherRoomDialog } from "./in-other-room-dialog";

const mocks = vi.hoisted(() => ({ useDocListener: vi.fn() }));
vi.mock("@/core/client/hooks/use-doc-listener", () => ({ useDocListener: mocks.useDocListener }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("InOtherRoomDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useDocListener.mockReturnValue({ status: "ready", data: "Phòng của Cúc", errorCode: null });
  });
  afterEach(cleanup);

  it("AC-11: shows the current room name read from rooms/{id}, 'Đóng' and 'Về phòng hiện tại' → /room", async () => {
    const onOpenChange = vi.fn();
    render(<InOtherRoomDialog open onOpenChange={onOpenChange} currentRoomId="r_old" />);
    expect(mocks.useDocListener).toHaveBeenCalledWith("rooms/r_old", expect.any(Function));
    expect(screen.getByTestId("join-other-room-body")).toHaveTextContent(
      dict.join.otherRoomBody.replace("{name}", "Phòng của Cúc"),
    );
    expect(screen.getByTestId("join-other-room-go")).toHaveAttribute("href", "/room");
    expect(screen.getByTestId("join-other-room-go")).toHaveTextContent(dict.join.otherRoomGo);
    await userEvent.click(screen.getByTestId("join-other-room-close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closed → renders nothing and does not listen", () => {
    render(<InOtherRoomDialog open={false} onOpenChange={vi.fn()} currentRoomId="r_old" />);
    expect(screen.queryByTestId("join-other-room-dialog")).not.toBeInTheDocument();
    expect(mocks.useDocListener).toHaveBeenCalledWith(null, expect.any(Function));
  });
});
