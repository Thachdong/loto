import { describe, expect, it } from "vitest";
import { selectClip, type AudioManifest } from "./select-clip";

const manifest: AudioManifest = {
  numbers: { "5": ["a.mp3", "b.mp3"], "7": ["c.mp3"], "90": [] },
  connectors: ["x.mp3"],
  kinh: ["k.mp3"],
};

describe("selectClip", () => {
  it("picks a number clip by rng", () => {
    expect(selectClip(manifest, "number", 5, () => 0)).toBe("a.mp3");
    expect(selectClip(manifest, "number", 5, () => 0.99)).toBe("b.mp3");
    expect(selectClip(manifest, "number", 7, () => 0.5)).toBe("c.mp3");
  });
  it("missing number / empty list (e.g. 90) → null", () => {
    expect(selectClip(manifest, "number", 33)).toBeNull();
    expect(selectClip(manifest, "number", 90)).toBeNull();
    expect(selectClip(manifest, "number", null)).toBeNull();
  });
  it("other kinds, missing kind → null", () => {
    expect(selectClip(manifest, "connector", null, () => 0)).toBe("x.mp3");
    expect(selectClip(manifest, "kinh")).toBe("k.mp3");
    expect(selectClip(manifest, "miss")).toBeNull();
    expect(selectClip(manifest, "congrats")).toBeNull();
  });
  it("null manifest → null; rng = 1 clamps", () => {
    expect(selectClip(null, "kinh")).toBeNull();
    expect(selectClip(manifest, "number", 5, () => 1)).toBe("b.mp3");
  });
});
