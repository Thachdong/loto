---
name: server-worker
description: Worker lớp server cho webapp Lô Tô Online — Zod schema, domain thuần, service nghiệp vụ (kiểm BR, Firestore transaction, lazy expiry), Server Action <operationId>Action trả ActionResult theo api-contract, query cho RSC, session; kèm unit test và test action trên emulator. Có chế độ "contract" (S1) chỉ tạo schema/type/stub action/i18n key để lane client chạy song song. Dùng khi orchestrator giao step server/contract, hoặc dev gọi /server-worker T-XXX [Sx].
argument-hint: T-XXX [Sx] [--contract]
---

# server-worker

Đầu vào: `T-XXX`, step trong plan đã duyệt. Step có worker ghi "(contract)" hoặc args `--contract` → **chế độ contract**.

Đọc trước: `architecture.md`, `conventions.md` (`.claude/skills/implement-task/references/`); `specs/api-contract.yml` operation của step; BR/FLOW liên quan; docs Next.js 16 về Server Actions (`implement/webapp/node_modules/next/dist/docs/01-app/`, grep "use server", "Server Actions", `cookies`, `redirect`, `revalidatePath`).

## Chế độ contract (S1)
Chỉ tạo, không viết nghiệp vụ:
- `features/<f>/shared/schemas/*.ts`: Zod input/output khớp api-contract (`.strict()`), export cả type `z.infer`.
- `features/<f>/shared/types.ts`, `constants.ts` (model camelCase theo mục 3.2 plan).
- Stub action `features/<f>/server/actions/<op>.action.ts`: `defineAction({ input, auth, handler: async () => { throw new AppError('INTERNAL_ERROR') } })` + comment `// TODO(S<n>): implement`. Chữ ký phải đúng như bản cuối để client import được.
- Thêm key chữ mới vào `src/core/shared/i18n/vi.ts` (mọi chữ của task, kể cả của UI — tránh hai lane cùng sửa file này).
- Gate: `npm run typecheck && npm run lint`.

## Chế độ đầy đủ
Phạm vi sửa: `src/features/*/shared/**` (schema, domain), `src/features/*/server/**`, `src/core/server/**`, `src/core/shared/**` (trừ i18n đã chốt ở S1 — thêm key thiếu thì được), `tests/emulator/<feature>/**` (action), `*.test.ts` cạnh file.

1. **Domain thuần** (`shared/domain`): logic tính toán/kiểm tra (sinh vé, kiểm Kinh, parseReturnTo…). Không I/O, không `Date.now()`/`Math.random()` trực tiếp — nhận `now`, `rng` làm tham số. Unit test đầy đủ bất biến (VD BR-08 trên 10.000 bộ).
2. **Service** (`server/services/<x>.service.ts`, `import 'server-only'`):
   - Một hàm / use case; nhận `uid` + input đã validate; trả model đúng output schema.
   - Kiểm BR theo thứ tự specs, ném `AppError('<CODE>')` đúng mã api-contract.
   - Ghi nhiều doc / quy tắc chéo → `firestore().runTransaction` qua repository (truyền `tx`).
   - Lazy expiry phòng (BR-04) trước mọi thao tác trên phòng.
   - Giờ: `now()` từ `core/server/clock.ts`; ngẫu nhiên công bằng: `crypto.randomInt`.
   - Cần dữ liệu feature khác → gọi repository/service public của feature đó, không copy.
   - Thiếu hàm repository → báo lại (lane backend: db-worker làm trước); nếu chạy inline cùng lane thì được thêm vào `db/` theo đúng quy tắc db-worker.
3. **Action** (`server/actions/<op>.action.ts`): thay stub — chỉ gọi service. Không logic trong action. `auth` đúng api-contract.
4. **Query RSC** (`server/queries/`): đọc dữ liệu cho page, kiểm quyền, trả model.
5. **Test**:
   - Unit cho domain.
   - Emulator cho mỗi action: happy path + **mỗi mã lỗi** trong api-contract của operation + quyền (không phiên → `UNAUTHENTICATED`) + kiểm dữ liệu DB sau khi chạy. Dùng `clock` giả để test theo thời gian.
   - Mỗi AC có cách kiểm `unit`/`emulator` trong plan phải có test tương ứng, tên test ghi `AC-n`.

## Gate
```
cd implement/webapp && npm run typecheck && npm run lint && npm run test:unit
npm test -- tests/emulator/<feature>
```

## Báo cáo
File tạo/sửa · action + mã lỗi đã phủ test · AC đã phủ · kết quả gate · lệch specs / giả định mới · vấn đề mở. Không commit.
