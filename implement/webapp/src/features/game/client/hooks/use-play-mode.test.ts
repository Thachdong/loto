// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isSoundOn, setSoundOn } from "@/features/game/client/lib/sound-pref";
import { setPlayMode, usePlayMode } from "./use-play-mode";

describe("settings store fallback (AC-3, AC-13)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("persists mode in localStorage", () => {
    const { result } = renderHook(() => usePlayMode());
    act(() => setPlayMode("auto"));
    expect(result.current).toBe("auto");
    expect(window.localStorage.getItem("loto:mode")).toBe("auto");
    act(() => setPlayMode("manual"));
  });

  it("localStorage throws → mode and sound still change in memory", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => usePlayMode());
    act(() => setPlayMode("auto"));
    expect(result.current).toBe("auto");
    setSoundOn(false);
    expect(isSoundOn()).toBe(false);
  });
});
