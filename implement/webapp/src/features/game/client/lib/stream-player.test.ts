import { describe, expect, it, vi } from "vitest";
import { createStreamPlayer, ERROR_TOAST_AFTER } from "./stream-player";

class FakeAudio extends EventTarget {
  src = "";
  preload = "";
  currentTime = 0;
  buffered = { length: 0, end: () => 0 };
  play = vi.fn(async () => undefined);
  pause = vi.fn();
  load = vi.fn();
  getAttribute = (name: string) => (name === "src" && this.src ? this.src : null);
  removeAttribute = () => {
    this.src = "";
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(url: (id: string) => Promise<string | null> = async (id) => `http://s/rooms/${id}/stream`) {
  const el = new FakeAudio();
  const timers: (() => void)[] = [];
  const onLoadError = vi.fn();
  const player = createStreamPlayer({
    streamUrl: url,
    createAudio: () => el as unknown as HTMLAudioElement,
    setTimer: (fn) => timers.push(fn),
    clearTimer: () => undefined,
    onLoadError,
    log: () => undefined,
  });
  return { el, timers, player, onLoadError };
}

describe("createStreamPlayer", () => {
  it("chưa chạm bật tiếng → không nối; unlock → nối + phát", async () => {
    const { el, player } = setup();
    player.attach("r1");
    await flush();
    expect(el.play).not.toHaveBeenCalled();
    await player.unlock();
    expect(el.src).toBe("http://s/rooms/r1/stream");
    expect(el.play).toHaveBeenCalledTimes(1);
  });

  it("tắt tiếng → ngắt luồng; bật lại → nối mới", async () => {
    const { el, player } = setup();
    player.attach("r1");
    await player.unlock();
    player.setMuted(true);
    await flush();
    expect(el.src).toBe("");
    expect(el.pause).toHaveBeenCalled();
    player.setMuted(false);
    await flush();
    expect(el.src).toContain("r1");
    expect(el.play).toHaveBeenCalledTimes(2);
  });

  it("trình duyệt chặn → isBlocked; chạm lần sau phát lại", async () => {
    const { el, player } = setup();
    el.play.mockRejectedValueOnce(new DOMException("no", "NotAllowedError"));
    player.attach("r1");
    await player.unlock();
    expect(player.isBlocked()).toBe(true);
    await player.unlock();
    expect(player.isBlocked()).toBe(false);
  });

  it("luồng lỗi → nối lại; lỗi liên tiếp → báo 1 lần", async () => {
    const { el, player, timers, onLoadError } = setup();
    player.attach("r1");
    await player.unlock();
    for (let i = 0; i < ERROR_TOAST_AFTER + 1; i++) {
      el.dispatchEvent(new Event("error"));
      timers.shift()?.();
      await flush();
    }
    expect(onLoadError).toHaveBeenCalledTimes(1);
    expect(el.play.mock.calls.length).toBeGreaterThan(ERROR_TOAST_AFTER);
  });

  it("đổi phòng / rời phòng", async () => {
    const { el, player } = setup();
    player.attach("r1");
    await player.unlock();
    player.attach("r2");
    await flush();
    expect(el.src).toContain("r2");
    player.attach(null);
    await flush();
    expect(el.src).toBe("");
  });

  it("chưa đăng nhập (url null) → thử lại sau", async () => {
    const url = vi.fn<(id: string) => Promise<string | null>>().mockResolvedValueOnce(null).mockResolvedValue("http://s/x");
    const { el, player, timers } = setup(url);
    player.attach("r1");
    await player.unlock();
    expect(el.play).not.toHaveBeenCalled();
    timers.shift()?.();
    await flush();
    expect(el.play).toHaveBeenCalled();
  });
});
