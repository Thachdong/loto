---
task: T-007
title: Kết quả ván (SCR-09) — host duyệt KINH, xác nhận / bác bỏ, chúc mừng, ván mới
written_from_commit: a66dd1d
last_run: null
summary: null
---

# Test case QC · T-007 Kết quả ván (SCR-09)

> AC theo plan `backlog/plan/T-007-game-result.md` mục 5 (specs mới Q-055..Q-058: **không** có cửa sổ đồng kinh 5 giây). QC chạy tay trên trình duyệt (dev bỏ bước chrome-tester).

## 0. Môi trường
- Như `backlog/testcases/T-006-game-room.md` mục 0 (emulators, dev server, đăng nhập redirect, 3 profile H/B/C, viewport 375×812).
- Seed mới (`npm run seed -- reset && npm run seed -- <tên>`): `result-awaiting-win` (alias `t007`, `r_rs_win`: claims = [B `red_a` hụt, C `blue_a` đúng hàng 1]) · `result-awaiting-miss` (`r_rs_miss`: claims = [B `red_a` hụt], `resume_status = running`) · `result-host-offline` (`r_rs_off`: C đúng; presence H offline). Dùng lại seed T-006: `game-row-ready`, `game-paused`, `game-nearly-done`, `game-awaiting-expiring`.
- Chữ (vi.ts): "KINH! · Chờ host duyệt ({k} lượt)" · "✅ Đúng – Hàng {n}: a · b · c · d · e" · "❌ Hụt" · "▸ Xem vé" · "Xác nhận kết thúc ván" + "Người thắng: mọi vé được hệ thống xác định đúng." · "Bác bỏ – quay tiếp" + "Tất cả lượt KINH đều hụt." · "⏳ Đang chờ host duyệt. Bạn vẫn có thể bấm KINH." · "Host đang offline — ván chờ host quay lại. Bạn có thể rời phòng." · "Bạn cũng đủ hàng? Bấm KINH trước khi host duyệt!" · "🎊 Chúc mừng! 🎊" · "Ván {n} kết thúc · {k} người thắng" · "Ván {n} kết thúc — không ai thắng" · "Vé của bạn vẫn được giữ cho ván {n+1}" · "Bạn offline lúc ván kết thúc nên vé đã được trả lại. Hãy lấy vé mới." · "Đóng" · toast "{tên} kinh hụt", "Vừa có vé KINH đúng — hãy xác nhận", "Chưa xác nhận được, thử lại", "Chưa bác bỏ được, thử lại".
- `data-testid`: `review-card`, `review-item-{uid}-{ticketId}` (`data-result`), `btn-review-view-{uid}-{ticketId}`, `mini-ticket` (`data-row-win`), `btn-confirm-game`, `btn-reject-claims`, `review-waiting`, `review-host-offline`, `review-nudge`, `result-overlay` (`data-result` = won/no_winner), `result-winner-{uid}-{ticketId}`, `result-keep-line` (`data-line` = kept/released), `btn-result-close`, `confetti`.

## 1. Ma trận phủ
| AC | TC / test tự động |
|---|---|
| AC-1 | TC-T007-01 · `review-card.test.tsx` |
| AC-2 | TC-T007-02 · `tests/emulator/game/create-claim.test.ts` |
| AC-3 | TC-T007-01, 04 · `review-card.test.tsx`, `room-screen.test.tsx` |
| AC-4 | TC-T007-06 · `review-card.test.tsx` |
| AC-5 | TC-T007-03 · `tests/emulator/game/game-result.test.ts` |
| AC-6 | `game-result.test.ts` (automated) |
| AC-7 | TC-T007-08 · `game-result.test.ts` |
| AC-8 | `game-result.test.ts` (automated) |
| AC-9 | TC-T007-04, 05 · `game-result.test.ts` |
| AC-10 | `game-result.test.ts`, `game-errors.test.ts` (automated) |
| AC-11 | TC-T007-03 · `result-overlay.test.tsx`, `use-finished-game.test.tsx` |
| AC-12 | TC-T007-09 · `use-finished-game.test.tsx` |
| AC-13 | TC-T007-07 · `result-overlay.test.tsx` |
| AC-14 | TC-T007-10 · `room-screen.test.tsx`, `game-errors.test.ts` |
| AC-15 | `result-overlay.test.tsx` (automated) |

## 2. Smoke (chạy lại ở các task sau)
TC-T007-01, TC-T007-03, TC-T007-04.

## 3. Test case

### TC-T007-01 · Host thấy thẻ duyệt KINH với lượt đúng/hụt và nút Xác nhận
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, AC-3 | manual |

**Tiền điều kiện:** seed `result-awaiting-win`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, mở `/room` | `review-card` nửa trên: "KINH! · Chờ host duyệt (2 lượt)"; dòng B "Bình B · vé Đỏ A" + "❌ Hụt"; dòng C "Cúc C · vé Lam A" + "✅ Đúng – Hàng 1: …5 số" | ui |
| 2 | P1 | Nhìn vé thu nhỏ | `mini-ticket` của lượt đầu (B), không viền hàng; bấm "▸ Xem vé" ở dòng C → vé Lam A, ô đã rao tô vàng đậm, hàng 1 viền xanh | ui |
| 3 | P1 | Nhìn đáy thẻ | Chỉ có "Xác nhận kết thúc ván" + dòng phụ; **không** có "Bác bỏ – quay tiếp" | ui |

**Kết quả:** ⬜

---

### TC-T007-02 · Player thấy dòng chờ, lời nhắc và vẫn KINH thêm được
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-2, AC-3 | manual |

**Tiền điều kiện:** seed `result-awaiting-miss`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Đăng nhập C, mở `/room` | Thẻ "KINH! · Chờ host duyệt (1 lượt)"; "⏳ Đang chờ host duyệt. Bạn vẫn có thể bấm KINH."; "Bạn cũng đủ hàng? Bấm KINH trước khi host duyệt!"; không có nút host; thanh KINH bật | ui |
| 2 | P3 | Bấm KINH → chọn "Kinh vé Lam A" | Toast "Cúc C KINH!"; thẻ thành "(2 lượt)", dòng mới ở cuối; vé Lam A ở thanh KINH thành "Đã KINH vé này" | ui, toast |
| 3 | P2 | Đăng nhập B | Không có `review-nudge` (vé duy nhất đã báo KINH) | ui |

**Kết quả:** ⬜

---

### TC-T007-03 · Host xác nhận kết thúc ván → chúc mừng, ván mới, vé được giữ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-5, AC-11 | manual |

**Tiền điều kiện:** seed `result-awaiting-win`; tab P1 (H) và tab P3 (C) mở `/room` (2 profile Chrome hoặc 2 trình duyệt).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Bấm "Xác nhận kết thúc ván" | ≤ 1 giây cả 2 tab: overlay "🎊 Chúc mừng! 🎊", "Ván 1 kết thúc · 1 người thắng", dòng C "Cúc C · vé Lam A" + "Hàng 1: …", vé thu nhỏ hàng 1 viền xanh, pháo giấy; máy đã bật tiếng nghe tiếng chúc mừng | ui |
| 2 | P3 | Nhìn dòng dưới | "Vé của bạn vẫn được giữ cho ván 2" | ui |
| 3 | P1 | Emulator UI › `rooms/r_rs_win/games/g…` (ván 1) | `status = finished`, `result = won`, `winners` = [C blue_a row 0], `confirmed_by = u_tk_h`, `ended_at` có; `rooms/r_rs_win.current_game_id` = ván mới `waiting` `seq_no = 2`, `game_count = 2`, `last_event.type = game_finished`; ván mới có `players` B, C với `ticket_ids` cũ | emulator-ui |
| 4 | P3 | Bấm "Đóng" | Overlay đóng; SCR-04 "Ván 2 · Chờ bắt đầu"; vé Lam A, Lam B vẫn hiện | ui |

**Kết quả:** ⬜

---

### TC-T007-04 · Host bác bỏ khi toàn lượt hụt → ván quay tiếp
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-3, AC-9 | manual |

**Tiền điều kiện:** seed `result-awaiting-miss`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `/room` | Thẻ có "❌ Hụt"; chỉ nút "Bác bỏ – quay tiếp" + "Tất cả lượt KINH đều hụt." | ui |
| 2 | P1 | Bấm "Bác bỏ – quay tiếp" | Thẻ đóng; toast "Bình B kinh hụt" (+ tiếng kinh hụt nếu bật tiếng); phụ đề "Ván 1 · Đang quay"; ~3 giây sau có số mới | ui, toast |
| 3 | P1 | Emulator UI ván 1 | `claims = []`, `status = running`, `resume_status = null`, `next_call_at` có; `rooms.last_event.type = claims_rejected` | emulator-ui |

**Kết quả:** ⬜

---

### TC-T007-05 · Bác bỏ khi KINH lúc đang tạm dừng → về tạm dừng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-9 | manual |

**Tiền điều kiện:** seed `game-paused`; B bấm KINH vé Đỏ A (hụt).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | H bấm "Bác bỏ – quay tiếp" | Ván về "Tạm dừng", nút "▶ Tiếp tục"; không có số mới | ui |

**Kết quả:** ⬜

---

### TC-T007-06 · Host offline khi chờ duyệt
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | edge | AC-4 | manual |

**Tiền điều kiện:** seed `result-host-offline`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, mở `/room` | Thêm dòng "Host đang offline — ván chờ host quay lại. Bạn có thể rời phòng."; không có số mới | ui |
| 2 | P1 | H mở `/room` (online lại) | Tab B: dòng host offline biến mất; H thấy "Xác nhận kết thúc ván" | ui |

**Kết quả:** ⬜

---

### TC-T007-07 · Hết 90 số → overlay không ai thắng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-13 | manual |

**Tiền điều kiện:** seed `game-nearly-done`; H mở `/room` trước khi số 90 được rao.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Chờ số thứ 90 | Overlay "Ván 1 kết thúc — không ai thắng", không pháo giấy, nút "Đóng"; bấm Đóng → "Ván 2 · Chờ bắt đầu" | ui |

**Kết quả:** ⬜

---

### TC-T007-08 · Phòng hết hạn khi chờ duyệt
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | edge | AC-7 | manual |

**Tiền điều kiện:** seed `game-awaiting-expiring`; chờ quá 60 giây.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Bấm "Xác nhận kết thúc ván" (hoặc chờ client gọi `expireRoom`) | Không toast lỗi; về SCR-02 với banner `Phòng "…" đã hết hạn.`; Emulator: ván `finished` `won`, phòng `closed` `expired` | ui, emulator-ui |

**Kết quả:** ⬜

---

### TC-T007-09 · Người offline lúc ván kết thúc bị trả vé
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | edge | AC-12 | manual |

**Tiền điều kiện:** seed `result-awaiting-win`; tab C mở `/room`; trong Emulator UI › Realtime Database đặt `presence/r_rs_win/u_tk_c/online = false` (giả lập C offline, tab vẫn mở — ghi đè có thể bị tab tự ghi lại, làm ngay trước bước 1).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | H bấm "Xác nhận kết thúc ván" | Tab C: overlay hiện "Bạn offline lúc ván kết thúc nên vé đã được trả lại. Hãy lấy vé mới."; ván 2 không có `players/u_tk_c` | ui, emulator-ui |

**Kết quả:** ⬜

---

### TC-T007-10 · Lỗi mạng khi xác nhận / bác bỏ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | error | AC-14 | manual |

**Tiền điều kiện:** seed `result-awaiting-win`; DevTools › Network › Offline.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Bấm "Xác nhận kết thúc ván" | Toast "Chưa xác nhận được, thử lại"; nút bấm lại được | toast |
| 2 | P1 | Bật mạng, bấm lại | Thành công như TC-T007-03 | ui |

**Kết quả:** ⬜
