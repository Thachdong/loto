---
task: T-003
title: Trang chủ & tạo phòng (SCR-02)
written_from_commit: 8669d1a
last_run: 2026-11-21 16:55
summary: "P0 4/4 · P1 6/6 (+3 automated) · P2 1/2 (1 skip)"
---

# Test case QC · T-003 Trang chủ & tạo phòng (SCR-02)

## 0. Môi trường chung
- Lệnh: `npm run emulators` (nền) · `npm run dev` (nền) · `npm run seed -- reset && npm run seed -- t003`
- URL: `http://localhost:3000` · Emulator UI: `http://localhost:4000`
- Viewport: 375×812 (trừ khi case ghi khác).
- Đăng nhập: như T-002 — extension không điều khiển được popup ⇒ mở `http://localhost:3000/login?__ua=<UA Chrome Android, encodeURIComponent>` để chạy luồng **redirect** trong cùng tab, chọn tài khoản ở màn Auth emulator (cần quyền extension cho `localhost:9099`). UA mẫu: `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36`.
- Profile (mỗi profile một cửa sổ Chrome, cookie tách biệt; chỉ có 1 cửa sổ ⇒ chạy lần lượt, giữa hai profile "Clear site data" cho `localhost:3000` như T-002):
  - P1 = `an@example.com` (seed `u_an`, "An Nguyễn", không ở phòng). Dùng 2 tab A1, A2 khi TC ghi.
  - P2 = `cuc@example.com` (seed `u_cuc`, "Cúc", host phòng `r_old` "Phòng của Cúc", `join_code = CUC234`, `invite_code = cucOldRoomInvite000001`, ván 1 `waiting`, còn 8 giờ).
  - P3 = `giang@example.com` "Giang" — **không seed**, tạo bằng "Add new account" ở màn Auth emulator.
- Chữ (vi.ts):
  - Header: logo "LÔ TÔ" · menu "Đăng xuất".
  - Trang chủ: "Xin chào, {tên}" · "Tạo phòng mới" · placeholder "Phòng của {tên}" · bộ đếm "{n}/50" · lỗi "Tên phòng từ 1 đến 50 ký tự" · nút "Tạo phòng" / "Đang tạo phòng…" · toast "Không tạo được phòng, thử lại" / "Bạn đang ở phòng {tên}" · card "Vào phòng" + "Muốn vào phòng bạn bè? Mở link mời bạn nhận được." · card "Bạn đang ở phòng" + "Ván {n} · {trạng thái} · {m} người" + nút "Về phòng" · banner "Mất kết nối – đang thử lại…".
  - Banner lý do: "Phòng "{tên}" đã hết hạn." · "Bạn không còn ở trong phòng." · nút ✕ (aria "Đóng").
  - `/room`: "Ván {n} · {trạng thái}" · "{m} người" · "Mã phòng" · "Link mời" · "Copy link" · toast "Đã copy link".
  - Trạng thái ván: `waiting` "Chờ bắt đầu".
- `data-testid`: `account-logo`, `account-avatar`, `account-menu`, `sign-out-item`, `home-greeting`, `home-skeleton`, `home-offline-banner`, `room-name-input`, `room-name-counter`, `room-name-error`, `create-room-button`, `join-hint-card`, `current-room-card`, `current-room-name`, `current-room-summary`, `back-to-room-button`, `leave-reason-banner`, `leave-reason-dismiss`, `room-name`, `room-game-line`, `room-members`, `room-code`, `room-invite-link`, `room-copy-link`, `room-skeleton`.

## 1. Ma trận phủ
| Nguồn | TC |
|---|---|
| AC-1 | TC-T003-01 · `home-screen.test.tsx` |
| AC-2 | TC-T003-02 · `tests/emulator/room/create-room.test.ts`, `create-room-form.test.tsx` |
| AC-3 | TC-T003-02 bước 5–7 · `create-room.test.ts` |
| AC-4 | TC-T003-02 bước 6 · `create-room.test.ts`, `generate-ticket-set.test.ts` |
| AC-5 | TC-T003-13 (automated) |
| AC-6 | TC-T003-06 · `create-room.test.ts`, `room-name.test.ts` |
| AC-7 | TC-T003-05 · `create-room.test.ts`, `create-room-form.test.tsx` |
| AC-8 | TC-T003-14 (automated) |
| AC-9 | TC-T003-14 (automated) |
| AC-10 | TC-T003-03 |
| AC-11 | TC-T003-07 |
| AC-12 | TC-T003-09 · `home-screen.test.tsx`, `leave-reason.test.ts` |
| AC-13 | TC-T003-09 bước 4 · `room-lobby.test.tsx` |
| AC-14 | TC-T003-04 · `tests/emulator/auth/delete-current-session.test.ts` |
| AC-15 | TC-T003-15 (automated) |
| AC-16 | TC-T003-08 · `account-header.test.tsx`, `delete-current-session.test.ts` |
| AC-17 | TC-T003-15 (automated) |
| AC-18 | TC-T003-02 bước 7 · `create-room.test.ts` |
| AC-19 | TC-T003-13 (automated) |
| AC-20 | TC-T003-15 (automated) |
| AC-21 | TC-T003-10 · `create-room.test.ts` |
| AC-22 (plan) | TC-T003-14 (automated) |
| FLOW-02 bước 1–7 | TC-T003-02 |
| FLOW-02 E1 | TC-T003-14 (automated) |
| FLOW-01 bước 6–8 | TC-T003-03, TC-T003-01 |
| BR-02 | TC-T003-14 (automated), TC-T003-07 |
| BR-04 (lazy expiry) | TC-T003-14 (automated) |
| BR-30 (`join_code`) | TC-T003-02 bước 3, 5 · TC-T003-13 |
| SCR-02 trạng thái Loading/Error | TC-T003-15 (automated) |
| SCR-02 "Vừa rời phòng" | TC-T003-09 |
| Copy link mời | TC-T003-12 |
| NFR-12 responsive | TC-T003-11 |

## 2. Smoke (chạy lại ở các task sau)
TC-T003-01, TC-T003-02, TC-T003-03

## 3. Test case

### TC-T003-01 · Người chưa ở phòng thấy trang chủ trống với form tạo phòng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, FLOW-01 b8 | chrome |

**Tiền điều kiện:** seed `reset` + `t003`; P1 chưa đăng nhập.
**Dữ liệu:** P1 `an@example.com`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập `an@example.com` (luồng redirect, mục 0) | URL thành `http://localhost:3000/` | url |
| 2 | P1 | Quan sát header | Trái: "LÔ TÔ" (`account-logo`); phải: avatar chữ "A" (`account-avatar`) | ui |
| 3 | P1 | Quan sát nội dung | "Xin chào, An Nguyễn" (`home-greeting`); tiêu đề "Tạo phòng mới"; ô `room-name-input` placeholder "Phòng của An Nguyễn"; `room-name-counter` = "0/50"; nút "Tạo phòng" bật | ui |
| 4 | P1 | Quan sát card dưới | Card `join-hint-card`: "Vào phòng" + "Muốn vào phòng bạn bè? Mở link mời bạn nhận được."; không có nút trong card; không có `current-room-card` | ui |
| 5 | P1 | DevTools Console | Không có lỗi đỏ (bỏ qua cảnh báo emulator) | console |

**Kết quả:** ✅ PASS · header "LÔ TÔ" + avatar "A", lời chào, placeholder "Phòng của An Nguyễn", "0/50", card "Vào phòng" không có nút, console sạch · 2026-11-21
**Smoke 2026-11-21 (khi làm T-004):** ✅ PASS · header + lời chào, placeholder, "0/50", nút "Tạo phòng"; card "Vào phòng" giờ có nút "Vào phòng" (đổi theo T-004, đúng ý)

---

### TC-T003-02 · Tạo phòng có tên thì vào trang phòng và dữ liệu phòng đủ field
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-2, AC-3, AC-4, AC-18, FLOW-02 b1–7, BR-30 | chrome |

**Tiền điều kiện:** như TC-T003-01, P1 đang ở `/` (chưa ở phòng).
**Dữ liệu:** tên phòng "Lô tô Tết".

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Gõ "Lô tô Tết" vào `room-name-input` | Bộ đếm "9/50" | ui |
| 2 | P1 | Bấm "Tạo phòng" | Ngay sau khi bấm nút bị khóa / hiện "Đang tạo phòng…" (chụp ảnh ngay sau click) | ui |
| 3 | P1 | Chờ điều hướng | URL `http://localhost:3000/room`; `room-name` = "Lô tô Tết"; `room-game-line` = "Ván 1 · Chờ bắt đầu"; `room-members` = "1 người"; `room-code` là 6 ký tự khớp `^[A-HJ-NP-Z2-9]{6}$` | url, ui |
| 4 | P1 | Quan sát "Link mời" | `room-invite-link` = `http://localhost:3000/join/` + 22 ký tự `[0-9A-Za-z]`; có nút "Copy link" (`room-copy-link`) | ui |
| 5 | P1 | Emulator UI › Firestore › `users/u_an` | `current_room_id` = id phòng mới (ghi lại `{rid}`) | emulator-ui |
| 6 | P1 | Emulator UI › Firestore › `rooms/{rid}` | `name = "Lô tô Tết"`, `host_uid = created_by = "u_an"`, `status = "active"`, `member_count = 1`, `blocked_uids = []`, `invite_code` 22 ký tự (khớp link bước 4), `join_code` = mã ở bước 3, `expires_at = invite_expires_at = created_at + 8h`, `draw_interval_sec = 5`, `called_numbers = []`, `game_count = 1`, `ticket_set_no = 1`, `last_event = null` | emulator-ui |
| 7 | P1 | `rooms/{rid}/games/{current_game_id}` và `rooms/{rid}/tickets` | Ván: `seq_no = 1`, `status = "waiting"`, `claims = []`, `winners = []`, `player_count = 0`, `resume_status = null`. `tickets` có đúng 16 doc `red_a, red_b, orange_a … pink_b`, mỗi doc `set_no = 1`, `grid` 81 phần tử. Phòng, ván, mọi vé đều có `expire_at = created_at + 31 ngày` | emulator-ui |
| 8 | P1 | Emulator UI › Realtime Database | `presence_access/{rid}/u_an = true` | emulator-ui |

**Kết quả:** ✅ PASS · nút "Đang tạo phòng…" + disabled ngay sau click; `/room`: "Lô tô Tết", "Ván 1 · Chờ bắt đầu", "1 người", mã `B7QMYY`, link 22 ký tự; Firestore: room đủ field (expires = created + 8h, invite_expires = expires), ván `waiting` `claims=[]` `resume_status=null`, 16 vé `set_no=1` grid 81, mọi `expire_at` = created + 31 ngày; RTDB `presence_access/<rid>/u_an = true` · 2026-11-21
**Smoke 2026-11-21 (khi làm T-004):** ✅ PASS · tạo "Lô tô Tết" → `/room` "Ván 1 · Chờ bắt đầu", "1 người", mã `GRFLYR`, link 22 ký tự; Firestore room/ván/vé đủ field, expires = +8h, expire_at = +31 ngày

---

### TC-T003-03 · Người đang ở phòng mở app thì vào thẳng phòng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-10, FLOW-01 b6 | chrome |

**Tiền điều kiện:** seed `reset` + `t003`; P2 chưa đăng nhập.
**Dữ liệu:** P2 `cuc@example.com` (host `r_old`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập `cuc@example.com` | URL cuối `http://localhost:3000/room` | url |
| 2 | P2 | Quan sát | `room-name` = "Phòng của Cúc"; "Ván 1 · Chờ bắt đầu"; "1 người"; `room-code` = "CUC234"; `room-invite-link` = `http://localhost:3000/join/cucOldRoomInvite000001` | ui |
| 3 | P2 | Mở `http://localhost:3000/` | Bị chuyển ngay về `/room` (không thấy form tạo phòng) | url |

**Kết quả:** ✅ PASS · đăng nhập Cúc → `/room` "Phòng của Cúc", `CUC234`, link `/join/cucOldRoomInvite000001`; mở `/` bị chuyển `/room` · 2026-11-21
**Smoke 2026-11-21 (khi làm T-004):** ✅ PASS · Cúc → `/room` "Phòng của Cúc", `CUC234`; mở `/` → `/room`

---

### TC-T003-04 · Người không ở phòng đăng xuất thì về màn đăng nhập và mất phiên
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-14, AC-21, SCR-02.A3 | chrome |

**Tiền điều kiện:** seed `t003`; P3 chưa có tài khoản.
**Dữ liệu:** P3 tạo "Add new account" email `giang@example.com`, tên "Giang".

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Đăng nhập, tạo tài khoản mới `giang@example.com` / "Giang" | URL `/`; "Xin chào, Giang" | url, ui |
| 2 | P3 | Bấm avatar (`account-avatar`) | Menu `account-menu` mở, có "Đăng xuất" (`sign-out-item`); không có "Hồ sơ cá nhân" | ui |
| 3 | P3 | Bấm "Đăng xuất" | URL thành `/login`; nút "Đăng nhập với Google" hiện | url, ui |
| 4 | P3 | DevTools › Application › Cookies `localhost:3000` | Không còn cookie `__session` | cookie |
| 5 | P3 | Mở `http://localhost:3000/` rồi `http://localhost:3000/room` | Cả hai bị chuyển `/login` | url |

**Kết quả:** ✅ PASS · Giang (tài khoản mới) có "Đăng xuất", không có "Hồ sơ cá nhân"; đăng xuất → `/login`; `/` và `/room` → `/login`. Bước 4: tool chặn đọc cookie — xóa cookie + revoke đã kiểm ở `delete-current-session.test.ts`, server không còn nhận phiên · 2026-11-21

---

### TC-T003-05 · Ô tên phòng dừng ở 50 ký tự (kể cả ký tự Unicode)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | boundary | AC-7, TBL-02 `name` 1–50 | chrome |

**Tiền điều kiện:** P1 đăng nhập, không ở phòng (seed `reset` + `t003`), ở `/`.
**Dữ liệu:** chuỗi 60 ký tự `ABCDEFGHIJ` × 6; chuỗi 49 chữ "a" + "🎉🎉".

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Dán chuỗi 60 ký tự vào `room-name-input` | Ô giữ 50 ký tự đầu; bộ đếm "50/50" | ui |
| 2 | P1 | Gõ thêm "X" | Ô không đổi, vẫn "50/50" | ui |
| 3 | P1 | Xóa hết, dán 49 chữ "a" + "🎉🎉" | Ô giữ 49 "a" + 1 "🎉"; bộ đếm "50/50" (emoji tính 1 ký tự) | ui |
| 4 | P1 | Không bấm Tạo phòng; xóa ô | Bộ đếm "0/50" | ui |

**Kết quả:** ✅ PASS · dán 60 ký tự → giữ 50, "50/50"; gõ thêm không đổi; 49 "a" + "🎉🎉" → giữ 49 "a" + 1 "🎉", "50/50"; xóa → "0/50" · 2026-11-21

---

### TC-T003-06 · Để trống hoặc chỉ nhập dấu cách thì phòng lấy tên mặc định
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-6, FLOW-02 b1 | chrome |

**Tiền điều kiện:** seed `reset` + `t003`; P1 đăng nhập, ở `/`.
**Dữ liệu:** ô tên = "   " (3 dấu cách).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Gõ 3 dấu cách vào ô tên, bấm "Tạo phòng" | Không có lỗi `room-name-error`; URL thành `/room` | ui, url |
| 2 | P1 | Quan sát | `room-name` = "Phòng của An Nguyễn" | ui |
| 3 | P1 | Emulator UI › `rooms/{rid}` | `name = "Phòng của An Nguyễn"` | emulator-ui |

**Kết quả:** ✅ PASS · 3 dấu cách → không lỗi, `/room` "Phòng của An Nguyễn"; Firestore `name` khớp · 2026-11-21

---

### TC-T003-07 · Tab khác của cùng người tự chuyển sang card "Bạn đang ở phòng"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | multi-user | AC-11, SCR-02.A0, SCR-02.A2, BR-02 | chrome |

**Tiền điều kiện:** seed `reset` + `t003`; P1 đăng nhập; mở 2 tab A1, A2 đều ở `http://localhost:3000/` thấy form tạo phòng.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 / A1 | Gõ "Lô tô Tết", bấm "Tạo phòng" | A1 tới `/room` "Lô tô Tết" | url, ui |
| 2 | P1 / A2 | Chuyển sang A2, **không tải lại** | Trong ≤ 1 giây form biến mất; hiện `current-room-card`: "Bạn đang ở phòng", `current-room-name` = "Lô tô Tết", `current-room-summary` = "Ván 1 · Chờ bắt đầu · 1 người", nút "Về phòng"; card `join-hint-card` biến mất | ui |
| 3 | P1 / A2 | Bấm "Về phòng" | URL `/room`, `room-name` = "Lô tô Tết" | url, ui |

**Kết quả:** ✅ PASS · A2 (không tải lại) đổi sang card "Bạn đang ở phòng" "Lô tô Tết" "Ván 1 · Chờ bắt đầu · 1 người", card "Vào phòng" ẩn; "Về phòng" → `/room` · 2026-11-21

---

### TC-T003-08 · Người đang ở phòng không thấy mục "Đăng xuất"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | permission | AC-16 | chrome |

**Tiền điều kiện:** tiếp TC-T003-07 (P1 ở phòng "Lô tô Tết"); hoặc seed `reset` + `t003`, P1 tạo một phòng rồi mở tab A2 ở `/` **trước khi** tạo (để card 9 hiện).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 / A2 | Ở trạng thái card "Bạn đang ở phòng" trên `/` (chưa tải lại), bấm avatar | Menu mở; **không** có `sign-out-item` / chữ "Đăng xuất" | ui |
| 2 | P1 | Emulator UI › `users/u_an` | `current_room_id` vẫn là phòng hiện tại | emulator-ui |

**Kết quả:** ✅ PASS · menu chỉ có tên "An Nguyễn", không có "Đăng xuất" · 2026-11-21

---

### TC-T003-09 · Phòng đóng do hết hạn thì trang chủ hiện banner lý do và trang phòng tự về trang chủ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-12, AC-13, SCR-02 "Vừa rời phòng" | chrome |

**Tiền điều kiện:** seed `reset` + `t003`; P1 đăng nhập; tab A2 mở `/` trước; tab A1 tạo phòng "Lô tô Tết" (A1 ở `/room`, A2 hiện card 9 như TC-T003-07 bước 2). Ghi `{rid}`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Emulator UI › `rooms/{rid}`: sửa `expires_at` về 1 giờ trước, `status = "closed"`, `close_reason = "expired"` | (lưu thành công) | emulator-ui |
| 2 | P1 | Emulator UI › `users/u_an`: sửa `current_room_id = null` | (lưu thành công) | emulator-ui |
| 3 | P1 / A2 | Quan sát A2, không tải lại | Card 9 biến mất, form tạo phòng hiện lại; `leave-reason-banner` = "Phòng "Lô tô Tết" đã hết hạn." | ui |
| 4 | P1 / A1 | Quan sát A1 | URL tự thành `/`; có `leave-reason-banner` (chữ "Phòng "Lô tô Tết" đã hết hạn." hoặc "Bạn không còn ở trong phòng." nếu rules đã chặn đọc phòng trước khi snapshot cuối tới) | url, ui |
| 5 | P1 / A2 | Bấm ✕ (`leave-reason-dismiss`) | Banner ẩn | ui |
| 6 | P1 / A2 | Tải lại trang | Không có banner | ui |

**Kết quả:** ✅ PASS (lần 2) · A2: card biến mất, form hiện lại, banner "Phòng "Lô tô Tết" đã hết hạn."; A1 `/room` → `/` cùng banner; ✕ ẩn banner; tải lại không còn banner. Lần 1 FAIL bước 4: A1 (tab nền) hiện "Bạn không còn ở trong phòng." vì snapshot phòng `closed` và `current_room_id = null` tới cùng lượt render, listener phòng đổi path trước khi lưu snapshot cuối → fix `4e03889` · 2026-11-21

---

### TC-T003-10 · Không có phiên thì trang chủ và trang phòng chuyển về đăng nhập
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | permission | AC-21, SCR-02 "Không có quyền" | chrome |

**Tiền điều kiện:** Clear site data cho `localhost:3000` (không cookie `__session`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `http://localhost:3000/` | URL `/login` | url |
| 2 | P1 | Mở `http://localhost:3000/room` | URL `/login` | url |

**Kết quả:** ✅ PASS · sau đăng xuất (TC-04) không còn phiên: `/` và `/room` → `/login` · 2026-11-21

---

### TC-T003-11 · Trang chủ và trang phòng không tràn ngang ở 360px và 375px
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | responsive | NFR-12 | chrome |

**Tiền điều kiện:** P1 đăng nhập, không ở phòng (seed `reset` + `t003`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Viewport 360×740, mở `/`, dán 50 ký tự vào ô tên | `document.documentElement.scrollWidth <= 360`; nút "Tạo phòng" cao ≥ 44px | layout |
| 2 | P1 | Viewport 375×812, kiểm như bước 1 | `scrollWidth <= 375` | layout |
| 3 | P1 | Tạo phòng tên 50 ký tự, ở `/room` với viewport 360 | `scrollWidth <= 360`; link mời xuống dòng/cắt, không đẩy tràn; nút "Copy link" cao ≥ 44px | layout |

**Kết quả:** ⏭ SKIP: cửa sổ Chrome (extension) không thu nhỏ dưới 500px nên không đặt được 360/375px; ở 500px không tràn ngang. Cần dev kiểm bằng DevTools device mode

---

### TC-T003-12 · Host copy link mời thì thấy toast đã copy
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | alt | Task UI `/room` (Copy link) | chrome |

**Tiền điều kiện:** P2 `cuc@example.com` ở `/room` (seed `t003`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Bấm "Copy link" | Toast "Đã copy link" (hoặc "Không copy được, hãy chọn và copy link" nếu trình duyệt chặn clipboard — ghi lại) | toast |
| 2 | P2 | `await navigator.clipboard.readText()` (nếu được phép) | = `http://localhost:3000/join/cucOldRoomInvite000001` | console |

**Kết quả:** ✅ PASS · toast "Đã copy link"; clipboard = `http://localhost:3000/join/cucOldRoomInvite000001` · 2026-11-21

---

### TC-T003-13 · Bộ vé và mã ngẫu nhiên đúng bất biến (tự động)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | boundary | AC-5, AC-19, BR-08, BR-30, ADR-14 | automated |

- `src/features/room/shared/domain/generate-ticket-set.test.ts` — 10.000 bộ: 16 id, 81 ô, 5 số/hàng, khoảng cột, tăng dần trong cột, cặp gộp = 1..90, 45 số/vé; `seededRng(42)` ổn định.
- `src/core/server/random.test.ts`, `src/features/room/shared/domain/random-code.test.ts` — 10.000 `invite_code` khớp `^[0-9A-Za-z]{22}$` + 10.000 `join_code` khớp `^[A-HJ-NP-Z2-9]{6}$`, spy `crypto.randomInt`, không gọi `Math.random`.

**Kết quả:** ⏭ automated — `npm test` pass (generate-ticket-set, random, random-code)

---

### TC-T003-14 · createRoom chặn người đang ở phòng, đóng phòng quá hạn, không trùng mã phòng (tự động)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-8, AC-9, AC-22, FLOW-02 E1, BR-02, BR-04 | automated |

- `tests/emulator/room/create-room.test.ts` — `ALREADY_IN_ROOM` + `details[0].currentRoomId`, số room không đổi; phòng cũ quá hạn + ván `waiting` → `closed`/`expired`, ván `cancelled`, thành viên khác `current_room_id = null`, phòng mới tạo được; `join_code` trùng phòng `active`/`closing` → sinh lại, trùng phòng `closed` → dùng được, 5 lần trùng → `INTERNAL_ERROR`.
- `tests/emulator/room/room-expiry.test.ts` — `applyLazyExpiry` chưa tới hạn / `waiting` / `running|paused|awaiting_confirm` → `closing`.
- `src/features/room/client/components/home-screen.test.tsx` — toast "Bạn đang ở phòng {tên}" + card 9 khi `ALREADY_IN_ROOM` (AC-8 phía UI).

**Kết quả:** ⏭ automated — `npm test` pass (create-room, room-expiry, home-screen)

---

### TC-T003-15 · Phiên bị thu hồi, rules phòng, trạng thái loading/lỗi (tự động)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | security | AC-15, AC-17, AC-20 | automated |

- `tests/emulator/auth/delete-current-session.test.ts` — cookie cũ sau đăng xuất → `UNAUTHENTICATED` (AC-15); đang ở phòng → lỗi, dữ liệu không đổi (AC-16).
- `tests/emulator/room/rooms-rules.test.ts` — thành viên đọc `rooms/X`, `tickets/red_a`, `games/{gid}`; người ngoài / chưa auth bị từ chối; mọi ghi bị từ chối; RTDB `presence_access` cấm client (AC-17).
- `src/features/room/client/components/home-screen.test.tsx` — skeleton `home-skeleton` trước snapshot đầu; banner "Mất kết nối – đang thử lại…" khi listener lỗi, nút "Tạo phòng" vẫn bấm được (AC-20).

**Kết quả:** ⏭ automated — `npm test` pass (delete-current-session, rooms-rules, home-screen)

---

## Từ điển
- **Ưu tiên:** P0 luồng chính, phải pass để đóng task (luôn nằm trong smoke) · P1 luồng thay thế/lỗi/biên quan trọng · P2 hiếm gặp, cosmetic.
- **Loại:** `happy` · `alt` (luồng A*) · `error` (luồng E*) · `boundary` (biên BR) · `permission` (host/player/người ngoài) · `multi-user` · `resilience` (mất mạng, reload, tab ẩn) · `responsive` · `security`.
- **Chạy bằng:** `chrome` (chrome-tester chạy) · `automated` (đã phủ bằng Vitest, ghi đường dẫn test, chrome-tester bỏ qua) · `manual` (cần thiết bị thật, VD Safari iOS, Zalo thật).
- **Cách kiểm:** `url` · `ui` (chữ/phần tử hiển thị, dùng chữ trong vi.ts hoặc `data-testid`) · `toast` · `emulator-ui` (dữ liệu Firestore/RTDB/Auth) · `cookie` · `console` (không có lỗi) · `network` · `layout` (không tràn ngang, kích thước).
