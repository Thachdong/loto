---
task: T-012
title: Cài đặt trong phòng — mode dò, tiếng rao, nhịp quay (SCR-11)
written_from_commit: 02daca5
last_run: null
summary: null
---

# Test case QC · T-012 Cài đặt (SCR-11)

## 0. Môi trường
- Như `backlog/testcases/T-006-game-room.md` mục 0. Seed `game-running` (T-006, phòng `r_gm_run`, nhịp 3 giây): H = host, B giữ Đỏ A, C giữ Lam A + Lam B. Seed `game-waiting` cho TC-05.
- Tên chế độ theo quyết định dev: **"Dò tay"** (= "Tự dò" trong spec) / **"Tự dò"** (= "Auto" trong spec).
- Chữ: "Cài đặt" · "Cách dò số" · "Dò tay" / "Tự dò" · "Tự dò tự đánh dấu số đã rao trên vé; bạn vẫn phải tự bấm KINH." · "Tiếng rao" · "Chỉ áp dụng trên máy của bạn" · "Nhịp quay" · "{n} giây" · "áp dụng từ số kế tiếp" · "{n} giây/số (host chỉnh)" · "Chưa đổi được nhịp quay" · "Hồ sơ cá nhân" + "Sắp có" · "Phòng hết hạn lúc HH:mm" · toast "Nhịp quay: {n} giây/số".
- `data-testid`: `tab-settings`, `settings-sheet`, `settings-mode-manual`, `settings-mode-auto` (`aria-checked`), `settings-sound` (`aria-checked`), `settings-interval-stepper`, `btn-interval-minus`, `btn-interval-plus`, `settings-interval-value`, `settings-interval-readonly`, `settings-profile`, `settings-expires`.

## 1. Ma trận phủ
| AC | TC / test tự động |
|---|---|
| AC-1, AC-2 | TC-T012-01 · `settings-sheet.test.tsx`, `use-marks.test.tsx` (syncTicketMarks) |
| AC-3, AC-13 | TC-T012-02 · `use-play-mode.test.ts` |
| AC-4, AC-5 | TC-T012-03 · `settings-sheet.test.tsx` |
| AC-6 | TC-T012-04 · `update-room.test.ts`, `use-draw-interval.test.ts` |
| AC-7 | TC-T012-04 bước 3 · `update-room.test.ts`, `settings-sheet.test.tsx` |
| AC-8 | TC-T012-01 bước 1 · `update-room.test.ts` (automated) |
| AC-9 | TC-T012-05 |
| AC-10 | TC-T012-04 bước 4 · `use-draw-interval.test.ts` |
| AC-11 | chưa làm — `/profile` thuộc T-011; hàng hiện "Sắp có" |
| AC-12 | TC-T012-01 bước 1 · `settings-sheet.test.tsx` |

## 3. Test case

### TC-T012-01 · Player: đổi cách dò giữa ván
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, AC-2, AC-8, AC-12 | manual |

**Tiền điều kiện:** `npm run seed -- reset && npm run seed -- game-running`; P2 = B mở `/room`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Bấm tab "Cài đặt" | "Dò tay" đang chọn, Tiếng rao bật, "3 giây/số (host chỉnh)" (không có −/+), "Hồ sơ cá nhân · Sắp có", "Phòng hết hạn lúc HH:mm" = `expires_at` giờ VN | ui |
| 2 | P2 | Chọn "Tự dò", đóng sheet | Các số đã rao có trên vé được tô; nút "Tự dò" ở thanh KINH đang bật; KINH không tự gửi | ui |
| 3 | P2 | Cài đặt → "Dò tay"; chờ thêm số | Ô đã tô giữ nguyên; số mới không tự tô; chạm ô tô được | ui |

**Kết quả:** ⬜

### TC-T012-02 · Cài đặt được giữ lại
| P1 | luồng thay thế | AC-3, AC-13 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Chọn "Tự dò", tắt Tiếng rao, tải lại trang | Vẫn "Tự dò", tiếng tắt (nút thanh KINH "Bật tiếng") | ui |
| 2 | P2 | Console: `Storage.prototype.setItem = () => { throw new Error("x") }`; đổi "Dò tay" | UI vẫn đổi, không lỗi | ui |

**Kết quả:** ⬜

### TC-T012-03 · Tiếng rao
| P1 | happy | AC-4, AC-5 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đang nghe tiếng rao, tắt "Tiếng rao" | Số mới vẫn hiện, không có tiếng; P1 vẫn nghe | ui |
| 2 | P2 | Tải lại trang (chưa chạm "Bật tiếng"), bật "Tiếng rao" trong Cài đặt | Số kế tiếp có tiếng | ui |

**Kết quả:** ⬜

### TC-T012-04 · Host đổi nhịp quay
| P0 | happy + biên + lỗi | AC-6, AC-7, AC-10 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | H mở Cài đặt, bấm + 5 lần nhanh (3 → 8) | Hiện "8 giây"; sau ~600 ms toast "Nhịp quay: 8 giây/số" ở P1 và P2; P2 thấy "8 giây/số (host chỉnh)"; Emulator: `draw_interval_sec = 8`, chỉ 1 lần ghi | ui, emulator |
| 2 | P1 | Quan sát 3 số tiếp theo | Số đầu theo hẹn cũ, các khoảng sau ≈ 8 giây | ui |
| 3 | P1 | Bấm − tới 3, + tới 15 | − khóa ở 3; + khóa ở 15 | ui |
| 4 | P1 | DevTools Offline, bấm − | Về giá trị server, toast "Chưa đổi được nhịp quay" | ui |

**Kết quả:** ⬜

### TC-T012-05 · Đổi nhịp khi ván chờ
| P2 | luồng thay thế | AC-9 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Seed `game-waiting`; H đổi nhịp 10 | Toast "Nhịp quay: 10 giây/số" | ui |
| 2 | P1 | Bấm "Bắt đầu" | Các số cách nhau ≈ 10 giây | ui |

**Kết quả:** ⬜
