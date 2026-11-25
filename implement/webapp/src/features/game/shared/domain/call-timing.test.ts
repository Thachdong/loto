import { describe, expect, it } from "vitest";
import { MAX_REVEAL_DRIFT_MS, nextRevealAt } from "./call-timing";

const t = (ms: number) => new Date(1_000_000 + ms);

describe("nextRevealAt", () => {
  it("neo vào giờ hẹn trước khi gọi trễ ít (không cộng dồn trễ)", () => {
    expect(nextRevealAt(t(0), t(400), 20_000).getTime()).toBe(t(20_000).getTime());
  });
  it("gọi sớm trong dung sai → vẫn từ giờ hẹn", () => {
    expect(nextRevealAt(t(0), t(-200), 5_000).getTime()).toBe(t(5_000).getTime());
  });
  it("trễ quá ngưỡng hoặc chưa có giờ hẹn → từ lúc gọi", () => {
    expect(nextRevealAt(t(0), t(MAX_REVEAL_DRIFT_MS + 1), 5_000).getTime()).toBe(t(MAX_REVEAL_DRIFT_MS + 1 + 5_000).getTime());
    expect(nextRevealAt(null, t(7), 5_000).getTime()).toBe(t(5_007).getTime());
  });
});
