import { describe, expect, it } from "vitest";
import { postLoginPath } from "./post-login-path";

const JOIN = "/join/AAAAAAAAAAAAAAAAAAAAAA";

describe("postLoginPath", () => {
  it("AC-8: valid returnTo wins over current room", () => {
    expect(postLoginPath({ returnTo: JOIN, currentRoomId: "r_seed" })).toBe(JOIN);
    expect(postLoginPath({ returnTo: JOIN, currentRoomId: null })).toBe(JOIN);
  });

  it("AC-7: in a room → /room", () => {
    expect(postLoginPath({ returnTo: null, currentRoomId: "r_seed" })).toBe("/room");
  });

  it("no returnTo, no room → /", () => {
    expect(postLoginPath({ returnTo: null, currentRoomId: null })).toBe("/");
  });

  it("AC-9: invalid returnTo is ignored", () => {
    expect(postLoginPath({ returnTo: "https://evil.com", currentRoomId: null })).toBe("/");
    expect(postLoginPath({ returnTo: "//evil.com", currentRoomId: "r_seed" })).toBe("/room");
  });
});
