// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { writeLeaveReason } from "@/features/room/client/lib/leave-reason-store";
import { LEAVE_REASON_STORAGE_KEY } from "@/features/room/shared/constants";
import { LeaveReasonBanner } from "./leave-reason-banner";

describe("LeaveReasonBanner", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(cleanup);

  it("renders nothing without a record or with a corrupt record", () => {
    sessionStorage.setItem(LEAVE_REASON_STORAGE_KEY, "{not json");
    render(<LeaveReasonBanner />);
    expect(screen.queryByTestId("leave-reason-banner")).not.toBeInTheDocument();
  });

  it.each([
    ["expired", 'Phòng "Lô tô Tết" đã hết hạn.'],
    ["kicked", 'Bạn đã bị mời ra khỏi phòng "Lô tô Tết".'],
    ["host_left", 'Host đã đóng phòng "Lô tô Tết".'],
    ["left", 'Bạn đã rời phòng "Lô tô Tết".'],
    ["unknown", dict.leaveReason.unknown],
  ] as const)("AC-12: reason %s → %s", (reason, text) => {
    sessionStorage.setItem(LEAVE_REASON_STORAGE_KEY, JSON.stringify({ reason, roomName: "Lô tô Tết" }));
    render(<LeaveReasonBanner />);
    expect(screen.getByTestId("leave-reason-banner")).toHaveTextContent(text);
  });

  it("AC-12: appears when a record is written later; ✕ hides it and clears storage", async () => {
    render(<LeaveReasonBanner />);
    expect(screen.queryByTestId("leave-reason-banner")).not.toBeInTheDocument();
    act(() => writeLeaveReason({ reason: "expired", roomName: "X" }));
    expect(screen.getByTestId("leave-reason-banner")).toHaveTextContent('Phòng "X" đã hết hạn.');

    await userEvent.click(screen.getByTestId("leave-reason-dismiss"));
    expect(screen.queryByTestId("leave-reason-banner")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(LEAVE_REASON_STORAGE_KEY)).toBeNull();
  });

  it("missing room name → unknown text; pagehide (reload) clears the record", () => {
    sessionStorage.setItem(LEAVE_REASON_STORAGE_KEY, JSON.stringify({ reason: "expired", roomName: null }));
    render(<LeaveReasonBanner />);
    expect(screen.getByTestId("leave-reason-banner")).toHaveTextContent(dict.leaveReason.unknown);
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(sessionStorage.getItem(LEAVE_REASON_STORAGE_KEY)).toBeNull();
    expect(screen.queryByTestId("leave-reason-banner")).not.toBeInTheDocument();
  });
});
