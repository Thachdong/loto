import "client-only";

/**
 * Phát luồng tiếng rao của phòng (ADR-08 sửa đổi): server gửi 1 luồng MP3 liên tục, client chỉ cần `<audio>`.
 * - `unlock()` gọi trong cử chỉ người dùng (NFR-14: trình duyệt chặn tự phát).
 * - Luồng lỗi / kết thúc → nối lại (lùi dần 1 → 8 giây). Lỗi liên tiếp → `onLoadError` 1 lần (vẫn chơi bằng hình).
 * - Tắt tiếng → ngắt luồng (không tốn băng thông); bật lại → nối vào điểm phát hiện tại (live).
 * - Đệm dồn quá `MAX_LAG_S` (máy treo, tab nền) → nối lại để bắt kịp số trên màn hình.
 */
export type StreamPlayer = {
  unlock(): Promise<void>;
  isUnlocked(): boolean;
  /** Trình duyệt vẫn chặn phát (cần thêm một lần chạm). */
  isBlocked(): boolean;
  /** Phòng đang nghe (`null` = ngắt). */
  attach(roomId: string | null): void;
  setMuted(muted: boolean): void;
  dispose(): void;
};

export type StreamPlayerDeps = {
  /** URL luồng của phòng (kèm token), `null` khi chưa đăng nhập. */
  streamUrl: (roomId: string) => Promise<string | null>;
  createAudio?: () => HTMLAudioElement;
  onLoadError?: () => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  log?: (payload: Record<string, unknown>) => void;
};

export const RETRY_BASE_MS = 1000;
export const RETRY_MAX_MS = 8000;
export const ERROR_TOAST_AFTER = 3;
export const MAX_LAG_S = 4;

export function createStreamPlayer(deps: StreamPlayerDeps): StreamPlayer {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const log =
    deps.log ??
    ((payload: Record<string, unknown>) => {
      if (process.env.NODE_ENV !== "production") console.debug("[stream]", payload);
    });

  let audio: HTMLAudioElement | null = null;
  let roomId: string | null = null;
  let muted = false;
  let unlocked = false;
  let blocked = false;
  let failures = 0;
  let toasted = false;
  let retry: unknown = null;
  let generation = 0;

  const wanted = () => unlocked && !muted && roomId !== null;

  function element(): HTMLAudioElement {
    if (audio) return audio;
    const el = deps.createAudio ? deps.createAudio() : new Audio();
    el.preload = "none";
    el.addEventListener("playing", () => {
      failures = 0;
      blocked = false;
    });
    el.addEventListener("error", () => scheduleReconnect("error"));
    el.addEventListener("ended", () => scheduleReconnect("ended"));
    el.addEventListener("timeupdate", () => {
      const end = el.buffered.length ? el.buffered.end(el.buffered.length - 1) : 0;
      if (end - el.currentTime > MAX_LAG_S) scheduleReconnect("lag", 0);
    });
    audio = el;
    return el;
  }

  function stop() {
    generation++;
    if (retry !== null) clearTimer(retry);
    retry = null;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  function play(el: HTMLAudioElement): Promise<void> {
    return el.play().then(
      () => {
        blocked = false;
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === "NotAllowedError") blocked = true;
        else if (!(error instanceof DOMException && error.name === "AbortError")) scheduleReconnect("play");
      },
    );
  }

  async function connect(): Promise<void> {
    if (!wanted()) return stop();
    const gen = ++generation;
    const target = roomId!;
    let url: string | null = null;
    try {
      url = await deps.streamUrl(target);
    } catch {
      url = null;
    }
    if (gen !== generation || !wanted()) return;
    if (!url) return scheduleReconnect("url");
    const el = element();
    el.src = url;
    log({ op: "connect", roomId: target });
    await play(el);
  }

  function scheduleReconnect(reason: string, delayOverride?: number) {
    if (!wanted() || retry !== null) return;
    failures++;
    if (failures >= ERROR_TOAST_AFTER && !toasted) {
      toasted = true;
      deps.onLoadError?.();
    }
    const delay = delayOverride ?? Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.max(0, failures - 1));
    log({ op: "reconnect", reason, delayMs: delay, failures });
    retry = setTimer(() => {
      retry = null;
      void connect();
    }, delay);
  }

  return {
    async unlock() {
      unlocked = true;
      const el = element();
      // Đang có luồng (bị chặn trước đó) → play() ngay trong cử chỉ; chưa có → nối mới.
      if (el.getAttribute("src") && wanted()) await play(el);
      else await connect();
    },
    isUnlocked: () => unlocked,
    isBlocked: () => blocked,
    attach(next) {
      if (next === roomId) return;
      roomId = next;
      failures = 0;
      toasted = false;
      void connect();
    },
    setMuted(next) {
      if (next === muted) return;
      muted = next;
      void connect();
    },
    dispose() {
      roomId = null;
      stop();
      audio = null;
    },
  };
}
