---
name: qc-testcase-writer
description: Viết bộ test case QC cho một task Lô Tô Online dựa trên phần ĐÃ implement (diff, route, chữ vi.ts, data-testid, seed) và AC/FLOW/BR trong specs — happy, luồng thay thế, lỗi, biên, phân quyền, nhiều người chơi, mất kết nối, responsive. Ra file backlog/testcases/T-XXX-*.md theo định dạng chrome-tester chạy được. Dùng khi orchestrator gọi sau khi code xong, hoặc QC/dev gọi /qc-testcase-writer T-XXX (VD viết lại khi specs đổi).
argument-hint: T-XXX
---

# qc-testcase-writer

Đầu ra: `backlog/testcases/T-XXX-<slug>.md` theo khung `.claude/skills/implement-task/references/testcase-template.md`. File đã có → cập nhật (giữ ID TC cũ còn đúng, giữ kết quả chạy cũ của TC không đổi; TC bỏ đi → đánh dấu `~~bỏ~~` kèm lý do, không xóa ID).

## Nguồn
1. Task `backlog/tasks/T-XXX-*.md`: AC, bảng "Kịch bản test trên Chrome" (khung tối thiểu — mọi bước ở đó phải có trong TC), seed, ngoài phạm vi.
2. Plan `backlog/plan/T-XXX-*.md`: ánh xạ AC → kiểm chứng, giả định.
3. **Phần đã làm** — đây là căn cứ chính cho bước thao tác và kết quả mong đợi:
   - `git diff <plan_commit>..HEAD --stat` rồi đọc file route/component/action đã tạo.
   - Chữ hiển thị thật: `src/core/shared/i18n/vi.ts` (dùng đúng chữ, không đoán).
   - `data-testid`, route, query param, seed scenario (`scripts/seed/scenarios/tXXX.ts`: tài khoản, uid, dữ liệu).
   - Test tự động đã có (`*.test.ts`, `tests/emulator/**`) → để đánh dấu `automated`.
4. Specs: `specs/ui-ux/scr-xx-*.md` (trạng thái màn), FLOW-xx (bước, A*, E*), BR-xx (giá trị biên), `api-contract.yml` (mã lỗi → message người dùng thấy).

## Cách viết
1. **Liệt kê nguồn cần phủ**: mọi AC; mọi nhánh A*/E* của FLOW trong phạm vi; mọi BR có giá trị biên (đủ/thiếu/vượt: VD 16 người, 2 vé, 8 giờ, 5 tin/10 giây); quyền (host / player / người xem / người ngoài phòng / chưa đăng nhập); trạng thái màn (loading/empty/error).
2. **Thiết kế TC** — mỗi TC kiểm một hành vi, độc lập (tiền điều kiện tự đủ, dựng bằng seed hoặc bước trước trong chính TC):
   - `happy` → P0. `alt`/`error`/`permission`/`boundary` quan trọng → P1. Còn lại → P2.
   - `multi-user`: ghi rõ profile từng bước (P1 host, P2 player…), thứ tự xen kẽ, kết quả mong đợi ở **từng** profile (VD P2 thấy số mới ≤ 1 giây sau P1).
   - `resilience`: reload, đóng tab, tắt mạng (DevTools offline), tab ẩn — chỉ khi task liên quan.
   - `responsive`: 360px và 375px, không tràn ngang — ít nhất 1 TC cho mỗi màn mới.
   - Thời gian dài (8 giờ, 15 phút): dùng seed đặt mốc thời gian sát hạn / clock giả, ghi rõ cách dựng; không bắt QC chờ thật.
3. **Bước thao tác** cụ thể, máy làm theo được: chữ nút chính xác (từ vi.ts), URL đầy đủ, giá trị nhập, phím. Không viết "kiểm tra hoạt động đúng".
4. **Kết quả mong đợi** quan sát được, kèm **Cách kiểm** (`url`/`ui`/`toast`/`emulator-ui`/`cookie`/`console`/`network`/`layout`). Dữ liệu DB → đường dẫn doc + field + giá trị.
5. AC đã phủ bằng Vitest → TC `automated` trỏ file test, không lặp bước Chrome (trừ khi AC là hành vi người dùng thấy).
6. Không chạy được trên Chrome localhost (Safari iOS thật, Zalo thật, crawler OG thật) → `manual`, ghi cách làm tay.
7. **Smoke**: 3–5 TC P0 tiêu biểu nhất, chạy nhanh (< 2 phút tổng) — task sau sẽ chạy lại.
8. **Ma trận phủ**: mọi AC phải có ≥ 1 TC (`chrome`/`automated`/`manual`). AC không phủ → ghi lý do + báo orchestrator.
9. Đặt `written_from_commit` = `git rev-parse --short HEAD`.

ID: `TC-T<số task>-<2 chữ số>` (VD `TC-T002-07`). Tên TC mô tả hành vi, không mô tả thao tác.

## Báo cáo
Đường dẫn file · số TC theo ưu tiên × loại · số `chrome`/`automated`/`manual` · smoke · AC/FLOW chưa phủ · chỗ code lệch specs phát hiện khi viết (báo, không tự sửa code). Không commit (orchestrator lo; gọi trực tiếp → hỏi dev có commit không).
