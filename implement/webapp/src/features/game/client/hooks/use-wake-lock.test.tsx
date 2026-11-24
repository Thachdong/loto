// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "./use-wake-lock";

const root = document.documentElement;

function installWakeLock() {
  const release = vi.fn().mockResolvedValue(undefined);
  const request = vi.fn().mockResolvedValue({ release, addEventListener: vi.fn() });
  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
  return { request, release };
}

describe("useWakeLock", () => {
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, "wakeLock");
    delete root.dataset.wakelock;
  });

  it("acquires while active and releases afterwards", async () => {
    const { request, release } = installWakeLock();
    const { rerender } = renderHook(({ on }) => useWakeLock(on), { initialProps: { on: true } });
    await act(async () => undefined);
    expect(request).toHaveBeenCalledWith("screen");
    expect(root.dataset.wakelock).toBe("active");
    rerender({ on: false });
    expect(release).toHaveBeenCalled();
    expect(root.dataset.wakelock).toBe("released");
  });

  it("reports unsupported without throwing", () => {
    renderHook(() => useWakeLock(true));
    expect(root.dataset.wakelock).toBe("unsupported");
  });

  it("is released when inactive from the start", () => {
    renderHook(() => useWakeLock(false));
    expect(root.dataset.wakelock).toBe("released");
  });
});
