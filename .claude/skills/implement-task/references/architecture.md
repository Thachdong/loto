# Kiến trúc source code — Lô Tô Online webapp

Gốc webapp: `implement/webapp/`. Alias `@/` → `implement/webapp/src/`.
Kiểu tổ chức: **feature-based** (chia theo nghiệp vụ) **kết hợp layer-based** (trong mỗi feature chia 4 lớp cố định).

## 1. Cây thư mục

```
implement/webapp/
  firebase.json · firestore.rules · firestore.indexes.json · database.rules.json · storage.rules
  functions/                         # Cloud Functions (chỉ aggregateDailyStats, T-013)
  scripts/seed/                      # index.ts + scenarios/<tXXX>.ts
  tests/emulator/<feature>/          # test rules + action chạy trên Emulator Suite
  public/audio/ · public/avatars/
  src/
    app/                             # CHỈ routing. page/layout/loading/error/route handler, giữ mỏng
    features/<feature>/
      shared/                        # isomorphic: dùng được ở client, server, db
        schemas/                     # Zod schema input/output của action (theo api-contract)
        domain/                      # hàm thuần nghiệp vụ (sinh vé, kiểm Kinh…), không I/O
        types.ts · constants.ts
      server/                        # import 'server-only'
        actions/<operationId>.action.ts   # 'use server' — vỏ mỏng: defineAction → gọi service
        services/<name>.service.ts        # nghiệp vụ: kiểm BR, transaction, lazy expiry
        queries/<name>.query.ts           # đọc dữ liệu cho Server Component (RSC)
      db/                            # import 'server-only' — LỚP DATABASE
        <entity>.repository.ts       # đọc/ghi Firestore/RTDB bằng firebase-admin
        <entity>.mapper.ts           # doc snake_case ↔ model camelCase
        <entity>.doc.ts              # kiểu doc lưu trong DB (khớp specs/database.md)
      client/                        # 'use client' / import 'client-only'
        components/                  # React component (Tailwind + shadcn)
        hooks/                       # useXxx, listener onSnapshot (CHỈ ĐỌC)
        index.ts                     # public API phía client cho feature khác / app
    core/                            # hạ tầng dùng chung, chia 4 lớp giống feature
      shared/   errors.ts (ERROR_CODES), action-result.ts, i18n/vi.ts, time.ts, utils.ts
      server/   firebase-admin.ts, action.ts (defineAction, AppError), session.ts, clock.ts, log.ts
      db/       paths.ts (đường dẫn collection), converter.ts, transaction.ts, ttl.ts (expireAt)
      client/   firebase.ts (JS SDK + emulator), ui/ (shadcn), hooks/ (useDocListener…), providers/
```

## 2. Danh sách feature (gợi ý, tạo khi task đầu tiên cần)
| Feature | Task | Ghi chú |
|---|---|---|
| `auth` | T-002, T-011 (đăng xuất) | session, login screen, in-app browser |
| `room` | T-003, T-012 | tạo/rời/đóng phòng, cài đặt phòng, lazy expiry |
| `invite` | T-004 | `/join/[code]`, Open Graph, mã phòng |
| `ticket` | T-005 | `generateTicketSet` ở `shared/domain` |
| `game` | T-006, T-007 | quay số, Kinh, duyệt, kết quả, audio |
| `chat` | T-008 | rate limit SUP-07 |
| `members` | T-009 | presence RTDB, kick |
| `history` | T-010 | |
| `profile` | T-011 | avatar Storage |
| `ops` | T-013 | functions + TTL + logging |

Không chắc một thứ thuộc feature nào → chọn feature sở hữu **dữ liệu** chính (TBL) của nó.

## 3. Quy tắc import (BẮT BUỘC)

| Từ \ Được import | `shared` (mọi feature + core) | `server/actions` | `server/services`, `server/queries` | `db` | `client` |
|---|---|---|---|---|---|
| `app/` (RSC) | ✅ | ✅ | ✅ chỉ `queries` + `core/server/session` | ❌ | ✅ qua `client/index.ts` |
| `client` | ✅ | ✅ (gọi action) | ❌ | ❌ | ✅ cùng feature; feature khác qua `client/index.ts` |
| `server/actions` | ✅ | ❌ | ✅ cùng feature | ❌ | ❌ |
| `server/services` | ✅ | ❌ | ✅ (feature khác: chỉ service public) | ✅ mọi feature | ❌ |
| `server/queries` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `db` | ✅ | ❌ | ❌ | ✅ `core/db` | ❌ |
| `shared` | ✅ chỉ `shared` | ❌ | ❌ | ❌ | ❌ |

Tóm tắt:
- **Client không bao giờ chạm `services`/`db`/`firebase-admin`.** Ghi = gọi Server Action. Đọc realtime = listener Firestore client SDK (bị Security Rules giới hạn).
- **Action là vỏ mỏng**: validate (Zod, qua `defineAction`) → gọi đúng 1 service → trả `ActionResult`. Không viết logic nghiệp vụ trong action.
- **Service là nơi duy nhất có nghiệp vụ** + transaction. Không gọi `firestore()` trực tiếp; đi qua repository.
- **Repository là nơi duy nhất biết đường dẫn và tên field DB.** Trả về model camelCase qua mapper.
- **Domain thuần** (`shared/domain`) không import Firebase, không `Date.now()` (nhận `now`/`rng` làm tham số).
- Không tạo barrel `index.ts` ở gốc feature (dễ kéo code server vào bundle client).

Cưỡng chế (T-001 phải dựng, task sau giữ):
- `import 'server-only'` ở đầu mọi file trong `server/` (trừ file `'use server'` của action) và `db/`, và `core/server`, `core/db`.
- `import 'client-only'` trong hook/listener client không phải component.
- ESLint `no-restricted-imports` (hoặc `eslint-plugin-boundaries`) theo bảng trên; `npm run lint` fail khi vi phạm.

## 4. Ánh xạ đường dẫn trong backlog → đường dẫn thực tế
Backlog (T-001…T-013) viết theo cấu trúc layer thuần. **Luôn dùng cột phải.**

| Backlog ghi | Dùng |
|---|---|
| `src/server/errors.ts` | `src/core/shared/errors.ts` (ERROR_CODES, message) + `AppError` trong `src/core/server/action.ts` |
| `src/server/action.ts` | `src/core/server/action.ts`; kiểu `ActionResult` ở `src/core/shared/action-result.ts` |
| `src/server/actions/<operationId>.ts` | `src/features/<f>/server/actions/<operationId>.action.ts` |
| `src/server/session.ts` | `src/core/server/session.ts` |
| `src/server/clock.ts` | `src/core/server/clock.ts` |
| `src/server/firebase-admin.ts` | `src/core/server/firebase-admin.ts` (db getter ở `src/core/db/`) |
| `src/lib/firebase/client.ts` | `src/core/client/firebase.ts` |
| `src/i18n/vi.ts` | `src/core/shared/i18n/vi.ts` |
| `src/lib/time.ts` | `src/core/shared/time.ts` |
| `components/ui/*` (shadcn) | `src/core/client/ui/*` (chỉnh `components.json` aliases) |
| `scripts/seed.ts` | `scripts/seed/index.ts` + `scripts/seed/scenarios/<tXXX>.ts` |
| hàm thuần (`generateTicketSet`, `detectInAppBrowser`, `parseReturnTo`…) | `src/features/<f>/shared/domain/<kebab-name>.ts` |
| mapper `toMe` … | `src/features/<f>/db/<entity>.mapper.ts` |

## 5. Đặt tên
- File: `kebab-case`. Component: `PascalCase` export, file `kebab-case.tsx`.
- Action: file `<operationId>.action.ts`, export `<operationId>Action` (VD `createSessionAction`).
- Service: `<name>.service.ts`, export function (không class).
- Test unit: cạnh file, `*.test.ts(x)`. Test emulator: `tests/emulator/<feature>/<name>.test.ts`.
