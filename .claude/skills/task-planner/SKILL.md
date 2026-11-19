---
name: task-planner
description: Lập plan implement cho một task backlog Lô Tô Online — đọc task + specs liên quan + docs Next.js 16, ra danh sách file theo lớp (shared/db/server/client), contract, các step chia lane để chạy song song, ánh xạ AC → kiểm chứng, giả định. Ghi nháp vào backlog/plan/. Dùng khi orchestrator implement-task gọi, hoặc dev gọi /task-planner T-XXX.
argument-hint: T-XXX
---

# task-planner

Đầu vào: `$ARGUMENTS` = `T-XXX`. Đầu ra: `backlog/plan/T-XXX-<slug>.md` (slug lấy từ tên file task), `status: draft`.

Đọc trước:
- `.claude/skills/implement-task/references/architecture.md`
- `.claude/skills/implement-task/references/conventions.md`
- `.claude/skills/implement-task/references/plan-template.md` (khung bắt buộc)

## Cách làm
1. **Đọc task** `backlog/tasks/T-XXX-*.md` trọn vẹn: phạm vi, ngoài phạm vi, việc cần làm, AC, test, seed, ghi chú `[ASSUMED]`.
2. **Đọc specs đúng mục task trỏ tới** (không đọc lan man):
   - `specs/api-contract.yml`: mỗi operation trong phạm vi — request/response schema, mã lỗi, `auth`.
   - `specs/database.md`: TBL-xx — field, kiểu, rules, index, TTL.
   - `specs/actions.md`, `specs/ui-ux/scr-xx-*.md` (bố cục, trạng thái, §ghi chú), `specs/ui-ux/wireframe.md`.
   - `idea/business-flows.md` FLOW-xx (bước, A*, E*), `idea/business.md` BR-xx.
   - `specs/tech-stack.md` ADR liên quan.
   - Tra nhanh: `graphify-out/graph.json` tồn tại → có thể `graphify query "<câu hỏi>"` để tìm node liên quan (tùy chọn).
3. **Đọc code hiện có** trong `implement/webapp/src` (feature đã có, core helper, seed, rules) để tái sử dụng, không tạo trùng.
4. **Đọc docs Next.js 16** cho mọi API sẽ dùng (`implement/webapp/node_modules/next/dist/docs/`). Ghi file đã đọc vào mục 2 plan.
5. **Thiết kế** theo architecture.md:
   - Chọn feature sở hữu (theo dữ liệu chính). Đường dẫn trong task (kiểu cũ) → đổi theo bảng ánh xạ mục 4 của architecture.md.
   - Liệt kê **mọi file** tạo/sửa theo lớp, kể cả rules, index, seed, test, `vi.ts`.
   - Viết mục **3.2 Contract** đủ để lane client code mà không cần đợi backend: chữ ký action (input/output TS type), model camelCase, route, key i18n, `data-testid` chính.
6. **Chia step & lane**:
   - `S1` (lane `main`, server-worker chế độ contract): schema Zod, type, stub action (handler `throw new AppError('INTERNAL_ERROR')` hoặc tạm), key i18n. Luôn là step đầu nếu task có action mới.
   - Lane `backend`: db-worker → server-worker (tuần tự trong lane).
   - Lane `client`: ui-worker (chỉ phụ thuộc S1).
   - Task chỉ có UI hoặc chỉ hạ tầng (VD T-001) → 1 lane, ghi rõ "tuần tự".
   - Các lane **không chung file**. Tự kiểm: giao tập file giữa các lane = rỗng; `vi.ts` thuộc S1.
   - Mỗi step = 1 (tối đa 2) commit; mục tiêu ≤ ~400 dòng thay đổi/commit. Step quá lớn (VD T-006, 21 point) → tách nhỏ theo khối logic (quay số / Kinh / audio / presence…).
   - Ghi commit message dự kiến (EN, Conventional Commits, scope = feature).
7. **Ánh xạ AC → kiểm chứng**: mỗi AC một dòng: `unit` / `emulator` / `chrome` / `manual`, kèm file test dự kiến. AC nào không kiểm được → nói rõ lý do.
8. **Giả định & câu hỏi**: chép `[ASSUMED]` của task; thêm cái mới. Chỗ specs mâu thuẫn hoặc thiếu → `❓` (câu hỏi cụ thể, kèm phương án đề xuất).
9. Ghi file theo template. Không sửa code, không commit.

## Kết thúc
Trả về cho orchestrator: đường dẫn plan, số file theo lớp, bảng step, danh sách ❓. Gọi trực tiếp (không qua orchestrator) → in tóm tắt tương tự cho dev.
