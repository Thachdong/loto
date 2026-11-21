/**
 * Seed dữ liệu cho Firebase Emulator: `npm run seed -- <scenario>`.
 * Task sau thêm scenario vào `scenarios/tXXX.ts` và đăng ký trong `SCENARIOS`.
 */
import { emulatorGuardError } from "./lib/env";
import { reset } from "./scenarios/reset";
import { smoke } from "./scenarios/smoke";
import { t002 } from "./scenarios/t002";
import { t003 } from "./scenarios/t003";

const SCENARIOS: Record<string, () => Promise<void>> = {
  reset,
  smoke,
  t002,
  t003,
};

async function main(): Promise<number> {
  const guard = emulatorGuardError();
  if (guard) {
    console.error(guard);
    return 1;
  }

  const name = process.argv[2];
  const scenario = name ? SCENARIOS[name] : undefined;
  if (!scenario) {
    console.error(`Scenario không hợp lệ: "${name ?? ""}". Có: ${Object.keys(SCENARIOS).join(", ")}`);
    return 1;
  }

  await scenario();
  console.log(`Seed "${name}" xong.`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
