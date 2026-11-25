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
    voicePack: "v1" as const,
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

  it("giọng rao: người chơi chỉ xem, host chọn được", () => {
    setup();
    expect(screen.getByTestId("settings-voice-pack-readonly")).toHaveTextContent("Miền Tây");
    cleanup();
    setup({ isHost: true });
    expect(screen.getByTestId("settings-voice-pack-v1")).toHaveAttribute("aria-checked", "true");
  });

  it("AC-8/AC-12: player sees read-only interval and expiry time GMT+7; no profile row (Q-069)", () => {
    setup();
    expect(screen.getByTestId("settings-interval-readonly")).toHaveTextContent("5 giây/số (host chỉnh)");
    expect(screen.queryByTestId("settings-interval-stepper")).not.toBeInTheDocument();
    expect(screen.getByTestId("settings-expires")).toHaveTextContent("Phòng hết hạn lúc 22:00");
    expect(screen.queryByTestId("settings-profile")).not.toBeInTheDocument();
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

  it("AC-7: host stepper 5/10/15 — minus disabled at 5, plus disabled at 15", async () => {
    const step = vi.fn();
    setup({ isHost: true, interval: { value: 5, step, forbidden: false } });
    expect(screen.getByTestId("settings-interval-value")).toHaveTextContent("5 giây");
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
