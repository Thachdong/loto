import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES, isErrorCode } from "./errors";

/** Trích bảng mã lỗi từ specs/api-contract.yml (bỏ các mã đã gạch `~~X~~`). */
function readContractTable(): Record<string, number> {
  const yml = readFileSync(resolve(process.cwd(), "../../specs/api-contract.yml"), "utf8");
  const table: Record<string, number> = {};
  for (const match of yml.matchAll(/^\s*\|\s*([A-Z_]+)\s*\|\s*(\d{3})\s*\|/gm)) {
    table[match[1]] = Number(match[2]);
  }
  return table;
}

describe("ERROR_CODES", () => {
  const contract = readContractTable();

  it("AC-8: has exactly the 41 codes of the api-contract with matching HTTP status", () => {
    expect(Object.keys(contract)).toHaveLength(41);
    const ours = Object.fromEntries(
      Object.entries(ERROR_CODES).map(([code, info]) => [code, info.http]),
    );
    expect(ours).toEqual(contract);
  });

  it("every code has a non-empty Vietnamese message", () => {
    for (const info of Object.values(ERROR_CODES)) {
      expect(info.message.trim().length).toBeGreaterThan(0);
    }
    expect(ERROR_CODES.ROOM_FULL.message).toBe("Phòng đã đầy");
    expect(ERROR_CODES.INTERNAL_ERROR.message).toBe("Có lỗi xảy ra, vui lòng thử lại");
  });

  it("isErrorCode narrows only known codes", () => {
    expect(isErrorCode("ROOM_FULL")).toBe(true);
    expect(isErrorCode("HOST_CANNOT_LEAVE")).toBe(false);
    expect(isErrorCode("toString")).toBe(false);
  });
});
