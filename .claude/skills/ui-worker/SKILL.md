---
name: ui-worker
description: Worker lớp client/UI cho webapp Lô Tô Online — route App Router (Server Component mỏng), client component Tailwind 4 + shadcn/ui, hook listener Firestore/RTDB chỉ đọc, gọi Server Action, đủ trạng thái loading/empty/error theo specs/ui-ux, mobile-first 375px, chữ từ vi.ts; kèm component test. Dùng khi orchestrator giao step UI, hoặc dev gọi /ui-worker T-XXX [Sx].
argument-hint: T-XXX [Sx]
---

# ui-worker

Đầu vào: `T-XXX`, step trong plan đã duyệt. Dựa vào **mục 3.2 Contract** của plan — không cần đợi backend xong (action có thể đang là stub).

Đọc trước: `architecture.md`, `conventions.md` (`.claude/skills/implement-task/references/`); `specs/ui-ux/scr-xx-*.md` của màn (bố cục đánh số, trạng thái, §ghi chú), `specs/ui-ux/wireframe.md`; FLOW-xx của màn; docs Next.js 16 cho API dùng (layout/page, `loading`/`error`, `redirect`, `useActionState`/`useFormStatus`, `generateMetadata`…) trong `implement/webapp/node_modules/next/dist/docs/`.

## Phạm vi được sửa
`src/app/**`, `src/features/*/client/**`, `src/core/client/**` (hook chung, provider, shadcn ui). **Không** sửa `shared/schemas`, `server/`, `db/`, `vi.ts` (đã chốt ở S1; thiếu key → thêm được nếu chạy inline, chạy subagent thì báo lại).

## Cách làm
1. **Route** `src/app/.../page.tsx`: Server Component; `requireUser()` / query từ `server/queries`; redirect theo FLOW; truyền dữ liệu ban đầu xuống client component. Không logic nghiệp vụ.
2. **Component** `features/<f>/client/components/*.tsx`:
   - Bố cục đúng thứ tự phần tử đánh số trong scr-xx (ghi số trong comment ngắn khi giúp đối chiếu).
   - shadcn từ `@/core/client/ui`; thêm component shadcn mới bằng CLI với alias đã cấu hình.
   - Mọi chữ qua `t('key')`. Không hard-code chuỗi.
   - Đủ trạng thái: loading (nút khóa + spinner), empty, error (dòng lỗi/toast theo spec), disabled, quyền (host vs player).
   - Mobile-first: 375×812, không tràn ngang 360px, vùng chạm ≥ 44px, `max-w-[480px]`.
   - `data-testid` cho phần tử khó định vị bằng chữ (ô số, lưới vé, badge trạng thái).
3. **Gọi action**: import `<op>Action` từ `features/<f>/server/actions/…`; xử lý `ActionResult` (`ok:false` → hiện `error.message`, map hành vi theo `error.code` nếu spec yêu cầu). Dùng `useTransition`/`useActionState` cho trạng thái pending.
4. **Realtime**: hook `features/<f>/client/hooks/use-<x>.ts` dùng `onSnapshot` (Firebase JS SDK từ `core/client/firebase.ts`), unsubscribe khi unmount, xử lý `permission-denied`. Không ghi Firestore từ client (trừ presence RTDB của mình / Storage avatar theo ADR).
5. **Export** component cho app/feature khác qua `features/<f>/client/index.ts`.
6. **Test**: Testing Library cho trạng thái loading/error/điều kiện hiển thị theo AC có cách kiểm `unit` (component).
7. **Tự soát giao diện** (khi chạy inline và dev server có sẵn): có thể mở trang ở 375px để xem nhanh — kiểm thử đầy đủ là việc của chrome-tester.

## Gate
```
cd implement/webapp && npm run typecheck && npm run lint && npm run test:unit
```

## Báo cáo
Route/component tạo/sửa · trạng thái đã làm theo scr-xx · `data-testid` đã thêm (để qc-testcase-writer dùng) · key i18n thiếu · kết quả gate · lệch spec màn. Không commit.
