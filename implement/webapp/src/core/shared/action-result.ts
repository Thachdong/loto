import type { ErrorCode } from "./errors";

/** Chi tiết lỗi — khớp `ErrorDetail` trong api-contract (additionalProperties: true). */
export type ErrorDetail = {
  field?: string;
  code: string;
  message?: string;
  [key: string]: unknown;
};

/** Khớp `Error` trong api-contract. */
export type ActionError = {
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
};

/** Kết quả mọi Server Action — không throw ra client. */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };
