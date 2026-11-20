import "server-only";

import type { z } from "zod";
import type { ActionResult, ErrorDetail } from "@/core/shared/action-result";
import { ERROR_CODES, type ErrorCode } from "@/core/shared/errors";
import { logError } from "./log";
import { getSessionUid } from "./session";

/** Lỗi nghiệp vụ — `defineAction` chuyển thành `{ ok: false, error }` đúng mã api-contract. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, details?: ErrorDetail[]) {
    super(ERROR_CODES[code].message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

type AuthMode = "none" | "required";

type HandlerContext<S extends z.ZodType, A extends AuthMode> = {
  input: z.output<S>;
  uid: A extends "required" ? string : string | null;
};

type ActionOptions<S extends z.ZodType, A extends AuthMode, T> = {
  /** Tên action cho log, VD `createRoom`. */
  name?: string;
  input: S;
  auth: A;
  handler: (ctx: HandlerContext<S, A>) => Promise<T>;
};

function fail(code: ErrorCode, details?: ErrorDetail[]): ActionResult<never> {
  return {
    ok: false,
    error: { code, message: ERROR_CODES[code].message, ...(details ? { details } : {}) },
  };
}

/**
 * Bọc Server Action: validate Zod → kiểm phiên → handler → `ActionResult`.
 * Không bao giờ throw ra client.
 */
export function defineAction<S extends z.ZodType, A extends AuthMode, T>(
  options: ActionOptions<S, A, T>,
): (raw: unknown) => Promise<ActionResult<T>> {
  const actionName = options.name ?? "anonymous";

  return async (raw: unknown) => {
    try {
      const parsed = options.input.safeParse(raw);
      if (!parsed.success) {
        return fail(
          "VALIDATION_FAILED",
          parsed.error.issues.map((issue) => ({
            field: issue.path.map(String).join("."),
            code: issue.code,
            message: issue.message,
          })),
        );
      }

      const uid = await getSessionUid();
      if (options.auth === "required" && !uid) return fail("UNAUTHENTICATED");

      const data = await options.handler({
        input: parsed.data,
        uid,
      } as HandlerContext<S, A>);
      return { ok: true, data };
    } catch (error) {
      if (error instanceof AppError) return fail(error.code, error.details);

      const err = error instanceof Error ? error : new Error(String(error));
      logError({
        action: actionName,
        code: "INTERNAL_ERROR",
        message: err.message,
        stack: err.stack,
      });
      return fail("INTERNAL_ERROR");
    }
  };
}
