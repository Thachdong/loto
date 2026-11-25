import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMp3, totalDurationMs } from "./mp3";

const v1 = path.join(__dirname, "..", "public", "audio", "v1");

describe("parseMp3", () => {
  it("tách frame + tính thời lượng file thật", () => {
    const frames = parseMp3(readFileSync(path.join(v1, "01.mp3")));
    expect(frames.length).toBeGreaterThan(10);
    expect(frames[0]!.sampleRate).toBe(48000);
    // 1152 mẫu / 48 kHz = 24 ms mỗi frame
    expect(frames[0]!.durationMs).toBeCloseTo(24, 5);
    expect(totalDurationMs(frames)).toBeGreaterThan(1000);
  });

  it("bỏ thẻ ID3 + frame Xing/Info", () => {
    const frames = parseMp3(readFileSync(path.join(v1, "silence.mp3")));
    // 1 giây im lặng ≈ 42 frame (+ đệm encoder), không có frame metadata
    expect(frames.length).toBeGreaterThanOrEqual(40);
    expect(frames.every((f) => f.data[0] === 0xff)).toBe(true);
    expect(frames.some((f) => f.data.includes(Buffer.from("Info")))).toBe(false);
  });

  it("dữ liệu rác → không frame", () => {
    expect(parseMp3(Buffer.from("not an mp3 file at all"))).toEqual([]);
  });
});
