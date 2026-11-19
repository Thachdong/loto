---
task: T-XXX
title: <tiêu đề task>
written_from_commit: <hash HEAD lúc viết>
last_run: null           # YYYY-MM-DD HH:mm khi chrome-tester chạy
summary: null            # VD "P0 6/6 · P1 9/10 · P2 chưa chạy"
---

# Test case QC · T-XXX <tiêu đề>

## 0. Môi trường chung
- Lệnh: `npm run emulators` (nền) · `npm run dev` (nền) · `npm run seed -- reset && npm run seed -- tXXX`
- URL: `http://localhost:3000` · Emulator UI: `http://localhost:4000`
- Viewport: 375×812 (trừ khi case ghi khác)
- Profile: P1 = <vai trò/tài khoản>, P2 = …, P3 = … (mỗi profile một cửa sổ Chrome, cookie tách biệt)

## 1. Ma trận phủ
| Nguồn | TC |
|---|---|
| AC-1 | TC-TXXX-01 |
| FLOW-xx E1 | TC-TXXX-05 |
| BR-xx biên | TC-TXXX-07 |
| AC-11 (automated) | `tests/emulator/...` |

## 2. Smoke (chạy lại ở các task sau)
TC-TXXX-01, TC-TXXX-03, …

## 3. Test case

### TC-TXXX-01 · <tên ngắn, mô tả hành vi>
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, FLOW-xx b1–3 | chrome |

**Tiền điều kiện:** <seed, trạng thái đăng nhập, profile sạch…>
**Dữ liệu:** <tài khoản, giá trị nhập>

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `/` | URL thành `/login` | url |
| 2 | P1 | Bấm nút "Đăng nhập với Google" | Nút hiện "Đang đăng nhập…", bị khóa | ui |
| 3 | P1 | Mở Emulator UI › Firestore › `users/{uid}` | `display_name = "An Nguyễn"` | emulator-ui |

**Kết quả:** ⬜
<!-- chrome-tester điền: ✅ PASS | ❌ FAIL bước N: <thực tế> | ⏭ SKIP: <lý do> · ảnh: <đường dẫn> · YYYY-MM-DD -->

---

## Từ điển
- **Ưu tiên:** P0 luồng chính, phải pass để đóng task (luôn nằm trong smoke) · P1 luồng thay thế/lỗi/biên quan trọng · P2 hiếm gặp, cosmetic.
- **Loại:** `happy` · `alt` (luồng A*) · `error` (luồng E*) · `boundary` (biên BR) · `permission` (host/player/người ngoài) · `multi-user` · `resilience` (mất mạng, reload, tab ẩn) · `responsive` · `security`.
- **Chạy bằng:** `chrome` (chrome-tester chạy) · `automated` (đã phủ bằng Vitest, ghi đường dẫn test, chrome-tester bỏ qua) · `manual` (cần thiết bị thật, VD Safari iOS, Zalo thật).
- **Cách kiểm:** `url` · `ui` (chữ/phần tử hiển thị, dùng chữ trong vi.ts hoặc `data-testid`) · `toast` · `emulator-ui` (dữ liệu Firestore/RTDB/Auth) · `cookie` · `console` (không có lỗi) · `network` · `layout` (không tràn ngang, kích thước).
