import { describe, expect, it } from "vitest";
import { mapPresence } from "./use-room-presence";

describe("mapPresence", () => {
  it("maps RTDB nodes, drops nodes without display_name", () => {
    expect(
      mapPresence({
        u_a: { online: true, display_name: "An", photo_url: "https://x/a.png", at: 5 },
        u_c: { online: false, display_name: "Chi" },
        u_x: { online: true },
      }),
    ).toEqual([
      { uid: "u_a", online: true, displayName: "An", photoUrl: "https://x/a.png", at: 5 },
      { uid: "u_c", online: false, displayName: "Chi", photoUrl: null, at: null },
    ]);
    expect(mapPresence(null)).toEqual([]);
  });
});
