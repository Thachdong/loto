// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import type { StreamPlayer } from "@/features/game/client/lib/stream-player";
import { SoundGate } from "./sound-gate";

const engine = () =>
  ({
    unlock: vi.fn().mockResolvedValue(undefined),
    isUnlocked: () => false,
    isBlocked: () => false,
    attach: vi.fn(),
    setMuted: vi.fn(),
    dispose: vi.fn(),
  }) satisfies StreamPlayer;

describe("SoundGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(cleanup);

  it("shows the overlay first time, unlocks on tap and remembers for the session", async () => {
    const e = engine();
    render(<SoundGate engine={e} />);
    await userEvent.click(await screen.findByText(dict.sound.gate));
    expect(e.unlock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("sound-gate")).toBeNull();
    expect(window.sessionStorage.getItem("loto:soundUnlocked")).toBe("1");
  });

  it("is hidden when sound is off", () => {
    window.localStorage.setItem("loto:sound", "off");
    render(<SoundGate engine={engine()} />);
    expect(screen.queryByTestId("sound-gate")).toBeNull();
  });

  it("is hidden when already unlocked this session and re-opens the context", () => {
    window.sessionStorage.setItem("loto:soundUnlocked", "1");
    const e = engine();
    render(<SoundGate engine={e} />);
    expect(screen.queryByTestId("sound-gate")).toBeNull();
    expect(e.unlock).toHaveBeenCalled();
  });
});
