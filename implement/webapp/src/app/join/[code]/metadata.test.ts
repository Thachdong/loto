import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/core/server/action";
import type { InvitePreview } from "@/features/invite/shared/types";

const mocks = vi.hoisted(() => ({ getInvite: vi.fn() }));
vi.mock("@/features/invite/server/queries/get-invite.query", () => ({ getInvite: mocks.getInvite }));
vi.mock("@/features/invite/client", () => ({ JoinError: () => null, JoinScreen: () => null, JoinSkeleton: () => null }));
vi.mock("@/core/server/session", () => ({ getSessionUid: vi.fn() }));
vi.mock("@/core/server/clock", () => ({ now: () => new Date() }));

import { generateMetadata } from "./page";

const CODE = "A".repeat(22);
const call = () => generateMetadata({ params: Promise.resolve({ code: CODE }) } as never);

const preview = (over: Partial<InvitePreview> = {}): InvitePreview => ({
  status: "valid",
  room: {
    name: "Lô tô Tết",
    hostName: "An Nguyễn",
    hostPhotoUrl: "https://example.com/a.jpg",
    memberCount: 3,
    maxMembers: 16,
    expiresAt: "2026-11-21T13:00:00.000Z",
  },
  viewer: null,
  ...over,
});

describe("generateMetadata /join/[code]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://loto.example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("AC-16: valid invite → og:title with host, og:description = room name, absolute og:image, website, vi_VN, summary_large_image", async () => {
    mocks.getInvite.mockResolvedValue(preview());
    const meta = await call();
    expect(mocks.getInvite).toHaveBeenCalledWith(CODE); // không cookie / viewer
    expect(String(meta.metadataBase)).toBe("https://loto.example.com/");
    expect(meta.title).toBe("An Nguyễn mời bạn chơi lô tô");
    expect(meta.description).toBe("Lô tô Tết");
    expect(meta.openGraph).toMatchObject({
      type: "website",
      locale: "vi_VN",
      title: "An Nguyễn mời bạn chơi lô tô",
      description: "Lô tô Tết",
      url: `/join/${CODE}`,
      images: [{ url: "/og/invite.png", width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", images: ["/og/invite.png"] });
  });

  it("AC-16: only needed fields — no host uid / email / photo leak", async () => {
    mocks.getInvite.mockResolvedValue(preview());
    const json = JSON.stringify(await call());
    expect(json).not.toContain("example.com/a.jpg");
    expect(json).not.toMatch(/email|host_uid|hostUid/i);
  });

  it.each(["expired", "closed", "full"] as const)("AC-9: status %s → generic title, no room name", async (status) => {
    mocks.getInvite.mockResolvedValue(preview({ status }));
    const meta = await call();
    expect(meta.title).toBe("Lô Tô Online");
    expect(meta.openGraph).toBeUndefined();
    expect(JSON.stringify(meta)).not.toContain("Lô tô Tết");
  });

  it("AC-9: INVITE_INVALID → generic title", async () => {
    mocks.getInvite.mockRejectedValue(new AppError("INVITE_INVALID"));
    expect((await call()).title).toBe("Lô Tô Online");
  });

  it("other read error → generic title too", async () => {
    mocks.getInvite.mockRejectedValue(new Error("boom"));
    expect((await call()).title).toBe("Lô Tô Online");
  });
});
