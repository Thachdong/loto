import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, defineAction } from "./action";

afterEach(() => {
  vi.restoreAllMocks();
});

const numberInput = z.strictObject({ n: z.number() });

describe("defineAction", () => {
  it("returns data on success", async () => {
    const action = defineAction({
      input: numberInput,
      auth: "none",
      handler: async ({ input }) => input.n * 2,
    });
    expect(await action({ n: 2 })).toEqual({ ok: true, data: 4 });
  });

  it("AC-5: invalid input → VALIDATION_FAILED with field details", async () => {
    const handler = vi.fn();
    const action = defineAction({ input: numberInput, auth: "none", handler });

    const result = await action({ n: "x" });

    expect(handler).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Dữ liệu gửi lên không hợp lệ",
        details: [{ field: "n", code: "invalid_type" }],
      },
    });
  });

  it("rejects unknown keys (strictObject)", async () => {
    const action = defineAction({ input: numberInput, auth: "none", handler: async () => 1 });
    const result = await action({ n: 1, extra: true });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });

  it("AC-6: AppError → same code with Vietnamese message", async () => {
    const action = defineAction({
      input: numberInput,
      auth: "none",
      handler: async () => {
        throw new AppError("ROOM_FULL");
      },
    });
    expect(await action({ n: 1 })).toEqual({
      ok: false,
      error: { code: "ROOM_FULL", message: "Phòng đã đầy" },
    });
  });

  it("keeps AppError details", async () => {
    const details = [{ code: "current_room", currentRoomId: "r_1" }];
    const action = defineAction({
      input: numberInput,
      auth: "none",
      handler: async () => {
        throw new AppError("ALREADY_IN_ROOM", details);
      },
    });
    expect(await action({ n: 1 })).toMatchObject({
      ok: false,
      error: { code: "ALREADY_IN_ROOM", details },
    });
  });

  it("AC-7: unexpected error → INTERNAL_ERROR, no leak, one JSON log line", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const action = defineAction({
      name: "boomAction",
      input: numberInput,
      auth: "none",
      handler: async () => {
        throw new Error("boom");
      },
    });

    const result = await action({ n: 1 });

    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Có lỗi xảy ra, vui lòng thử lại" },
    });
    expect(JSON.stringify(result)).not.toMatch(/boom|at /);
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged).toMatchObject({
      severity: "ERROR",
      action: "boomAction",
      code: "INTERNAL_ERROR",
      message: "boom",
    });
    expect(logged.stack).toContain("boom");
  });

  it("auth required without session → UNAUTHENTICATED", async () => {
    const handler = vi.fn();
    const action = defineAction({ input: numberInput, auth: "required", handler });
    expect(await action({ n: 1 })).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED" },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
