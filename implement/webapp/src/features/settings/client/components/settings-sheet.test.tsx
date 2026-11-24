// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsSheet } from "./settings-sheet";

vi.mock("@/features/room/server/actions/update-room.action", () => ({ updateRoomAction: vi.fn() }));

const EXPIRES = new Date(Date.UTC(2026, 10, 24, 15, 0)); // 22:00 GMT+7

function setup(over: Partial<Parameters<typeof SettingsSheet>[0]> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    bottom: 0,
    roomId: "r1",
    isHost: false,
    drawIntervalSec: 5,
    expiresAt: EXPIRES,
    mode: "manual" as const,
    onModeChange: vi.fn(),
    soundOn: true,
    onSoundChange: vi.fn(),
    ...over,
  };
  render(<SettingsSheet {...props} />);
  return props;
}

describe("SettingsSheet", () => {
  afterEach(cleanup);

  it("AC-8/AC-12: player sees read-only interval, expiry time GMT+7, profile row disabled", () => {
    setup();
    expect(screen.getByTestId("settings-interval-readonly")).toHaveTextContent("5 giây/số (host chỉnh)");
    expect(screen.queryByTestId("settings-interval-stepper")).not.toBeInTheDocument();
    expect(screen.getByTestId("settings-expires")).toHaveTextContent("Phòng hết hạn lúc 22:00");
    expect(screen.getByTestId("settings-profile")).toHaveAttribute("aria-disabled", "true");
  });

  it("AC-1/AC-2: mode segmented calls onModeChange; current mode is checked", async () => {
    const props = setup({ mode: "manual" });
    expect(screen.getByTestId("settings-mode-manual")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("settings-mode-auto")).toHaveTextContent("Tự dò");
    await userEvent.click(screen.getByTestId("settings-mode-auto"));
    expect(props.onModeChange).toHaveBeenCalledWith("auto");
    await userEvent.click(screen.getByTestId("settings-mode-manual"));
    expect(props.onModeChange).toHaveBeenCalledTimes(1);
  });

  it("AC-4/AC-5: sound switch toggles", async () => {
    const props = setup({ soundOn: false });
    expect(screen.getByTestId("settings-sound")).toHaveAttribute("aria-checked", "false");
    await userEvent.click(screen.getByTestId("settings-sound"));
    expect(props.onSoundChange).toHaveBeenCalledWith(true);
  });

  it("AC-7: host stepper — minus disabled at 3, plus disabled at 15", async () => {
    const step = vi.fn();
    setup({ isHost: true, interval: { value: 3, step, forbidden: false } });
    expect(screen.getByTestId("settings-interval-value")).toHaveTextContent("3 giây");
    expect(screen.getByTestId("btn-interval-minus")).toBeDisabled();
    await userEvent.click(screen.getByTestId("btn-interval-plus"));
    expect(step).toHaveBeenCalledWith(1);
    cleanup();
    setup({ isHost: true, interval: { value: 15, step, forbidden: false } });
    expect(screen.getByTestId("btn-interval-plus")).toBeDisabled();
  });

  it("NOT_ROOM_HOST → host stepper becomes read-only", () => {
    setup({ isHost: true, interval: { value: 5, step: vi.fn(), forbidden: true } });
    expect(screen.getByTestId("settings-interval-readonly")).toBeInTheDocument();
  });
});
