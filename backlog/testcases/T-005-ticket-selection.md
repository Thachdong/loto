---
task: T-005
title: Chọn vé (SCR-05)
written_from_commit: 3553293
last_run: null
summary: "Chrome bỏ qua theo yêu cầu dev — chưa chạy TC `chrome`"
---

# Test case QC · T-005 Chọn vé (SCR-05)

> Dev yêu cầu **bỏ bước test trên Chrome** cho task này. TC `chrome` bên dưới để QC/dev chạy sau; phần `automated` đã chạy trong `npm test`.

## 0. Môi trường chung
- Lệnh: `npm run emulators` (nền) · `npm run dev` (nền) · `npm run seed -- reset && npm run seed -- tickets-basic` (cũng có `tickets-running`, `tickets-carry`; `t005` = `tickets-basic`).
- URL: `http://localhost:3000/room` · Emulator UI: `http://localhost:4000`. Viewport 375×812.
- Đăng nhập: như T-002/T-003 (`/login?__ua=<UA Android>` trên dev, luồng redirect). Hai profile cùng lúc cần cookie tách biệt (2 cửa sổ/profile Chrome); không tách được → chạy lần lượt và đối chiếu qua Emulator UI.
- Profile: P1 = H `h@example.com` "Host H" (host, `u_tk_h`) · P2 = B `b@example.com` "Bình B" (`u_tk_b`) · P3 = C `c@example.com` "Cúc C" (`u_tk_c`).
- Phòng seed: `r_tk_basic` (ván 1 waiting, H/B/C online) · `r_tk_run` (ván running, B giữ `red_a`, C đã rời giữ `blue_b`) · `r_tk_carry` (ván 2 waiting, B giữ `green_a`).
- Chữ (vi.ts): nút "Vé" · sheet "Chọn vé" · "Bạn giữ {k}/2 vé · {x}/16 vé đã có chủ" · "Trống" · "Bạn" · "Lấy vé này" · "Bỏ vé" · "Tối đa 2 vé" · "Đã có người lấy" · "Ván đang chạy" · "Khóa tới hết ván" · "🔒 Ván đang chạy — chỉ lấy/bỏ vé khi ván chờ bắt đầu." · "Hết vé trống — chờ người khác bỏ vé ở ván sau" · "Tạo bộ vé mới" · dialog "Tạo bộ vé mới?" "16 vé sẽ được sinh lại cho cả phòng." Hủy/Tạo · dialog "Chưa tạo được bộ vé mới", "Nhắc họ bỏ vé", "Thu hồi" · "Không tải được bộ vé" + "Thử lại" · toast "Vé đã có người lấy", "Tối đa 2 vé", "Ván đã bắt đầu, không đổi vé được", "Bộ vé mới đã được tạo", "Host đã thu hồi vé của {tên}" / "…của bạn".
- `data-testid`: `ticket-open`, `ticket-sheet`, `ticket-close`, `ticket-counter`, `ticket-lock-banner`, `ticket-sold-out`, `ticket-card-{id}`, `ticket-holder-{id}`, `ticket-preview`, `ticket-back`, `ticket-partner-line`, `ticket-take`, `ticket-release`, `ticket-renew`, `renew-confirm`, `renew-create`, `renew-cancel`, `still-held-dialog`, `still-held-row-{uid}`, `still-held-status-{uid}`, `ticket-reclaim-{uid}`, `ticket-load-error`, `ticket-retry`, `ticket-skeleton`, `paper-ticket-{id}`.

## 1. Ma trận phủ
| Nguồn | TC |
|---|---|
| AC-1 | TC-T005-01 · `derive-ticket-cards.test.ts`, `ticket-sheet.test.tsx` |
| AC-2 | TC-T005-02 · `paper-ticket.test.tsx` |
| AC-3 | TC-T005-03 · `take-ticket.test.ts` |
| AC-4 | TC-T005-04 · `take-ticket.test.ts` |
| AC-5 | TC-T005-04 · `take-ticket.test.ts`, `derive-ticket-cards.test.ts` |
| AC-6 | TC-T005-05 · `derive-ticket-cards.test.ts` |
| AC-7 | TC-T005-06 · `take-ticket.test.ts` (20 vòng) |
| AC-8 | TC-T005-07 · `release-ticket.test.ts` |
| AC-9 | TC-T005-08 · `take-ticket.test.ts`, `renew-ticket-set.test.ts`, `ticket-sheet.test.tsx` |
| AC-10 | TC-T005-08 · `derive-ticket-cards.test.ts` |
| AC-11 | TC-T005-09 · `derive-ticket-cards.test.ts` |
| AC-12 | TC-T005-10 · `derive-ticket-cards.test.ts` |
| AC-13 | TC-T005-11 · `renew-ticket-set.test.ts` |
| AC-14, AC-15, AC-16 | TC-T005-12 · `renew-ticket-set.test.ts`, `reclaim-player-tickets.test.ts`, `still-held-dialog` (trong `ticket-sheet.test.tsx`) |
| AC-17 | TC-T005-02 (UI non-host) · `renew-ticket-set.test.ts`, `reclaim-player-tickets.test.ts` |
| AC-18 | TC-T005-13 (automated) |
| AC-19 | TC-T005-13 (automated) |
| AC-20 | TC-T005-13 (automated) · `ticket-rules.test.ts` |
| AC-21 | TC-T005-14 · `ticket-sheet.test.tsx` |
| AC-22 | TC-T005-15 · `presence-rules.test.ts`, `use-presence.test.ts` |
| Toast `last_event` | TC-T005-11, TC-T005-12 · `use-room-event-toast.test.ts` |
| Responsive 360/375 | TC-T005-16 |

## 2. Smoke (chạy lại ở các task sau)
TC-T005-01, TC-T005-03, TC-T005-07, TC-T005-11

## 3. Test case

### TC-T005-01 · Sheet "Vé" hiện đủ 16 thẻ theo thứ tự màu, tất cả trống
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1 | chrome |

**Tiền điều kiện:** `reset` + `tickets-basic`; P2 (B) đã đăng nhập.
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Mở `/room`, đợi tên phòng "Phòng chọn vé" | Có nút "Vé" (`ticket-open`) | ui |
| 2 | P2 | Bấm "Vé" | Sheet "Chọn vé" hiện; thoáng skeleton rồi 16 thẻ | ui |
| 3 | P2 | Đọc thứ tự `ticket-card-*` | Đỏ A, Đỏ B, Cam A, Cam B, Vàng, Lục, Ngọc, Lam, Tím, Hồng (A trước B), 4×4 | ui |
| 4 | P2 | Đọc dòng đếm | "Bạn giữ 0/2 vé · 0/16 vé đã có chủ"; mọi thẻ "Trống" kèm hình thu nhỏ | ui |

**Kết quả:** ⬜

---

### TC-T005-02 · Xem trước vé giấy 9×9; non-host không thấy "Tạo bộ vé mới"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-2, AC-17 (UI) | chrome |

**Tiền điều kiện:** như TC-01, sheet đang mở ở P2.
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Chạm thẻ "Đỏ A" | `ticket-preview`: lưới 9×9 đỏ, 3 khối 3 hàng, mỗi hàng đúng 5 ô số (nền trắng chữ đen) | ui |
| 2 | P2 | Đối chiếu 1 hàng với Emulator UI › `rooms/r_tk_basic/tickets/red_a.grid` | Số khớp, ô 0 = ô trống đặc màu đỏ | emulator-ui |
| 3 | P2 | Đọc dòng phụ | "Trống · cặp với vé Đỏ B (Trống)"; nút "Lấy vé này" bật | ui |
| 4 | P2 | Tìm "Tạo bộ vé mới" | Không có (`ticket-renew` không tồn tại) | ui |

**Kết quả:** ⬜

---

### TC-T005-03 · Lấy vé: người lấy thấy "Bạn", người khác thấy tên trong ≤ 1 giây
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | multi-user | AC-3 | chrome |

**Tiền điều kiện:** `tickets-basic`; P2 (B) và P3 (C) cùng mở sheet "Vé".
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Chạm "Đỏ A" → "Lấy vé này" | Thẻ Đỏ A "Bạn" viền đậm; đếm "Bạn giữ 1/2 vé · 1/16 vé đã có chủ"; sheet không đóng | ui |
| 2 | P3 | Quan sát thẻ Đỏ A (không thao tác) | Trong ≤ 1 giây hiện ảnh + "Bình B" | ui |
| 3 | — | Emulator UI › `rooms/r_tk_basic/games/r_tk_basic_g1/players/u_tk_b` | `ticket_ids = ["red_a"]`, có `display_name`, `joined_at` | emulator-ui |

**Kết quả:** ⬜

---

### TC-T005-04 · Giữ 2 vé không cần theo cặp; vé thứ 3 bị khóa
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | boundary | AC-4, AC-5 | chrome |

**Tiền điều kiện:** tiếp TC-03 (B giữ `red_a`).
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Lấy "Hồng B" | "Bạn giữ 2/2 vé" | ui |
| 2 | P2 | Chạm "Cam A" | Nút "Tối đa 2 vé" bị khóa | ui |

**Kết quả:** ⬜

---

### TC-T005-05 · Vé đã có chủ: nút khóa, dòng phụ hiện tên người giữ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | permission | AC-6 | chrome |

**Tiền điều kiện:** tiếp TC-03.
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Chạm "Đỏ A" | Nút "Đã có người lấy" khóa; dòng phụ có "Bình B" | ui |

**Kết quả:** ⬜

---

### TC-T005-06 · Hai người lấy cùng một vé: chỉ một người được
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | multi-user | AC-7 | chrome (+ automated) |

**Tiền điều kiện:** `tickets-basic`; P2 và P3 cùng mở xem trước "Ngọc A".
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2, P3 | Bấm "Lấy vé này" ở hai cửa sổ liên tiếp nhanh nhất | Một bên "Bạn"; bên kia toast "Vé đã có người lấy" và thẻ hiện tên người kia | toast |
| 2 | — | Emulator UI › `players` của ván | Chỉ 1 player có `teal_a` | emulator-ui |

**Kết quả:** ⬜ (đua thật đã phủ bằng `tests/emulator/ticket/take-ticket.test.ts`, 20 vòng, pass)

---

### TC-T005-07 · Bỏ vé: thẻ về "Trống" ở mọi người, doc player còn
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-8 | chrome |

**Tiền điều kiện:** B giữ `red_a` (sau TC-03).
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Chạm "Đỏ A" → "Bỏ vé" | Thẻ về "Trống"; đếm giảm | ui |
| 2 | P3 | Quan sát | Đỏ A "Trống" trong ≤ 1 giây | ui |
| 3 | — | Emulator UI › `players/u_tk_b` | doc còn, `ticket_ids` không còn `red_a` | emulator-ui |

**Kết quả:** ⬜

---

### TC-T005-08 · Ván đang chạy: banner khóa, nút khóa, "Khóa tới hết ván"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | permission | AC-9, AC-10 | chrome |

**Tiền điều kiện:** `reset` + `tickets-running`; P2 (B) đăng nhập, P1 (H) cho bước 4.
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Mở `/room` → "Vé" | Banner "🔒 Ván đang chạy — chỉ lấy/bỏ vé khi ván chờ bắt đầu." | ui |
| 2 | P2 | Chạm thẻ trống bất kỳ | Nút "Ván đang chạy" khóa; chạm "Đỏ A" (của B) không có "Bỏ vé" | ui |
| 3 | P2 | Xem thẻ "Lam B" | "Khóa tới hết ván" (C không còn presence) | ui |
| 4 | P1 | Mở sheet "Vé" | Không có "Tạo bộ vé mới" | ui |

**Kết quả:** ⬜

---

### TC-T005-09 · Vé giữ từ ván trước vẫn hiện "Bạn"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-11 | chrome |

**Tiền điều kiện:** `reset` + `tickets-carry`.
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Mở sheet "Vé" | Thẻ Lục A "Bạn"; "Bạn giữ 1/2 vé" | ui |

**Kết quả:** ⬜

---

### TC-T005-10 · Hết vé trống: thêm dòng nhắc ở dòng đếm
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | boundary | AC-12 | chrome |

**Tiền điều kiện:** `tickets-basic`; dùng Emulator UI thêm player giả (uid bất kỳ) giữ 15 vé, mỗi người ≤ 2 vé; P3 mở sheet.
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Lấy vé trống cuối cùng | — | ui |
| 2 | P3 | Quan sát dòng đếm | "16/16 vé đã có chủ" + "Hết vé trống — chờ người khác bỏ vé ở ván sau" | ui |

**Kết quả:** ⬜

---

### TC-T005-11 · Host tạo bộ vé mới khi không ai giữ vé
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-13 | chrome |

**Tiền điều kiện:** `tickets-basic`; P1 (H), P2 (B) đang ở `/room`; không ai giữ vé.
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | "Vé" → "Tạo bộ vé mới" | Dialog "Tạo bộ vé mới?" "16 vé sẽ được sinh lại cho cả phòng." | ui |
| 2 | P1 | Bấm "Tạo" | Toast "Bộ vé mới đã được tạo"; hình thu nhỏ đổi | toast |
| 3 | P2 | Quan sát | Cũng thấy toast "Bộ vé mới đã được tạo" | toast |
| 4 | — | Emulator UI | `rooms/r_tk_basic.ticket_set_no = 2`, `last_event.type = ticket_set_renewed`; 16 `tickets/*.set_no = 2` | emulator-ui |

**Kết quả:** ⬜

---

### TC-T005-12 · Còn người giữ vé: dialog chặn, thu hồi người offline, rồi tạo được
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | multi-user | AC-14, AC-15, AC-16 | chrome |

**Tiền điều kiện:** `tickets-basic`; B (online) giữ `red_a`, C giữ `blue_b`; đóng cửa sổ C và chờ Emulator UI RTDB `presence/r_tk_basic/u_tk_c.online = false` (≤ 60 giây).
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | "Tạo bộ vé mới" → "Tạo" | Không toast bộ mới; dialog "Chưa tạo được bộ vé mới": B (Online, "Nhắc họ bỏ vé", không có "Thu hồi"), C (Offline, nút "Thu hồi"); `ticket_set_no` không đổi | ui |
| 2 | P1 | Bấm "Thu hồi" ở dòng C | Dòng C biến mất; thẻ Lam B "Trống" | ui |
| 3 | — | Emulator UI | `players/u_tk_c` bị xóa; `last_event.type = tickets_reclaimed`, `target_uid = u_tk_c`; `users/u_tk_c.current_room_id` không đổi | emulator-ui |
| 4 | P2 | Bỏ "Đỏ A"; P1 "Tạo bộ vé mới" → "Tạo" | Thành công, `ticket_set_no = 2` | emulator-ui |

**Kết quả:** ⬜

---

### TC-T005-13 · Action: quyền, ván không `waiting`, mục tiêu sai, non-member
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | security | AC-17, AC-18, AC-19, AC-20 | automated |

`tests/emulator/ticket/{take-ticket,release-ticket,renew-ticket-set,reclaim-player-tickets,ticket-rules}.test.ts` (`NOT_ROOM_HOST`, `GAME_NOT_WAITING`, `TARGET_ONLINE`, `CANNOT_TARGET_SELF`, `PLAYER_NOT_FOUND`, `NOT_ROOM_MEMBER`, rules deny ghi/đọc non-member).

**Kết quả:** ⏭ automated

---

### TC-T005-14 · Lỗi tải vé: "Không tải được bộ vé" + "Thử lại"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | resilience | AC-21 | chrome (+ automated) |

**Tiền điều kiện:** `tickets-basic`; P2 ở `/room`.
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Dừng Firestore emulator (hoặc DevTools Offline) rồi mở sheet "Vé" | "Không tải được bộ vé" + "Thử lại" | ui |
| 2 | P2 | Bật lại emulator, bấm "Thử lại" | 16 thẻ hiện | ui |

**Kết quả:** ⬜ (component test `ticket-sheet.test.tsx` phủ trạng thái lỗi)

---

### TC-T005-15 · Presence: đóng tab → `online = false`, mở lại → `true`
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | resilience | AC-22 | chrome (+ automated rules) |

**Tiền điều kiện:** `tickets-basic`; P2 mở `/room`.
| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | — | Emulator UI › RTDB `presence/r_tk_basic/u_tk_b` | `online = true`, có `display_name` | emulator-ui |
| 2 | P2 | Đóng tab, chờ ≤ 60 giây | `online = false` | emulator-ui |
| 3 | P2 | Mở lại `/room` | `online = true` | emulator-ui |

**Kết quả:** ⬜

---

### TC-T005-16 · Sheet không tràn ngang ở 360px và 375px
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | responsive | NFR-12 | chrome |

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Viewport 360 và 375: mở sheet, danh sách, xem trước vé, dialog #8/#9 | `document.documentElement.scrollWidth <= innerWidth`; vé 9×9 vừa khung (ô co lại nếu cần) | layout |

**Kết quả:** ⬜ (extension khó thu nhỏ dưới ~500px — dùng DevTools device mode)

---

## Từ điển
- **Ưu tiên:** P0 luồng chính · P1 luồng thay thế/lỗi/biên · P2 hiếm gặp, cosmetic.
- **Chạy bằng:** `chrome` · `automated` (đã phủ bằng Vitest) · `manual`.
