---
task: T-004
title: Lời mời & vào phòng (SCR-03)
written_from_commit: 873450a
last_run: 2026-11-21 17:25
summary: "P0 4/4 · P1 8/8 (+2 automated) · P2 2/3 (1 skip)"
---

# Test case QC · T-004 Lời mời & vào phòng (SCR-03)

## 0. Môi trường chung
- Lệnh: `npm run emulators` (nền) · `npm run dev` (nền) · `npm run seed -- reset && npm run seed -- t004` (script in 5 URL `/join/…`).
- URL: `http://localhost:3000` · Emulator UI: `http://localhost:4000`
- Viewport: 375×812 (trừ khi case ghi khác).
- Đăng nhập: như T-002/T-003 — extension không điều khiển được popup ⇒ mở `http://localhost:3000/login?__ua=<UA Chrome Android, encodeURIComponent>` để chạy luồng **redirect** trong cùng tab (cần quyền extension cho `localhost:9099`). Với link mời: `http://localhost:3000/join/{code}` → bấm "Đăng nhập để vào phòng" → trang `/login?returnTo=/join/{code}`; để dùng luồng redirect thêm `&__ua=<UA>` vào URL `/login` đó. UA mẫu: `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36`.
- Profile (chỉ có 1 cửa sổ Chrome ⇒ chạy lần lượt; giữa hai profile "Clear site data" cho `localhost:3000` như T-002; dùng 2 tab khi TC cần host + khách cùng lúc — hai tab chia sẻ cookie nên host xem qua REST/Emulator UI hoặc tab chạy trước khi đổi người):
  - P1 = `host@example.com` (seed `u_host`, "An Nguyễn", host `r_ok` "Lô tô Tết nhà Ngoại", 1 người).
  - P2 = khách chưa đăng nhập; sau đó tạo `binh@example.com` tên "Bình" bằng "Add new account".
  - P3 = lần lượt `khoa@example.com` (bị chặn ở `r_block`), `lan@example.com` (đang ở `r_other` "Phòng của Lan"), `minh@example.com` (chưa ở phòng).
- Dữ liệu seed `t004` (mã mời 22 ký tự · mã phòng):
  - `r_ok` "Lô tô Tết nhà Ngoại" · `OKOKOKOKOKOKOKOKOKOKOK` · `TET234` — còn hạn, 1 người.
  - `r_late` · `LATELATELATELATELATE00` · `LATE22` — `active` nhưng đã quá hạn 1 phút, ván `waiting`.
  - `r_closed` · `CLOSEDCLOSEDCLOSED0000` · `CLSD22` — `closed`.
  - `r_full` · `FULLFULLFULLFULLFULL00` · `FULL22` — `member_count = 16`.
  - `r_block` · `BLOCKBLOCKBLOCKBLOCK00` · `BLCK22` — `blocked_uids = [u_khoa]`.
  - `r_other` "Phòng của Lan" · `LANOTHERROOMINVITE0000` · `LAN234` — host `u_lan`.
- Chữ (vi.ts):
  - Trang mời: "{host} mời bạn chơi lô tô" · "Link hết hạn lúc HH:mm" (khác ngày: "HH:mm dd/MM") · nút "Vào phòng" / "Đang vào phòng…" / "Đăng nhập để vào phòng" · toast "Không vào được phòng, thử lại".
  - Khung lỗi: "Link không còn hiệu lực" · "Phòng đã đầy" · "Bạn không thể vào phòng này" · "Không tải được lời mời" + "Thử lại" · nút "Về trang chủ".
  - Dialog đang ở phòng khác: "Bạn đang ở "{tên}". Mỗi người chỉ ở 1 phòng — hãy rời phòng đó trước." · "Đóng" · "Về phòng hiện tại".
  - Trang chủ: card "Vào phòng" + "Có mã phòng 6 ký tự từ bạn bè? Hoặc mở link mời bạn nhận được." · nút "Vào phòng" · dialog "Nhập mã phòng" · nút "Vào" / "Đang vào…" · lỗi "Mã phòng không đúng hoặc đã hết hạn" / "Phòng đã đầy" / "Bạn không thể vào phòng này" · toast "Bạn đang ở phòng {tên}".
  - `/room`: "Mã phòng" · "Link mời" · "Copy link" / toast "Đã copy link" · "Copy mã" / toast "Đã copy mã phòng".
- `data-testid`: `join-logo`, `join-skeleton`, `join-host-avatar`, `join-title`, `join-room-name`, `join-expires`, `join-primary-button`, `join-error` (`data-variant` = `invalid`/`full`/`blocked`/`load`), `join-error-title`, `join-error-home`, `join-error-retry`, `join-other-room-dialog`, `join-other-room-body`, `join-other-room-go`, `join-other-room-close`, `join-hint-card`, `join-room-open-button`, `join-code-dialog`, `join-code-input`, `join-code-error`, `join-code-submit`, `room-copy-link`, `room-copy-code`, `room-code`, `room-members`, `room-name`, `login-invite-banner`.

## 1. Ma trận phủ
| Nguồn | TC |
|---|---|
| AC-1 | TC-T004-02 · `join-screen.test.tsx`, `tests/emulator/invite/get-invite.test.ts` |
| AC-2 | TC-T004-03 bước 1–3 |
| AC-3 | TC-T004-03 bước 4–5 · `join-room.test.ts`, `join-screen.test.tsx` |
| AC-4 | TC-T004-03 bước 6 · `join-room.test.ts` |
| AC-5 | TC-T004-03 bước 7 |
| AC-6 | TC-T004-04 · `join-room.test.ts` |
| AC-7 | TC-T004-05 · `join-room.test.ts` (đóng lười) |
| AC-8 | TC-T004-05 · `get-invite.test.ts`, `join-room.test.ts` |
| AC-9 | TC-T004-05 · `get-invite.test.ts`, `join-error.test.tsx` |
| AC-10 | TC-T004-06 · `join-room.test.ts` |
| AC-11 | TC-T004-07 · `in-other-room-dialog.test.tsx`, `join-room.test.ts` |
| AC-12 | TC-T004-15 (automated) |
| AC-13 | TC-T004-08 · `join-room.test.ts` |
| AC-14 | TC-T004-15 (automated) |
| AC-15 | TC-T004-09 · `join-room.test.ts` |
| AC-16 | TC-T004-12 · `metadata.test.ts` |
| AC-17 | TC-T004-14 |
| AC-18 | TC-T004-15 (automated) |
| AC-19 | TC-T004-15 (automated) |
| AC-20 | TC-T004-13 |
| AC-21 | TC-T004-16 (automated) |
| AC-22 (plan) | TC-T004-10 · `join-room.test.ts` |
| AC-23 (plan) | TC-T004-11 · `join-room.test.ts` |
| AC-24 (plan) | TC-T004-10, TC-T004-11 · `join-room-card.test.tsx` |
| AC-25 (plan) | TC-T004-01 · `room-lobby.test.tsx` |
| AC-26 (plan) | TC-T004-11 · `join-room.test.ts` |
| FLOW-03 bước 4–13 | TC-T004-02, 03 |
| FLOW-03 A1 | TC-T004-04 |
| FLOW-03 A2 | TC-T004-09 |
| FLOW-03 E1 | TC-T004-05 |
| FLOW-03 E2 | TC-T004-06 |
| FLOW-03 E3 | TC-T004-07 |
| FLOW-03 E4 | TC-T004-08 |
| FLOW-03 E5 | TC-T004-13 |
| BR-30 (mã phòng) | TC-T004-10, 11 |
| BR-03 (16 người) | TC-T004-08, 15 |
| NFR-04 (SSR) | TC-T004-14 |
| NFR-12 responsive | TC-T004-17 |

## 2. Smoke (chạy lại ở các task sau)
TC-T004-02, TC-T004-03, TC-T004-10

## 3. Test case

### TC-T004-01 · Host copy link mời và mã phòng ở trang phòng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | Demo bước 1, AC-25 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; P1 chưa đăng nhập.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập `host@example.com` | URL `/room`; `room-name` = "Lô tô Tết nhà Ngoại"; `room-members` = "1 người"; `room-code` = "TET234" | url, ui |
| 2 | P1 | Quan sát | `room-invite-link` = `http://localhost:3000/join/OKOKOKOKOKOKOKOKOKOKOK`; có nút "Copy link" và "Copy mã" | ui |
| 3 | P1 | Bấm "Copy link"; đọc `navigator.clipboard.readText()` | Toast "Đã copy link"; clipboard = link ở bước 2 | toast, console |
| 4 | P1 | Bấm "Copy mã"; đọc clipboard | Toast "Đã copy mã phòng"; clipboard = `TET234` | toast, console |

**Kết quả:** ✅ PASS · host `/room`: "Lô tô Tết nhà Ngoại", "1 người", `TET234`, link `/join/OKOK…`; "Copy link" → toast "Đã copy link", clipboard = link; "Copy mã" → toast "Đã copy mã phòng", clipboard = `TET234` · 2026-11-21

---

### TC-T004-02 · Khách chưa đăng nhập xem lời mời hợp lệ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, FLOW-03 b4–5 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; Clear site data (không có cookie `__session`).
**Dữ liệu:** `http://localhost:3000/join/OKOKOKOKOKOKOKOKOKOKOK`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Mở link `r_ok` | URL giữ nguyên `/join/OKOK…`; header chỉ có logo (không avatar) | url, ui |
| 2 | P2 | Đọc nội dung | `join-host-avatar` chữ "A" (host không có ảnh); `join-title` = "An Nguyễn mời bạn chơi lô tô"; `join-room-name` = "Lô tô Tết nhà Ngoại"; `join-expires` = "Link hết hạn lúc HH:mm" khớp `invite_expires_at` của `rooms/r_ok` (đổi sang GMT+7 từ Emulator UI) | ui, emulator-ui |
| 3 | P2 | Tìm số người | Không có chữ "1 người" / "người" nào trên trang | ui |
| 4 | P2 | Đọc nút chính | `join-primary-button` = "Đăng nhập để vào phòng" | ui |
| 5 | P2 | Console | Không có lỗi đỏ | console |

**Kết quả:** ✅ PASS (lần 2) · logo "LÔ TÔ" không avatar, ảnh host chữ "A", "An Nguyễn mời bạn chơi lô tô", "Lô tô Tết nhà Ngoại", "Link hết hạn lúc 01:02 22/11" (khớp `invite_expires_at` 18:02Z = 01:02 22/11 GMT+7), không có chữ "người", nút "Đăng nhập để vào phòng". Lần 1 console có lỗi đỏ `blocking-prerender-random` (`crypto.randomBytes` trong `generateMetadata` → `findRoomByInviteCode`, truy vấn Firestore chạy trước `connection()`) → fix `b876b91`, console sạch · 2026-11-21

---

### TC-T004-03 · Khách đăng nhập từ link mời rồi vào phòng, host thấy "2 người"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | multi-user | AC-2, AC-3, AC-4, AC-5, FLOW-03 b6–13, SUP-05 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`. Tab A1 đăng nhập P1 (`host@example.com`) ở `/room` trước. Hai tab Chrome chia sẻ cookie: khi tab A2 đăng nhập Bình, **không tải lại A1** (listener realtime của A1 dùng phiên Firebase Auth cũ trong IndexedDB cùng origin — nếu bước 7 không quan sát được vì phiên bị ghi đè, kiểm `rooms/r_ok.member_count = 2` trên Emulator UI và ghi chú trong kết quả).
**Dữ liệu:** tài khoản mới `binh@example.com` tên "Bình".

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Mở link `r_ok`, bấm "Đăng nhập để vào phòng" | URL `/login?returnTo=/join/OKOKOKOKOKOKOKOKOKOKOK`; có `login-invite-banner` "Bạn được mời vào một phòng lô tô. Đăng nhập để vào phòng." | url, ui |
| 2 | P2 | Thêm `&__ua=<UA Android>` vào URL `/login`, bấm "Đăng nhập với Google", chọn "Add new account": `binh@example.com`, tên "Bình" | Quay về đúng `/join/OKOK…` | url |
| 3 | P2 | Đọc nút chính | `join-primary-button` = "Vào phòng" (không còn "Đăng nhập để vào phòng") | ui |
| 4 | P2 | Bấm "Vào phòng"; chụp ngay | Nút hiện "Đang vào phòng…" và bị khóa | ui |
| 5 | P2 | Chờ điều hướng | URL `/room`; `room-name` = "Lô tô Tết nhà Ngoại"; `room-members` = "2 người"; **không** có nút "Copy link"/"Copy mã" (Bình không phải host) | url, ui |
| 6 | P2 | Emulator UI › `rooms/r_ok`, `users/{uid Bình}`, RTDB `presence_access/r_ok`, `rooms/r_ok/games/*/players` | `member_count = 2`; `last_event.type = "member_joined"`, `text = "Bình đã vào phòng"`, `actor_uid` = uid Bình; `users/{Bình}.current_room_id = "r_ok"`; `presence_access/r_ok/{uid Bình} = true`; không có doc nào trong `players` | emulator-ui |
| 7 | P1 / A1 | Quan sát trang `/room` của host, không tải lại | Đổi từ "1 người" sang "2 người" trong ≤ 1 giây | ui |

**Kết quả:** ✅ PASS · bước 1–6: banner lời mời ở `/login?returnTo=…`, đăng nhập Bình (redirect) quay về đúng `/join/OKOK…` nút "Vào phòng"; "Đang vào phòng…" + khóa; `/room` "2 người", không có Copy link/Copy mã; Firestore `member_count=2`, `last_event` `member_joined` "Bình đã vào phòng", `users/Bình.current_room_id=r_ok`, `presence_access/r_ok/<uid>=true`, `players` rỗng. Bước 7 (host thấy "2 người" realtime, không tải lại) không quan sát được: một cửa sổ Chrome, hai tab chung cookie/phiên Firebase; listener `/room` đã kiểm ở T-003 TC-07 · 2026-11-21

---

### TC-T004-04 · Đã là thành viên mở lại link thì vào thẳng phòng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-6, FLOW-03 A1 | chrome |

**Tiền điều kiện:** tiếp TC-T004-03 (Bình đã ở `r_ok`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Mở lại link `r_ok` | Tự chuyển `/room`; không thấy trang mời hay nút | url, ui |
| 2 | P2 | Emulator UI › `rooms/r_ok` | `member_count` vẫn = 2 | emulator-ui |

**Kết quả:** ✅ PASS · Bình mở lại link `r_ok` → tự chuyển `/room`, không thấy nút; `member_count` vẫn 2 · 2026-11-21

---

### TC-T004-05 · Link hết hạn, phòng đã đóng hoặc mã sai thì hiện "Link không còn hiệu lực"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-7, AC-8, AC-9, FLOW-03 E1, BR-05 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; Clear site data (khách chưa đăng nhập).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Mở `/join/LATELATELATELATELATE00` (`r_late`) | `join-error` `data-variant="invalid"`; `join-error-title` = "Link không còn hiệu lực"; không có nút "Vào phòng"; không lộ chữ "Phòng quá hạn" | ui |
| 2 | P2 | Mở `/join/CLOSEDCLOSEDCLOSED0000` (`r_closed`) | Như bước 1 | ui |
| 3 | P2 | Mở `/join/abc` | Như bước 1 | ui |
| 4 | P2 | Mở `/join/ZZZZZZZZZZZZZZZZZZZZZZ` (22 ký tự không tồn tại) | Như bước 1 | ui |
| 5 | P2 | Bấm "Về trang chủ" ở bước 4 | URL `/login` (chưa đăng nhập) | url |
| 6 | P2 | Emulator UI › `rooms/r_late` | **Chưa** đổi: `status = "active"` (xem trang không đóng lười — `getInvite` chỉ đọc) | emulator-ui |

**Kết quả:** ✅ PASS · `r_late`, `r_closed`, `/join/abc`, mã 22 ký tự không tồn tại đều hiện "Link không còn hiệu lực" (`data-variant=invalid`), không nút vào, không lộ "Phòng quá hạn"; "Về trang chủ" → `/login`; `rooms/r_late.status` vẫn `active` (xem trang không đóng lười) · 2026-11-21

---

### TC-T004-06 · Người bị kick khỏi phòng không thấy nút vào
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | permission | AC-10, FLOW-03 E2, BR-06 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; P3 đăng nhập `khoa@example.com`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Mở `/join/BLOCKBLOCKBLOCKBLOCK00` (`r_block`) | `join-error` `data-variant="blocked"`; `join-error-title` = "Bạn không thể vào phòng này"; không có `join-primary-button` | ui |
| 2 | P3 | Bấm "Về trang chủ" | URL `/` | url |
| 3 | P3 | Emulator UI › `rooms/r_block` | `member_count = 3` (không đổi) | emulator-ui |

**Kết quả:** ✅ PASS · Khoa mở `r_block`: "Bạn không thể vào phòng này" (`blocked`), không có nút vào; "Về trang chủ" → `/`; `member_count=3` không đổi · 2026-11-21

---

### TC-T004-07 · Người đang ở phòng khác thấy dialog và quay về phòng hiện tại
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-11, FLOW-03 E3, BR-02 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; P3 đăng nhập `lan@example.com` (đang ở `r_other`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Đăng nhập Lan; ở `/room` ("Phòng của Lan") mở `/join/OKOKOKOKOKOKOKOKOKOKOK` | Trang mời hiện; `join-other-room-dialog` mở; `join-other-room-body` = "Bạn đang ở "Phòng của Lan". Mỗi người chỉ ở 1 phòng — hãy rời phòng đó trước."; có "Đóng" và "Về phòng hiện tại" | ui |
| 2 | P3 | Bấm "Đóng" | Dialog đóng, trang mời còn, nút "Vào phòng" | ui |
| 3 | P3 | Bấm "Vào phòng" | Dialog mở lại (server trả `ALREADY_IN_ROOM`); Emulator UI `rooms/r_ok.member_count` không đổi | ui, emulator-ui |
| 4 | P3 | Bấm "Về phòng hiện tại" | URL `/room`; `room-name` = "Phòng của Lan" | url, ui |

**Kết quả:** ✅ PASS · Lan: dialog "Bạn đang ở "Phòng của Lan". Mỗi người chỉ ở 1 phòng — hãy rời phòng đó trước." có "Đóng" và "Về phòng hiện tại"; "Đóng" đóng dialog, nút "Vào phòng" → dialog mở lại; "Về phòng hiện tại" → `/room` "Phòng của Lan"; `r_ok.member_count` vẫn 1 · 2026-11-21

---

### TC-T004-08 · Phòng đầy 16 người hiện "Phòng đã đầy"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-13, FLOW-03 E4, BR-03 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; khách chưa đăng nhập.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Mở `/join/FULLFULLFULLFULLFULL00` (`r_full`) | `join-error` `data-variant="full"`; `join-error-title` = "Phòng đã đầy"; không có nút vào | ui |

**Kết quả:** ✅ PASS · `r_full` → "Phòng đã đầy" (`full`), không nút vào · 2026-11-21

---

### TC-T004-09 · Người từng tự rời vào lại như thành viên mới
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-15, FLOW-03 A2, BR-25 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; P3 đăng nhập `minh@example.com` (không ở phòng, không bị chặn).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Mở link `r_ok`, bấm "Vào phòng" | URL `/room`; "Lô tô Tết nhà Ngoại", "2 người" | url, ui |
| 2 | P3 | Emulator UI › `rooms/r_ok/games/*/players` | Không có doc `players` nào của Minh | emulator-ui |

**Kết quả:** ✅ PASS · Minh vào `r_ok` bằng link → `/room` "Lô tô Tết nhà Ngoại", "2 người"; `players` rỗng · 2026-11-21

---

### TC-T004-10 · Người đã đăng nhập vào phòng bằng mã phòng ở Trang chủ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-22, AC-24, SCR-02.A4, BR-30 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; P3 đăng nhập `minh@example.com`, ở `/`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Quan sát card dưới form tạo phòng | `join-hint-card`: "Vào phòng" + "Có mã phòng 6 ký tự từ bạn bè? Hoặc mở link mời bạn nhận được." + nút "Vào phòng" (`join-room-open-button`) | ui |
| 2 | P3 | Bấm "Vào phòng" | `join-code-dialog` mở "Nhập mã phòng"; nút "Vào" khóa | ui |
| 3 | P3 | Gõ " tet 234 " (chữ thường, có khoảng trắng) | Ô hiện `TET234`; nút "Vào" bật | ui |
| 4 | P3 | Bấm "Vào"; chụp ngay | "Đang vào…" khóa ô | ui |
| 5 | P3 | Chờ điều hướng | URL `/room`; "Lô tô Tết nhà Ngoại", "2 người"; Emulator UI `users/u_minh.current_room_id = "r_ok"`, `rooms/r_ok.member_count = 2` | url, ui, emulator-ui |

**Kết quả:** ✅ PASS · card "Vào phòng" có nút; dialog "Nhập mã phòng"; nút "Vào" khóa khi trống; gõ " tet 234 " → `TET234`, nút bật; "Đang vào…" khóa; `/room` "2 người"; `users/u_minh.current_room_id=r_ok`, `member_count=2`, `last_event` "Minh đã vào phòng" · 2026-11-21

---

### TC-T004-11 · Nhập mã phòng sai, đã đóng, đầy, bị chặn hoặc đang ở phòng khác
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-23, AC-24, AC-26, BR-30 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; P3 đăng nhập `khoa@example.com` ở `/`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Mở dialog, gõ `ZZZZZZ`, bấm "Vào" | `join-code-error` = "Mã phòng không đúng hoặc đã hết hạn"; dialog còn mở | ui |
| 2 | P3 | Xóa, gõ `CLSD22` (`r_closed`), "Vào" | Cùng lỗi "Mã phòng không đúng hoặc đã hết hạn" | ui |
| 3 | P3 | Xóa, gõ `LATE22` (`r_late`, quá hạn), "Vào" | Cùng lỗi; Emulator UI `rooms/r_late.status = "closed"`, `close_reason = "expired"` (đóng lười) | ui, emulator-ui |
| 4 | P3 | Xóa, gõ `FULL22`, "Vào" | `join-code-error` = "Phòng đã đầy" | ui |
| 5 | P3 | Xóa, gõ `BLCK22`, "Vào" | `join-code-error` = "Bạn không thể vào phòng này" | ui |
| 6 | P3 | Gõ `O0I1AB` | Ô chỉ giữ `AB` (O/0/I/1 bị bỏ); nút "Vào" khóa (chưa đủ 6) | ui |
| 7 | — | `ALREADY_IN_ROOM` từ dialog (card "Bạn đang ở phòng" + toast) không tái hiện được trên UI vì `/` luôn chuyển `/room` khi đang ở phòng | Phủ bằng `join-room.test.ts` (AC-26) và `home-screen.test.tsx` (AC-24) | automated |

**Kết quả:** ✅ PASS · `ZZZZZZ`, `CLSD22`, `LATE22` → "Mã phòng không đúng hoặc đã hết hạn" (dialog còn mở); sau `LATE22` `rooms/r_late` = `closed`/`expired`; `FULL22` → "Phòng đã đầy"; `BLCK22` → "Bạn không thể vào phòng này"; `O0I1AB` → ô chỉ giữ `AB`, nút "Vào" khóa; bước 7 automated · 2026-11-21

---

### TC-T004-12 · HTML trang mời có thẻ Open Graph và không lộ dữ liệu cá nhân
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | security | AC-16, SUP-06, ADR-09, NFR-10 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; dev server chạy. `npm run build && npm start` khuyến nghị (kiểm trên bản build vì streaming metadata khác dev).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | — | Terminal: `curl -s -A "facebookexternalhit/1.1" http://localhost:3000/join/OKOKOKOKOKOKOKOKOKOKOK \| grep -o '<meta[^>]*og:[^>]*>'` | Có `og:title` "An Nguyễn mời bạn chơi lô tô", `og:description` "Lô tô Tết nhà Ngoại", `og:image` URL tuyệt đối `http://localhost:3000/og/invite.png`, `og:url`, `og:type` = website, `og:locale` = vi_VN | network |
| 2 | — | `curl -s -A "facebookexternalhit/1.1" … \| grep -c -E "host@example.com\|u_host\|blocked_uids"` | `0` | network |
| 3 | — | `curl -s -o /dev/null -w "%{http_code} %{content_type}" http://localhost:3000/og/invite.png` | `200 image/png` | network |
| 4 | — | `curl -s -A "facebookexternalhit/1.1" http://localhost:3000/join/CLOSEDCLOSEDCLOSED0000 \| grep -c "Phòng đã đóng"` | `0` (không lộ tên phòng đã đóng); `<title>Lô Tô Online</title>` | network |
| 5 | — | `curl -s -A "ZaloBot" http://localhost:3000/join/OKOKOKOKOKOKOKOKOKOKOK \| grep -o '<meta property="og:title"[^>]*>'` | Có `og:title` trong `<head>` (UA Zalo cũng nhận metadata chặn) | network |

**Kết quả:** ✅ PASS · `curl -A facebookexternalhit/1.1` (dev và bản `build`+`start`): đủ `og:title` "An Nguyễn mời bạn chơi lô tô", `og:description` "Lô tô Tết nhà Ngoại", `og:image` `http://localhost:3000/og/invite.png`, `og:url`, `og:type`, `og:locale`; không có `host@example.com`/`u_host`/`blocked_uids`; `/og/invite.png` 200 `image/png`; `r_closed` → `<title>Lô Tô Online</title>`, không lộ tên phòng; UA `ZaloBot` cũng nhận `og:title` · 2026-11-21

---

### TC-T004-13 · Đóng popup đăng nhập từ trang mời thì vẫn thấy banner lời mời
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | error | AC-20, FLOW-03 E5 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; Clear site data; mở `/login?returnTo=/join/OKOKOKOKOKOKOKOKOKOKOK` (UA Chrome máy tính ⇒ popup).
**Ghi chú:** như TC-T002-06 — extension không điều khiển popup ⇒ mở popup bằng "Đăng nhập với Google" rồi đóng bằng `close()` trên tham chiếu `window.open` (xem cách làm ở TC-T002-06).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Bấm "Đăng nhập với Google", đóng popup không chọn tài khoản; chờ ~9 giây | `login-error` = "Đăng nhập không thành công, thử lại."; `login-invite-banner` vẫn còn | ui |
| 2 | P2 | Bấm "Đăng nhập với Google" lại, chọn tài khoản (luồng redirect) | Về đúng `/join/OKOK…` | url |

**Kết quả:** ✅ PASS · popup đóng bằng `close()` trên tham chiếu `window.open`, sau ≈ 9s: "Đăng nhập không thành công, thử lại.", banner lời mời còn; đăng nhập lại (redirect) → đúng `/join/OKOK…` nút "Vào phòng" · 2026-11-21

---

### TC-T004-14 · Trang mời render sẵn ở server và tải nhanh
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | happy | AC-17, NFR-04 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`; `npm run build && npm start` (cổng 3000), emulator vẫn chạy; Clear site data.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | — | `curl -s http://localhost:3000/join/OKOKOKOKOKOKOKOKOKOKOK \| grep -c -E "Lô tô Tết nhà Ngoại"` | ≥ 1 (tên phòng có trong HTML ban đầu, không chờ JS) | network |
| 2 | P2 | Mở link, chạy `performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd` | ≤ 3000 (ms, đo tham khảo trên local) | console |

**Kết quả:** ✅ PASS · bản `build`+`start`: tên phòng có trong HTML ban đầu (`curl` không JS); `domContentLoadedEventEnd` = 67 ms (≤ 3000) · 2026-11-21

---

### TC-T004-15 · joinRoom: đóng lười phòng cũ, đúng 1 người vào khi còn 1 chỗ, không cookie (tự động)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | boundary | AC-12, AC-14, AC-18, AC-19 | automated |

- `tests/emulator/invite/join-room.test.ts` — user ở phòng quá hạn → đóng lười rồi vào phòng mới (AC-12); 2 lệnh song song khi còn 1 chỗ → đúng 1 thành công, người kia `ROOM_FULL`, `member_count = 16`, lặp 5 lần (AC-14); không cookie → `UNAUTHENTICATED` (AC-19); thứ tự 6 bước lỗi; `roomCode` (AC-22, 23, 26).
- `tests/emulator/invite/get-invite.test.ts` — đúng tập key `InvitePreview`, `viewer = null` khi không phiên, không ghi DB, không lộ `host_uid`/email/`invite_code`/`blocked_uids` (AC-18).

**Kết quả:** ⏭ automated — `npm test` pass (`tests/emulator/invite/*`)

---

### TC-T004-16 · Lỗi tải lời mời hiện "Không tải được lời mời" và nút "Thử lại" (tự động)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-21 | automated |

- `src/features/invite/client/components/join-error.test.tsx`, `join-screen.test.tsx` — biến thể `load` có "Không tải được lời mời" + "Thử lại" gọi `router.refresh`.
- `src/app/join/[code]/metadata.test.ts` — mã lỗi → title "Lô Tô Online" chung.

**Kết quả:** ⏭ automated — `npm test` pass (`join-error.test.tsx`, `join-screen.test.tsx`, `metadata.test.ts`)

---

### TC-T004-17 · Trang mời và hộp nhập mã không tràn ngang ở 360px và 375px
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | responsive | NFR-12 | chrome |

**Tiền điều kiện:** seed `reset` + `t004`. Lưu ý: cửa sổ Chrome qua extension không thu nhỏ dưới ~500px (T-003 TC-11) — nếu vẫn vậy ghi `SKIP` kèm lý do.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Viewport 360×740, mở link `r_ok` (khách) | `document.documentElement.scrollWidth <= 360`; `join-primary-button` cao ≥ 44px | layout |
| 2 | P3 | Đăng nhập `minh@example.com`, ở `/`, mở dialog nhập mã ở 360px | Không tràn ngang; `join-code-input` và nút "Vào" nằm trọn trong khung | layout |
| 3 | P2 | Viewport 375×812, kiểm lại bước 1 | `scrollWidth <= 375` | layout |

**Kết quả:** ⏭ SKIP: cửa sổ Chrome (extension) không thu nhỏ dưới ~500px nên không đặt được 360/375px (như T-003 TC-11). Cần dev kiểm bằng DevTools device mode

---

## Từ điển
- **Ưu tiên:** P0 luồng chính, phải pass để đóng task (luôn nằm trong smoke) · P1 luồng thay thế/lỗi/biên quan trọng · P2 hiếm gặp, cosmetic.
- **Loại:** `happy` · `alt` (luồng A*) · `error` (luồng E*) · `boundary` (biên BR) · `permission` (host/player/người ngoài) · `multi-user` · `resilience` (mất mạng, reload, tab ẩn) · `responsive` · `security`.
- **Chạy bằng:** `chrome` (chrome-tester chạy) · `automated` (đã phủ bằng Vitest, ghi đường dẫn test, chrome-tester bỏ qua) · `manual` (cần thiết bị thật, VD Safari iOS, Zalo thật).
- **Cách kiểm:** `url` · `ui` (chữ/phần tử hiển thị, dùng chữ trong vi.ts hoặc `data-testid`) · `toast` · `emulator-ui` (dữ liệu Firestore/RTDB/Auth) · `cookie` · `console` (không có lỗi) · `network` · `layout` (không tràn ngang, kích thước).
