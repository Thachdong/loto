import "server-only";

type ErrorLog = {
  action: string;
  code: string;
  message: string;
  stack?: string;
};

/** Ghi 1 dòng JSON ra stderr — Cloud Logging đọc `severity` (NFR-17). */
export function logError(entry: ErrorLog): void {
  console.error(JSON.stringify({ severity: "ERROR", ...entry }));
}
