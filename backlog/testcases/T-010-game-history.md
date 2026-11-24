---
task: T-010
title: Lịch sử ván trong phòng (SCR-08)
written_from_commit: 287defd
last_run: null
summary: null
---

# Test case QC · T-010 Lịch sử ván (SCR-08)

## 0. Môi trường
- Như `backlog/testcases/T-006-game-room.md` mục 0 (emulators, dev server, đăng nhập, 3 profile H/B/C, 375×812).
- Seed `history` (alias `t010`, `r_hist`): ván 1 `won` (C Lam A), ván 2 `won` (B Đỏ A có ảnh + C Lam B không ảnh), ván 3 `no_winner`, ván 4 `cancelled` (không giờ bắt đầu), ván 5 `waiting` (hiện tại). Giờ seed UTC 16:00+ → hiển thị 23:xx GMT+7.
- Chữ: "Lịch sử ván" · "Ván {n}" · "HH:mm – HH:mm" · "Hủy lúc HH:mm" · "Vé {màu} {A|B}" · "Không ai thắng" · "Đã hủy" · "Chưa có ván nào kết thúc" + "Kết quả mỗi ván sẽ hiện ở đây." · "Không tải được lịch sử" + "Thử lại".
- `data-testid`: `tab-history`, `history-sheet`, `history-card-{n}` (`data-outcome`), `history-winner-{n}-{uid}`, `history-empty`, `history-loading`, `history-error`.

## 1. Ma trận phủ
| AC | TC / test tự động |
|---|---|
| AC-1 | TC-T010-01 · `history-card.test.ts`, `seed-scenarios.test.ts`, `history-sheet.test.tsx` |
| AC-2 | TC-T010-01 · `history-sheet.test.tsx` |
| AC-3 | TC-T010-01 · `history-card.test.ts` |
| AC-4 | TC-T010-03 |
| AC-5 | TC-T010-02 · `history-sheet.test.tsx` |
| AC-6 | `tests/emulator/game/game-rules.test.ts` (automated) |
| AC-7 | không áp dụng (lọc ở client, không cần index — plan §6) |

## 3. Test case

### TC-T010-01 · Xem lịch sử: thứ tự, giờ, người thắng, không ai thắng, đã hủy
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, AC-2, AC-3 | manual |

**Tiền điều kiện:** `npm run seed -- reset && npm run seed -- history`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, mở `/room`, bấm tab "Lịch sử" | Sheet "Lịch sử ván"; 4 thẻ theo thứ tự Ván 4, 3, 2, 1 (không có Ván 5) | ui |
| 2 | P2 | Xem Ván 4 | "Hủy lúc 23:33" + "Đã hủy" | ui |
| 3 | P2 | Xem Ván 3 | "23:20 – 23:29" + "Không ai thắng" | ui |
| 4 | P2 | Xem Ván 2 | "23:10 – 23:18"; 2 dòng 🏆: "Bình B" có ảnh + chip đỏ "Vé Đỏ A"; "Cúc C" chữ cái "C" + chip lam "Vé Lam B" | ui |
| 5 | P2 | Xem Ván 1 | "23:00 – 23:08"; 🏆 "Cúc C" chip "Vé Lam A" | ui |

**Kết quả:** ⬜

---

### TC-T010-02 · Phòng mới: lịch sử trống
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | empty | AC-5 | manual |

**Tiền điều kiện:** seed `game-waiting`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Mở `/room` → "Lịch sử" | "Chưa có ván nào kết thúc" + "Kết quả mỗi ván sẽ hiện ở đây." | ui |

**Kết quả:** ⬜

---

### TC-T010-03 · Ván vừa kết thúc tự hiện trên cùng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | realtime | AC-4 | manual |

**Tiền điều kiện:** seed `result-awaiting-win`; tab H và tab C (2 profile) mở `/room`; C mở sheet "Lịch sử" (trống).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | H bấm "Xác nhận kết thúc ván" | Tab C (đóng overlay chúc mừng nếu che): ≤ 1 giây sheet có thẻ "Ván 1" với 🏆 "Cúc C" "Vé Lam A", không tải lại | ui |

**Kết quả:** ⬜

---

### TC-T010-04 · Hết 90 số → thẻ "Không ai thắng"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | alt | AC-3, AC-4 | manual |

**Tiền điều kiện:** seed `game-nearly-done`; mở `/room`, chờ số 90, đóng overlay.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở "Lịch sử" | Thẻ "Ván 1" "Không ai thắng" với giờ bắt đầu–kết thúc | ui |

**Kết quả:** ⬜
