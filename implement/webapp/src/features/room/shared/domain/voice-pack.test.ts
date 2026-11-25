import { describe, expect, it } from "vitest";
import { DEFAULT_VOICE_PACK, isVoicePack, voicePackOf } from "./voice-pack";

describe("voice-pack", () => {
  it("nhận id có trong danh sách", () => {
    expect(isVoicePack("v1")).toBe(true);
    expect(isVoicePack("v9")).toBe(false);
    expect(isVoicePack(1)).toBe(false);
  });
  it("giá trị lạ → bộ mặc định", () => {
    expect(voicePackOf(undefined)).toBe(DEFAULT_VOICE_PACK);
    expect(voicePackOf("x")).toBe(DEFAULT_VOICE_PACK);
    expect(voicePackOf("v1")).toBe("v1");
  });
});
