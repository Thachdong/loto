---
task: T-001
title: Dựng nền dự án chạy được trên local + emulator
status: done
approved_at: 2026-11-20
branch: feature/dongt/sign-in
plan_commit: 943a2b4
---

# Plan T-001 · Dựng nền dự án chạy được trên local + emulator

## 1. Tóm tắt
Sau task: `npm run emulators` + `npm run dev` → `localhost:3000` hiện trang chào "Lô Tô Online" (chữ từ `vi.ts`) trong khung mobile-first ≤ 480px; Emulator UI `localhost:4000` đủ Auth, Firestore, RTDB, Storage, Functions. Có khung chung cho mọi task sau: `defineAction`/`ActionResult`/`AppError` + 41 mã lỗi, firebase-admin & client SDK tự nối emulator, `clock`, `formatTimeVN`, rules baseline cấm hết (có test deny), seed `smoke`/`reset`, Vitest 2 project, ESLint cưỡng chế ranh giới lớp. `npm test`, `npm run lint`, `npm run typecheck` pass.

Không có feature nghiệp vụ nào → mọi thứ nằm trong `src/core/`, config gốc, `scripts/`, `tests/emulator/core/`.

## 2. Nguồn đã đọc
- Task: `backlog/tasks/T-001-project-foundation.md`
- Specs: api-contract › `info.description` Bảng mã lỗi (41 mã còn hiệu lực, 3 mã gạch bỏ), `components.schemas.Error`/`ErrorDetail`, `components.responses.*` (message mẫu tiếng Việt); tech-stack §2 (phiên bản), ADR-02, ADR-03, ADR-13; traceability NFR-12, NFR-16; database-design §quy ước (UTC lưu, GMT+7 hiển thị).
- Next.js docs: `01-app/03-api-reference/01-directives/use-server.md`, `01-app/03-api-reference/02-components/font.md` (subsets), `01-app/03-api-reference/04-functions/generate-viewport.md` (viewport mặc định đã đủ `width=device-width, initial-scale=1`).
- Code hiện có: khung thư mục `implement/webapp/` (đã dọn ở commit trước) — khớp `architecture.md` §1, chỉ cần thêm file, xóa `.gitkeep` ở thư mục đã có file.

## 3. Thiết kế
### 3.1 File theo lớp
Gốc: `implement/webapp/`.

| Lớp | File | Tạo/Sửa | Nội dung |
|---|---|---|---|
| config | `package.json` | Sửa | scripts `dev, build, start, emulators, test, test:unit, lint, typecheck, seed` |
| config | `vitest.config.mts` | Tạo | 2 project: `unit` (node, `src/**/*.test.{ts,tsx}`; file `.tsx` dùng docblock `@vitest-environment jsdom`), `emulator` (node, `tests/emulator/**/*.test.ts`, chạy tuần tự). Alias `server-only`/`client-only` → module rỗng trong test |
| config | `vitest.setup.ts` | Tạo | `@testing-library/jest-dom/vitest` |
| config | `eslint.config.mjs` | Sửa | thêm `eslint-plugin-boundaries`: element `app, feature-shared, feature-server-action, feature-server, feature-db, feature-client, core-shared, core-server, core-db, core-client` theo bảng import architecture §3; chặn `firebase-admin` ngoài `server/`, `db/`, `scripts/`, `tests/` |
| config | `components.json` | Tạo | shadcn: aliases `ui → @/core/client/ui`, `utils → @/core/shared/utils` |
| config | `.env.example` | Tạo | biến client `NEXT_PUBLIC_*` + server `*_EMULATOR_HOST`, `GCLOUD_PROJECT` (theo yêu cầu dev: dùng `.env.example`, không phải `.env.local.example`) |
| config | `.gitignore` | Sửa | `!.env.local.example` → `!.env.example` |
| data | `firebase.json` | Tạo | emulators auth 9099, firestore 8080, database 9000, storage 9199, functions 5001, UI 4000, `singleProjectMode`; trỏ rules/indexes; `functions.source = functions` |
| data | `.firebaserc` | Tạo | `default: demo-loto` |
| data | `firestore.rules` · `database.rules.json` · `storage.rules` | Tạo | cấm mọi đọc/ghi |
| data | `firestore.indexes.json` | Tạo | `{ indexes: [], fieldOverrides: [] }` |
| functions | `functions/tsconfig.json` · `functions/src/index.ts` | Tạo | TS Node 22, `index.ts` chưa export gì; xóa `.gitkeep` |
| core/shared | `src/core/shared/errors.ts` | Tạo | `ERROR_CODES` 41 mã `{ http, message }`, kiểu `ErrorCode` |
| core/shared | `src/core/shared/action-result.ts` | Tạo | `ActionResult<T>`, `ActionError`, `ErrorDetail` |
| core/shared | `src/core/shared/i18n/vi.ts` | Tạo | từ điển + `t(key, params)` (thay `{name}`); xóa `.gitkeep` |
| core/shared | `src/core/shared/time.ts` | Tạo | `formatTimeVN(date, 'HH:mm' \| 'dd/MM HH:mm')` |
| core/shared | `src/core/shared/utils.ts` | Tạo | `cn()` (clsx + tailwind-merge) cho shadcn |
| core/server | `src/core/server/action.ts` | Tạo | `AppError`, `defineAction({ input, auth, handler })` |
| core/server | `src/core/server/session.ts` | Tạo | `getSessionUid(): Promise<string \| null>` — T-001 trả `null` (điểm móc T-002) |
| core/server | `src/core/server/log.ts` | Tạo | `logError({ action, code, message, stack })` → 1 dòng JSON `severity: 'ERROR'` qua `console.error` |
| core/server | `src/core/server/clock.ts` | Tạo | `now()`, `setClock(fn)`/`resetClock()` cho test |
| core/server | `src/core/server/firebase-admin.ts` | Tạo | `getAdminApp()` khởi tạo 1 lần; projectId từ `GCLOUD_PROJECT` (mặc định `demo-loto`), `databaseURL`, `storageBucket`; SDK tự nối emulator qua `*_EMULATOR_HOST`; `getAdminAuth()`, `getAdminStorage()` |
| core/db | `src/core/db/firestore.ts` | Tạo | `firestore()`, `rtdb()` getter (server-only) |
| core/client | `src/core/client/firebase.ts` | Tạo | `client-only`; init JS SDK modular 1 lần; `NEXT_PUBLIC_USE_EMULATOR=true` → `connect*Emulator`; export `getClientAuth/Firestore/Database/Storage` |
| core/client | `src/core/client/ui/{button,dialog,sheet,input,sonner}.tsx` | Tạo | shadcn sinh ra; xóa `.gitkeep` |
| core/client | `src/core/client/app-shell.tsx` | Tạo | Server Component: nền ngoài, cột `max-w-[480px] mx-auto px-4 min-h-dvh` |
| app | `src/app/layout.tsx` | Sửa | font `Be_Vietnam_Pro` subsets `['vietnamese','latin']`; `lang="vi"`; `AppShell`; `<Toaster />`; metadata lấy chữ từ `vi.ts` |
| app | `src/app/page.tsx` | Sửa | logo chữ + câu giới thiệu từ `t()` |
| app | `src/app/globals.css` | Sửa | token shadcn (Tailwind 4 `@theme inline`), màu nền ngoài cột |
| test | `src/core/shared/errors.test.ts` | Tạo | AC-8: so với bảng trích từ api-contract (41 mã + HTTP) |
| test | `src/core/shared/time.test.ts` | Tạo | AC-9 |
| test | `src/core/shared/i18n/vi.test.ts` | Tạo | `t()` thay tham số, key thiếu |
| test | `src/core/server/action.test.ts` | Tạo | AC-5, AC-6, AC-7 (action thử định nghĩa trong file test) + `auth:'required'` khi chưa có phiên → `UNAUTHENTICATED` |
| test | `src/app/page.test.tsx` | Tạo | jsdom: trang `/` hiện đúng chữ `vi.ts` (AC-9 phần 2, kiểm setup Testing Library) |
| test | `tests/emulator/helpers.ts` | Tạo | `initTestEnv()` (`@firebase/rules-unit-testing`, đọc rules thật), `clearAll()` |
| test | `tests/emulator/core/rules-baseline.test.ts` | Tạo | AC-4: Firestore read/write deny (auth + unauth), RTDB write deny, Storage upload deny |
| test | `tests/emulator/core/seed.test.ts` | Tạo | AC-10 (thiếu env → exit ≠ 0, thông báo), AC-11 (`smoke` có doc, `reset` trống) — chạy `tsx scripts/seed/index.ts` bằng `child_process` |
| seed | `scripts/seed/index.ts` | Tạo | kiểm env → chọn scenario từ registry → chạy; xóa `.gitkeep` |
| seed | `scripts/seed/lib/admin.ts` · `lib/seed-user.ts` | Tạo | admin app cho script; `seedUser({ uid, email, name, photoUrl })` qua `importUsers` provider `google.com` |
| seed | `scripts/seed/scenarios/reset.ts` · `smoke.ts` | Tạo | `reset`: REST emulator xóa Firestore + Auth, RTDB `ref('/').remove()`, xóa file Storage; `smoke`: `_smoke/hello` |
| docs | `docs/chrome-testing.md` | Tạo | quy trình AI chạy Chrome (khởi động, seed, viewport 375×812, nhiều profile, Emulator UI, ghi kết quả); xóa `.gitkeep` |
| docs | `README.md` | Sửa | Node 22, Java 17+, `npm install` + `npm --prefix functions install`, copy `.env.example` → `.env.local`, các lệnh |

Thư mục khung giữ nguyên (đã đúng architecture §1). `src/features/`, `src/core/client/hooks/`, `src/core/client/providers/`, `public/audio/`, `public/avatars/` vẫn giữ `.gitkeep`.

### 3.2 Contract (API dùng chung cho task sau)
```ts
// core/shared/action-result.ts
export type ErrorDetail = { field?: string; code: string; message?: string; [k: string]: unknown };
export type ActionError = { code: ErrorCode; message: string; details?: ErrorDetail[] };
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

// core/shared/errors.ts
export const ERROR_CODES: Record<ErrorCode, { http: number; message: string }>;
export type ErrorCode = 'VALIDATION_FAILED' | 'UNAUTHENTICATED' | ... | 'INTERNAL_ERROR'; // 41

// core/server/action.ts
export class AppError extends Error { constructor(code: ErrorCode, details?: ErrorDetail[]) }
export function defineAction<S extends z.ZodType, T>(opts: {
  name?: string;                         // cho log; mặc định 'anonymous'
  input: S;
  auth: 'none' | 'required';
  handler: (ctx: { input: z.output<S>; uid: A extends 'required' ? string : string | null }) => Promise<T>;
}): (raw: unknown) => Promise<ActionResult<T>>;
// VALIDATION_FAILED details: { field: issue.path.join('.'), code: issue.code, message: issue.message }

// core/shared/i18n/vi.ts
export const vi = { app: { name: 'Lô Tô Online', tagline: '…' }, error: {...}? } ;
export function t(key: DotPath<typeof vi>, params?: Record<string, string | number>): string;

// core/shared/time.ts
export function formatTimeVN(date: Date | number, pattern: 'HH:mm' | 'dd/MM HH:mm'): string;

// core/server/clock.ts
export function now(): Date; export function setClock(fn: () => Date): void; export function resetClock(): void;
```
`data-testid` trang `/`: `app-title`, `app-tagline`, `app-shell`.

Biến môi trường (`.env.example`, dev bổ sung giá trị thật sau):
```
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-loto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-loto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-loto.appspot.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=http://127.0.0.1:9000/?ns=demo-loto
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app-id
NEXT_PUBLIC_USE_EMULATOR=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
GCLOUD_PROJECT=demo-loto
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

### 3.3 Luồng chính
- Server Action (task sau): `'use server'` file export `xAction = defineAction(...)` → `defineAction` parse Zod → (auth) `getSessionUid()` → `handler` gọi service → `{ ok:true, data }`. `AppError` → `{ ok:false, error: { code, message: ERROR_CODES[code].message, details } }`. Lỗi khác → `logError` + `INTERNAL_ERROR`.
- Seed: `npm run seed -- smoke` → `scripts/seed/index.ts` kiểm `FIRESTORE_EMULATOR_HOST` & `FIREBASE_AUTH_EMULATOR_HOST` (thiếu → "Chỉ chạy seed trên emulator", exit 1) → scenario. Script `seed` dùng `tsx --env-file-if-exists=.env.local` để đọc host từ `.env.local`.
- `npm test`: `firebase emulators:exec --only auth,firestore,database,storage "vitest run"` (cả 2 project).

## 4. Các bước thực hiện
Task hạ tầng, **1 lane, tuần tự, inline**.

| Step | Worker | Lane | Phụ thuộc | Phạm vi file | Commit dự kiến |
|---|---|---|---|---|---|
| S1 | server-worker | main | — | `src/core/shared/{errors,action-result,time}.ts`, `i18n/vi.ts`, test tương ứng, `vitest.config.mts`, `vitest.setup.ts`, scripts `test:unit`/`typecheck` | `feat(core): add error codes, action result, i18n and time helpers` |
| S2 | server-worker | main | S1 | `src/core/server/*`, `src/core/db/firestore.ts`, `action.test.ts` | `feat(core): add defineAction wrapper, clock, logging and firebase-admin init` |
| S3 | db-worker | main | S2 | `firebase.json`, `.firebaserc`, rules ×3, indexes, `functions/**`, `.env.example`, `.gitignore`, `tests/emulator/helpers.ts`, `tests/emulator/core/rules-baseline.test.ts`, scripts `emulators`/`test` | `feat(core): add firebase emulator config and deny-all rules baseline` |
| S4 | db-worker | main | S3 | `scripts/seed/**`, `tests/emulator/core/seed.test.ts`, script `seed` | `feat(core): add emulator seed runner with smoke and reset scenarios` |
| S5 | ui-worker | main | S1 | `components.json`, `src/core/shared/utils.ts`, `src/core/client/ui/*`, `src/core/client/firebase.ts`, `app-shell.tsx`, `src/app/*`, `page.test.tsx` | `feat(core): add shadcn ui, app shell and welcome page` (có thể tách 2: `chore(ui): add shadcn base components`) |
| S6 | main | main | S1–S5 | `eslint.config.mjs` (boundaries) | `chore(lint): enforce layer boundaries with eslint-plugin-boundaries` |
| S7 | main | main | S6 | `docs/chrome-testing.md`, `README.md` | `docs: add Chrome testing guide and setup instructions` |

Gate sau mỗi step: `npm run typecheck && npm run lint && npm run test:unit`; S3, S4 thêm `npm test`.

## 5. Ánh xạ AC → kiểm chứng
| AC | Cách kiểm | File test / TC |
|---|---|---|
| AC-1 | chrome | TC (qc-testcase-writer) |
| AC-2 | chrome | TC — Emulator UI 5 emulator |
| AC-3 | chrome | TC — viewport 360/375/1280 |
| AC-4 | emulator | `tests/emulator/core/rules-baseline.test.ts` |
| AC-5 | unit | `src/core/server/action.test.ts` |
| AC-6 | unit | `src/core/server/action.test.ts` |
| AC-7 | unit | `src/core/server/action.test.ts` (spy `console.error`) |
| AC-8 | unit | `src/core/shared/errors.test.ts` |
| AC-9 | unit | `src/core/shared/time.test.ts`, `src/app/page.test.tsx` |
| AC-10 | emulator | `tests/emulator/core/seed.test.ts` |
| AC-11 | emulator + chrome | `tests/emulator/core/seed.test.ts`; TC Emulator UI |
| AC-12 | manual (Bước 5 orchestrator) | `npm test && npm run lint && npm run typecheck` |

## 6. Giả định & câu hỏi mở
- `[ASSUMED]` (task) Project id emulator `demo-loto`.
- `[ASSUMED]` (task) `seedUser` dùng `importUsers` provider `google.com`; nếu màn chọn tài khoản giả lập không liệt kê → "Add new account" đúng email.
- `[ASSUMED]` (task) Testing Library + jsdom cho component test.
- `[ASSUMED]` (task) `emulators` dùng `--import=.emulator-data --export-on-exit`. Thêm: script tạo sẵn thư mục (`mkdir -p .emulator-data`) để lần chạy đầu không lỗi thiếu thư mục import, và build `functions` trước khi start (Functions emulator cần `functions/lib/index.js`).
- `[ASSUMED]` Theo yêu cầu dev: file mẫu là **`.env.example`** (không phải `.env.local.example` như task ghi). Dev copy thành `.env.local`. Giá trị là giá trị demo cho emulator, không có bí mật.
- `[ASSUMED]` Đường dẫn theo architecture §4 (khác chữ trong task): `src/core/shared/errors.ts`, `src/core/server/action.ts`, `src/core/shared/i18n/vi.ts`, `src/core/shared/time.ts`, `src/core/server/firebase-admin.ts`, `src/core/client/firebase.ts`, `src/core/server/clock.ts`, `scripts/seed/index.ts`.
- `[ASSUMED]` Message tiếng Việt cho mã chưa có message mẫu trong api-contract → tự viết từ cột "Ý nghĩa" (VD `ROOM_NOT_EXPIRED`: "Phòng chưa hết hạn"). Mã đã có message mẫu (responses/bảng) dùng nguyên văn.
- `[ASSUMED]` Font `Be Vietnam Pro` (Google Fonts, subset `vietnamese`) — specs không chốt font; Geist hiện tại không có subset tiếng Việt.
- `[ASSUMED]` Action thử cho AC-5..7 chỉ định nghĩa trong file test, không tạo route/action thật.
- `[ASSUMED]` `auth: 'required'` ở T-001: `getSessionUid()` luôn `null` → trả `UNAUTHENTICATED`. T-002 hiện thực.
- `[ASSUMED]` shadcn CLI chạy qua `npx shadcn@<bản cố định>` (không thêm vào dependencies). Nếu component sinh ra cần package ngoài danh sách đã cài → dừng hỏi.
- `[ASSUMED]` Nền ngoài cột ở màn rộng: xám nhạt (`bg-muted`), cột trắng (`bg-background`); chưa có dark mode (specs không yêu cầu).
- Không có ❓.

## 7. Rủi ro
- `server-only` ném lỗi khi import trong Vitest → alias sang module rỗng trong `vitest.config.mts`.
- `emulators:exec` + Vitest project `emulator` cần chạy tuần tự (chung emulator) → `fileParallelism: false` cho project đó.
- Seed test gọi `tsx` qua `child_process` → cần truyền đúng env emulator; chậm hơn (~vài giây).
- `eslint-plugin-boundaries` 7.x cú pháp config có thể khác bản cũ → đọc README trong `node_modules` trước khi viết.
- `cacheComponents: true` trong `next.config.ts`: trang `/` tĩnh, không ảnh hưởng; ghi nhớ cho task sau.

## 8. Kết quả (orchestrator điền khi xong)
- Commits: `943a2b4` (plan) → `30f0a95` build(deps) · `aeefa53` S1 · `11e840a` S2 · `824ee5f` S3 · `643c303` S4 · `4798457` + `e5691ab` S5 · `5c436eb` S6 · `e467650` S7 · `f943c0f`, `7d7238a` QC.
- Lint/typecheck/test/build: pass — `npm test` 28/28 (unit + emulator), `npm run build` OK.
- QC: `backlog/testcases/T-001-project-foundation.md` — P0 5/5, P1 4/4 (TC-02/05 đo viewport bằng iframe vì cửa sổ Chrome maximize).
- Phát sinh ngoài plan:
  - Lockfile tạo lại: bản cũ thiếu native binding rolldown (npm/cli#4828) làm Vitest 5 không chạy; bỏ `vite-tsconfig-paths` (Vite có `resolve.tsconfigPaths`). Audit không đổi (12 prod / 24 total).
  - shadcn CLI tự `npm install` (thêm `cn`, đổi pin thành `^`, làm hỏng lockfile) → đã khôi phục package.json/lockfile, sửa import `cn` sang `@/core/shared/utils`.
  - Skill chrome-tester, commit-worker đổi `.env.local.example` → `.env.example`.
- Còn lại cho dev review: message tiếng Việt tự viết cho các mã lỗi chưa có mẫu (`vi.ts` › `error`); `next.config.ts` bật `cacheComponents: true`; rule boundaries chưa giới hạn "service public" khi service gọi service feature khác.
