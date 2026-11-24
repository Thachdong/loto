---
task: T-006
title: Chơi trọn ván ở Phòng chơi (SCR-04): bắt đầu, rao số, dò vé, báo KINH, rời phòng, hết hạn
written_from_commit: f9d75f2
last_run: null
summary: null
---

# Test case QC · T-006 Phòng chơi (SCR-04)

> AC theo **plan mới** (`backlog/plan/T-006-game-room.md` mục 5; † = viết lại theo specs mới, AC-34b/46/47 là AC mới). File task cũ lỗi thời về `claim_window`/`winners`/`leaveRoom` — KHÔNG dùng. Ranh giới: duyệt KINH (`confirmGame`/`rejectClaims`), overlay kết quả là T-007; ở T-006 ván `awaiting_confirm` chỉ có thẻ tạm, không có nút host duyệt.

> **Cập nhật T-007:** thẻ tạm \`claim-card\` ("{tên} KINH!", "Đang chờ host duyệt…", "Vé đủ hàng/chưa đủ hàng") đã được thay bằng thẻ duyệt SCR-09 \`review-card\` — bước nào kiểm thẻ tạm thì kiểm theo \`backlog/testcases/T-007-game-result.md\`.

## 0. Môi trường chung
- Lệnh: `npm run emulators` (nền) · `npm run dev` (nền, bắt buộc dev server: redirect login + `?debug=` + log `console.debug` chỉ có ở dev) · mỗi TC đầu tiên chạy `npm run seed -- reset && npm run seed -- <scenario>` (scenario ghi ở "Tiền điều kiện"; script in `roomId`, uid, email).
- URL: `http://localhost:3000` · Emulator UI: `http://localhost:4000` · phòng chơi = `/room`.
- Viewport: 375×812 (trừ khi case ghi khác).
- Đăng nhập (như `backlog/testcases/T-004-invite-join-room.md` mục 0): mở `http://localhost:3000/login?__ua=<encodeURIComponent(UA Android)>` để chạy luồng **redirect** trong cùng tab; UA mẫu `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36`. Chọn tài khoản có sẵn trong Auth emulator theo email bên dưới. Sau đăng nhập, user có `current_room_id` → mở `/room`.
- Profile (chỉ 1 cửa sổ Chrome ⇒ chạy **lần lượt**; giữa 2 profile "Clear site data" cho `localhost:3000`; hai tab chung cookie nên khi TC cần nhiều người cùng lúc thì: profile đang mở giữ 1 tab, người còn lại được quan sát qua Emulator UI/REST (`http://localhost:8080/v1/projects/<projectId>/databases/(default)/documents/...`) hoặc xen kẽ đổi profile ở các bước ghi rõ):
  - P1 = H "Host H" `h@example.com` (`u_tk_h`, host, **không có vé**).
  - P2 = B "Bình B" `b@example.com` (`u_tk_b`, vé `red_a` = Đỏ A).
  - P3 = C "Cúc C" `c@example.com` (`u_tk_c`, vé `blue_a` + `blue_b` = Lam A, Lam B).
  - Cả 3 đã ở phòng, presence online, `draw_interval_sec = 3`.
- Seed `scripts/seed/scenarios/t006.ts` (`npm run seed -- <tên>`): `game-waiting` (alias `t006`, `r_gm_wait`, mã `GMW234`) · `game-empty` (`r_gm_empty`) · `game-running` (`r_gm_run`, 5 số `11,24,37,52,68`, `next_call_at = +3s`) · `game-row-ready` (`r_gm_row`, hàng 0 `blue_a` đủ 5 số, `red_a` chưa đủ hàng) · `game-paused` (`r_gm_pause`) · `game-awaiting` (`r_gm_await`, `claims=[C blue_a win row0]`, `resume_status=running`) · `game-nearly-done` (`r_gm_near`, 89 số) · `game-nearly-done-closing` (`r_gm_nearc`, phòng `closing`) · `game-near-expiry` (`r_gm_nexp`, +14 phút) · `game-expiring-waiting` (`r_gm_expw`, +60s) · `game-expiring-running` (`r_gm_expr`, +60s) · `game-expired-idle` (`r_gm_idle`, đã quá hạn 1 giờ, vẫn `active`) · `game-awaiting-expiring` (`r_gm_awexp`, +60s). Seed lại (reset) trước mỗi TC dùng scenario có thay đổi dữ liệu.
- Thời gian dài (8 giờ, 15 phút) dùng seed sát hạn; không chờ thật. Scenario `+60s`: seed xong **mở trang ngay** (còn < 60 giây).
- Công cụ đo (chạy bằng `javascript_tool` ở tab `/room`):
  - Log: `console.debug('[draw]', {...})` (scheduler) và `[audio]` `{latencyMs…}` — đọc bằng `read_console_messages` (lọc `[draw]`/`[audio]`).
  - Wake lock: `document.documentElement.dataset.wakelock` (`active` | `released` | `unsupported`).
  - Layout: `JSON.stringify([...document.querySelectorAll('[data-testid^="ticket-"] [data-cell]')].slice(0,1).map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}))` và `getBoundingClientRect()` của `[data-testid=room-header|number-panel|kinh-bar|bottom-bar]`.
  - Giả lập mất mạng: thêm `?debug=offline` / `?debug=online` vào URL `/room` (chỉ dev).
  - Đổi mode dò: `localStorage.setItem('loto:mode','auto')` rồi tải lại; mặc định `manual`.
- Chữ chính (vi.ts): phụ đề "Ván {n} · {Chờ bắt đầu | Đang quay | Tạm dừng | Chờ host duyệt KINH}" · "▶ Bắt đầu" / "⏸ Tạm dừng" / "▶ Tiếp tục" · "Cần ít nhất 1 người lấy vé" · "{held}/16 vé đã có chủ · {members} người trong phòng" · "Số thứ {n}/90" · "Số kế tiếp sau {n} giây" · "Chưa rao số nào" · "⏸ Host đã tạm dừng" · "⏳ Chờ host duyệt KINH" · "Bảng 90 ›" · nút "KINH" / "Kinh vé {Màu} {A|B}" / "Đã KINH vé này" · thẻ "{tên} KINH!" + "Đang chờ host duyệt…" + "Vé đủ hàng" / "Vé chưa đủ hàng" · "Bạn chưa có vé" · "Chọn vé" · "Bạn đang xem ván này. Lấy vé khi ván kết thúc." · "Chạm để bật tiếng" · "Không tải được tiếng rao" · "Mất kết nối – đang kết nối lại…" · chip "⏱ Còn mm:ss" / "Đóng sau ván này" · dialog rời: "Rời phòng?" / "Đóng phòng?" · "Ở lại" · "Rời phòng" / "Đóng phòng" · "Không rời được phòng, thử lại" · toast "Ván {n} bắt đầu", "Ván {n} kết thúc", "Ván đã tạm dừng", "Ván tiếp tục", "{tên} KINH!", "{tên} đã rời phòng", "Phòng sẽ hết hạn sau 15 phút", "Phòng sẽ đóng khi ván này kết thúc", "Host đã đóng phòng" · banner SCR-02: `Bạn đã rời phòng "{tên}".`, `Phòng "{tên}" đã hết hạn.`, `Host đã đóng phòng "{tên}".` · sheet Mời: "Mời bạn bè", "Link mời", "Mã phòng", "Copy link", "Copy mã", "Chia sẻ…", "Link hết hạn lúc {HH:mm} (cùng lúc phòng đóng) · {n}/16 người", toast "Đã copy link" / "Đã copy mã phòng" · sheet Bảng 90: "Bảng 90 số", "Số đã rao ({n}/90)", "Gần nhất: …" · thanh dưới: "Vé · Chat · Người · Lịch sử · Cài đặt", khung "Sắp có".
- `data-testid`: `room-screen`, `room-header`, `room-name`, `game-subtitle`, `expiry-chip`, `btn-invite`, `btn-leave`, `number-panel` (`data-compact`), `last-number`, `called-count` ("n/90"), `next-countdown`, `recent-numbers`, `btn-board90`, `host-bar`, `btn-start`/`btn-pause`/`btn-resume`, `host-hint`, `me-status`, `my-tickets-area`, `my-tickets` (`data-count`), `ticket-{id}` (ô: `data-cell`, `data-marked`, `data-hit`, `data-waiting`), `ticket-open-{id}`, `no-ticket-card`, `btn-pick-ticket`, `spectator-note`, `kinh-bar`, `btn-kinh`, `kinh-sheet`, `kinh-sheet-{id}`, `claim-card`, `claim-item-{uid}-{ticketId}` (`data-result`), `bottom-dock`, `bottom-bar`, `tab-{tickets|chat|members|history|settings}`, `sheet-coming-soon`, `sound-gate`, `board90`, `board-cell-{n}`, `board-called`, `board-recent`, `board-close`, `invite-sheet`, `invite-link`, `invite-code`, `invite-expires`, `btn-copy-link`, `btn-copy-code`, `btn-share`, `leave-dialog` (`data-variant` = `simple`/`playing`/`host`), `leave-body`, `btn-leave-stay`, `btn-leave-confirm`, `conn-banner`, `room-skeleton`; toast là sonner (`[data-sonner-toast]`).

## 1. Ma trận phủ
| Nguồn | TC |
|---|---|
| AC-01 | TC-T006-01 · `tests/emulator/game/start-pause-resume.test.ts` |
| AC-02 | TC-T006-36 (automated) |
| AC-03 | TC-T006-02 · `pick-next-number.test.ts`, `draw-number.test.ts` |
| AC-04 | TC-T006-37 (automated) |
| AC-05 | TC-T006-37 (automated) |
| AC-06 † | TC-T006-37 (automated) · TC-T006-12 bước 5 (người xem không hẹn giờ) |
| AC-07 | TC-T006-18 · `backup-order.test.ts`, `draw-fire-at.test.ts` |
| AC-08 | TC-T006-18 bước 8–9 |
| AC-09 | TC-T006-07 · `start-pause-resume.test.ts` |
| AC-10 | TC-T006-36 (automated) · TC-T006-23 bước 1–3 (mở phòng quá hạn) |
| AC-11 | TC-T006-08 · `start-pause-resume.test.ts` |
| AC-12 | TC-T006-05 · `start-pause-resume.test.ts` |
| AC-13 | TC-T006-05 · `start-pause-resume.test.ts` |
| AC-14 | TC-T006-09 · `paper-ticket.test.tsx` |
| AC-15 | TC-T006-10 · `marks-store.test.ts` |
| AC-16 | TC-T006-11 · `auto-effects.test.ts` |
| AC-17 | TC-T006-12 |
| AC-18 † | TC-T006-13 · `create-claim.test.ts` |
| AC-19 † | TC-T006-38 (automated) |
| AC-20 † | TC-T006-03 · `create-claim.test.ts` |
| AC-21 | TC-T006-03 bước 5–8 · `kinh-bar.test.tsx` |
| AC-22 † | TC-T006-14 · `create-claim.test.ts` |
| AC-23 † | TC-T006-38 (automated) · `game-errors.test.ts` |
| AC-24 | TC-T006-39 (automated) |
| AC-25 † | TC-T006-04 · `draw-number.test.ts` |
| AC-26 | TC-T006-24 · `draw-number.test.ts` |
| AC-27 | TC-T006-25 · `ticket-layout.test.ts` |
| AC-28 | TC-T006-26 · `ticket-layout.test.ts` |
| AC-29 | TC-T006-27 · `sound-gate.test.tsx`, `use-audio.test.tsx` |
| AC-30 | TC-T006-28 · `select-clip.test.ts`, `audio-engine.test.ts` |
| AC-31 | TC-T006-29 · `last-event-toast.test.ts`, `use-room-toasts.test.tsx` |
| AC-32 † | TC-T006-30 · `invite-sheet.test.tsx` |
| AC-33 † | TC-T006-16 · `tests/emulator/room/leave-room.test.ts` |
| AC-34 † | TC-T006-17 · `leave-room.test.ts`, `leave-dialog.test.tsx` |
| AC-34b † | TC-T006-06 · `leave-room.test.ts` |
| AC-35 | TC-T006-19 · `use-expiry-timer.test.tsx` |
| AC-36 | TC-T006-20 · `tests/emulator/room/expire-room.test.ts` |
| AC-37 | TC-T006-21 · `expire-room.test.ts` |
| AC-38 † | TC-T006-22 · `expire-room.test.ts`, `room-expiry.test.ts` |
| AC-39 | TC-T006-23 |
| AC-40 | TC-T006-40 (automated) |
| AC-41 | TC-T006-31 · `use-wake-lock.test.tsx` |
| AC-42 | TC-T006-32 · `use-connection.test.tsx` |
| AC-43 | TC-T006-33 · `board90-sheet.test.tsx` |
| AC-44 | TC-T006-41 (automated) |
| AC-45 | TC-T006-42 (automated) |
| AC-46 (mới) | TC-T006-43 (automated) |
| AC-47 (mới) | TC-T006-14 · `kinh-bar.test.tsx` |
| FLOW-06 E1/E2/E3 | TC-T006-07, TC-T006-23, TC-T006-08 |
| FLOW-08 A1–A4, E1–E3 | TC-T006-03, 13, 14, 38 |
| FLOW-11 | TC-T006-16, 17, 06 |
| FLOW-14 b1–6, A1, A2, E1 | TC-T006-19..24 |
| BR-04 (8 giờ/15 phút) | TC-T006-19..23 |
| BR-29 (chỉ chép player online) | TC-T006-43 (automated) |
| Sheet "Sắp có" (bottom bar) | TC-T006-34 |
| Reload giữa ván (resilience) | TC-T006-35 |

## 2. Smoke (chạy lại ở các task sau)
TC-T006-01 (Bắt đầu ván), TC-T006-02 (rao số tự động, 3 máy đồng bộ), TC-T006-05 (tạm dừng/tiếp tục), TC-T006-03 (KINH đúng → thẻ tạm).

## 3. Test case

### TC-T006-01 · Host bắt đầu ván: cả phòng thấy ván chạy và số đầu tiên
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-01, FLOW-06 b1–5, FLOW-07 b1 | chrome |

**Tiền điều kiện:** `npm run seed -- reset && npm run seed -- game-waiting`; chưa đăng nhập.
**Dữ liệu:** H `h@example.com`; B giữ `red_a`, C giữ `blue_a`+`blue_b`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập (redirect flow) rồi mở `http://localhost:3000/room` | Màn SCR-04: `game-subtitle` = "Ván 1 · Chờ bắt đầu"; `host-bar` hiện nút "▶ Bắt đầu" (enabled) và `host-hint` "3/16 vé đã có chủ · 3 người trong phòng"; panel "Chưa rao số nào"; `spectator-note` "Bạn đang xem ván này. Lấy vé khi ván kết thúc."; **không** có `kinh-bar` | ui |
| 2 | P1 | Bấm "▶ Bắt đầu" | ≤ 1 giây: `game-subtitle` = "Ván 1 · Đang quay"; `last-number` là số 1–90; `called-count` = "1/90"; hiện "Số thứ 1/90"; nút đổi thành "⏸ Tạm dừng"; toast "Ván 1 bắt đầu" | ui, toast |
| 3 | P1 | Emulator UI › Firestore › `rooms/r_gm_wait/games/{current_game_id}` | `status = running`, `player_count = 2`, `started_at` có giá trị, `next_call_at ≈ now + 3s`; `rooms/r_gm_wait.called_numbers` có đúng 1 phần tử trùng số đang hiện; `last_event.type = game_started`; `players/u_tk_b.display_name = "Bình B"`, `players/u_tk_c` có `display_name`/`photo_url` | emulator-ui |
| 4 | P2 | "Clear site data", đăng nhập B, mở `/room` | `game-subtitle` "Ván 1 · Đang quay"; `last-number` khác "–" (cùng số hoặc số kế tiếp H đã rao); thấy `kinh-bar` + nút "KINH"; **không** có `host-bar`; `me-status` "Bạn đang chơi 1 vé · mode Tự dò" | ui |

**Kết quả:** ⬜

---

### TC-T006-02 · Rao số tự động mỗi 3 giây, không trùng, các máy khớp nhau
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | multi-user | AC-03, FLOW-07 b1–5, BR-15, BR-20, NFR-01 | chrome |

**Tiền điều kiện:** `game-running` (5 số đã rao, `next_call_at = +3s`). Host phải mở màn để chạy bộ hẹn giờ: P1 mở `/room` ngay sau seed.
**Dữ liệu:** `called_numbers` đầu: `11,24,37,52,68`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, mở `/room` | `game-subtitle` "Ván 1 · Đang quay"; `called-count` "5/90"; `last-number` = 68; `next-countdown` "Số kế tiếp sau {n} giây" (n ≤ 3, giảm dần) | ui |
| 2 | P1 | Giữ tab, ghi `last-number` và `called-count` mỗi ~3 giây trong 15 giây (`javascript_tool` đọc `[data-testid=called-count]` mỗi giây) | `called-count` tăng 1 mỗi ~3 giây (5→6→7→…→10/90, sai số ≤ 1s); `recent-numbers` có số mới nhất **ở ngoài cùng bên trái**; không số nào lặp trong 10 số | ui |
| 3 | P1 | Console (`read_console_messages`, lọc `[draw]`) | Có log `[draw]` role `host`, `drawn: true`; không có lỗi đỏ | console |
| 4 | P1 | Emulator UI › `rooms/r_gm_run.called_numbers` | Danh sách khớp thứ tự đã quan sát; không phần tử trùng; độ dài = số `called-count` | emulator-ui |
| 5 | P2 | "Clear site data", đăng nhập B, mở `/room` | `called-count` và `last-number` bằng đúng `called_numbers` hiện tại trong Emulator UI (≤ 1 giây sau khi H rao — host tab đã đóng/ẩn thì B tiếp tục gọi theo TC-18); số mới tiếp tục xuất hiện ở B mà không cần tải lại | ui |
| 6 | P3 | Đổi sang C, mở `/room` | Thấy cùng `last-number`/`called-count` với B (±1 số nếu vừa đến nhịp, lệch thời gian ≤ 1 giây) | ui |

**Kết quả:** ⬜

---

### TC-T006-03 · KINH đúng (người giữ 2 vé chọn vé): ván dừng chờ host duyệt, cả phòng thấy thẻ tạm
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-20 †, AC-21, FLOW-08 b2–6, BR-16, BR-17 | chrome |

**Tiền điều kiện:** `game-row-ready` (hàng 0 của `blue_a` đủ 5 số trong `called_numbers`; `red_a` chưa đủ hàng nào; `next_call_at = +3s`). P1 đã mở `/room` một lần cho scheduler quay hoặc bỏ qua (KINH không cần số mới).
**Dữ liệu:** C = `c@example.com`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Đăng nhập C, mở `/room` | `my-tickets` `data-count = 2` (Lam A, Lam B); `kinh-bar` hiện nút "KINH" enabled; `bottom-bar` hiện 5 tab | ui |
| 2 | P3 | Bấm "KINH" | Mở action sheet `kinh-sheet` tiêu đề "Báo KINH vé nào?" có **2 dòng** "Kinh vé Lam A" (`kinh-sheet-blue_a`) và "Kinh vé Lam B" (`kinh-sheet-blue_b`) | ui |
| 3 | P3 | Bấm "Kinh vé Lam A" | Sheet đóng; ≤ 1 giây hiện toast "Cúc C KINH!"; `game-subtitle` = "Ván 1 · Chờ host duyệt KINH"; `number-panel` hiện "⏳ Chờ host duyệt KINH"; `claim-card` hiện "Cúc C KINH!" + "Đang chờ host duyệt…" + dòng `claim-item-u_tk_c-blue_a` "Cúc C · vé Lam A" kèm "Vé đủ hàng" (`data-result=win`); nút KINH khóa ~1 giây rồi hiện **"KINH"** lại cho vé Lam B | ui, toast |
| 4 | P3 | Emulator UI › `games/{id}` | `status = awaiting_confirm`; `resume_status = running`; `next_call_at = null`; `pause_reason = null`; `claims[0] = {uid:"u_tk_c", ticket_id:"blue_a", color:"blue", result:"win", row:0, claimed_at}`; `last_event.type = claim_submitted`, `last_event.text = "Cúc C KINH!"` | emulator-ui |
| 5 | P3 | Chờ 10 giây, đọc `called-count` | Không còn số mới (`rooms.called_numbers` không đổi); `next-countdown` không đếm | ui |
| 6 | P3 | Bấm "KINH" lần nữa | Sheet mở; dòng "Kinh vé Lam A · Đã KINH vé này" **bị khóa**, "Kinh vé Lam B" còn bấm được (xem thêm TC-14) | ui |
| 7 | P2 | Đổi sang B ("Clear site data", đăng nhập, `/room`) | B thấy cùng `claim-card`, `game-subtitle` "Chờ host duyệt KINH"; không còn số mới; **không** có nút duyệt/bác bỏ nào (T-007) | ui |
| 8 | P1 | Đổi sang H, `/room` | H thấy `claim-card`, không `kinh-bar`, `host-bar` không có nút Tạm dừng/Tiếp tục duyệt (ván `awaiting_confirm`: chỉ có `host-hint`/trống) | ui |

**Kết quả:** ⬜

---

### TC-T006-04 · Rao hết 90 số: ván kết thúc không ai thắng, sang ván mới chờ bắt đầu
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-25 †, BR-19, BR-07, BR-11, FLOW-07 E2, E3 | chrome |

**Tiền điều kiện:** `game-nearly-done` (89 số, `next_call_at = +3s`, cả 3 presence online). P1 mở `/room` ngay.
**Dữ liệu:** `called_numbers = 1..89` → số thứ 90 là 90.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, mở `/room`, chờ ≤ 5 giây | `last-number` = 90; `called-count` = "90/90"; toast "Ván 1 kết thúc" | ui, toast |
| 2 | P1 | Ngay sau đó | `game-subtitle` = "Ván 2 · Chờ bắt đầu"; panel không hiện số 90 như số "đang rao" (ván `waiting` ẩn số cũ); nút "▶ Bắt đầu" hiện lại | ui |
| 3 | P1 | Emulator UI › `rooms/r_gm_near/games` | Ván 1: `status = finished`, `result = no_winner`, `ended_at` có giá trị, `next_call_at = null`, `last_event.type = game_finished`. Ván 2: `status = waiting`, `seq_no = 2`; `rooms.current_game_id` = ván 2, `game_count` tăng 1; `players` của ván 2 gồm B (`red_a`) và C (`blue_a`,`blue_b`) với `ticket_ids` giữ nguyên | emulator-ui |
| 4 | P2 | Đổi B, `/room` | Thấy "Ván 2 · Chờ bắt đầu", vé `red_a` còn nguyên | ui |
| 5 | P1 | Đổi H, bấm "▶ Bắt đầu" | Ván 2 chạy bình thường: `Số thứ 1/90`, `called_numbers` được đặt lại còn 1 phần tử | ui, emulator-ui |

**Kết quả:** ⬜

---

### TC-T006-05 · Host tạm dừng rồi tiếp tục ván
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-12, AC-13, FLOW-06 A1, A2, BR-16 | chrome |

**Tiền điều kiện:** `game-running`. P1 đăng nhập H, mở `/room`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Bấm "⏸ Tạm dừng" | Toast "Ván đã tạm dừng"; `game-subtitle` "Ván 1 · Tạm dừng"; panel "⏸ Host đã tạm dừng"; nút thành "▶ Tiếp tục" | ui, toast |
| 2 | P1 | Ghi `called-count`, chờ 10 giây | Không có số mới | ui |
| 3 | P1 | Emulator UI › `games/{id}` | `status = paused`, `pause_reason = host`, `next_call_at = null`, `last_event.type = game_paused` | emulator-ui |
| 4 | P1 | Bấm "▶ Tiếp tục" | Toast "Ván tiếp tục"; phụ đề "Ván 1 · Đang quay"; sau ≈ 3 giây có số mới; `next_call_at ≈ now + 3s` ngay sau bấm; `pause_reason = null` | ui, toast, emulator-ui |
| 5 | P2 | Đổi B, `/room` khi ván đang `paused` (đặt lại bằng bước 1 ở P1 trước khi đổi) | B thấy "Tạm dừng", panel "⏸ Host đã tạm dừng", `me-status` "Host đã tạm dừng ván"; không có `host-bar` | ui |

**Kết quả:** ⬜

---

### TC-T006-06 · Host bấm Rời = đóng phòng cho mọi người
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | permission | AC-34b †, FLOW-11, BR-21 | chrome |

**Tiền điều kiện:** `game-running`. P1 đăng nhập H, mở `/room`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Bấm nút "Rời" (`btn-leave`) ở header (host cũng thấy nút này) | Dialog `leave-dialog` `data-variant="host"`: tiêu đề "Đóng phòng?", nội dung "Bạn là host: rời phòng sẽ đóng phòng cho mọi người."; nút "Ở lại", "Đóng phòng" | ui |
| 2 | P1 | Bấm "Ở lại" | Dialog đóng, vẫn ở `/room`, ván vẫn quay | ui |
| 3 | P1 | Bấm "Rời" → "Đóng phòng" | Về `/` (SCR-02); hiện banner `Host đã đóng phòng "Phòng chơi (đang quay)".` | url, ui |
| 4 | P1 | Emulator UI | `rooms/r_gm_run`: `status = closed`, `close_reason = host_left`, `member_count = 0`, `last_event.type = room_closed` ("Host đã đóng phòng"); ván hiện tại `status = cancelled`, `result = cancelled`; `users/u_tk_h|u_tk_b|u_tk_c.current_room_id = null`; RTDB `presence/r_gm_run` không còn | emulator-ui |
| 5 | P2 | Seed lại `game-running`, mở B tại `/room` trước, rồi dùng Emulator UI/REST mô phỏng host rời (hoặc đổi sang H bấm "Đóng phòng") và quay lại B | B (mở sẵn `/room`) tự về `/` với banner `Host đã đóng phòng "Phòng chơi (đang quay)".` | url, ui |

**Kết quả:** ⬜

---

### TC-T006-07 · Không ai có vé: nút Bắt đầu bị khóa kèm gợi ý
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-09, FLOW-06 E1, BR-14 | chrome |

**Tiền điều kiện:** `game-empty` (không player).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, mở `/room` | Nút "▶ Bắt đầu" `disabled`; `host-hint` "Cần ít nhất 1 người lấy vé" | ui |
| 2 | P1 | Bấm vào nút khóa | Không có gì xảy ra; Emulator UI: ván vẫn `waiting` | ui, emulator-ui |
| 3 | P2 | Đổi B, `/room` | Hiện `no-ticket-card` "Bạn chưa có vé" + nút "Chọn vé"; không có `kinh-bar` | ui |
| 4 | — | API `NO_TICKETS_HELD`, dữ liệu không đổi | Xem TC-T006-36 | — |

**Kết quả:** ⬜

---

### TC-T006-08 · Người chơi (không phải host) không thấy điều khiển host
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | permission | AC-11, FLOW-06 E3 | chrome |

**Tiền điều kiện:** `game-waiting`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, mở `/room` | Không có `host-bar`, không có nút "▶ Bắt đầu"/"⏸ Tạm dừng"/"▶ Tiếp tục"; có `me-status` "Chờ host bắt đầu · 3 vé đã có chủ" (hoặc số vé đã có chủ thực tế); header **không** có nút "Mời" (`btn-invite` không tồn tại); có nút "Rời" | ui |
| 2 | P3 | Đổi C, `/room` | Tương tự B | ui |
| 3 | — | Gọi trực tiếp `startGame`/`pauseGame`/`resumeGame` bởi player → `NOT_ROOM_HOST` | Xem TC-T006-36 | — |

**Kết quả:** ⬜

---

### TC-T006-09 · Ván chờ bắt đầu: chạm ô không đánh dấu, chạm vé mở màn chọn vé
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-14, BR-10 | chrome |

**Tiền điều kiện:** `game-waiting`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, mở `/room` | `ticket-red_a` hiển thị, mọi ô `data-marked="false"` | ui |
| 2 | P2 | Chạm 1 ô có số (`[data-cell]:not([data-cell="empty"])`) | Ô không đổi (`data-marked` vẫn `false`) — ngoài ra mở sheet chọn vé (xem bước 3) | ui |
| 3 | P2 | Chạm vào vé (`ticket-open-red_a`) | Mở sheet "Chọn vé" (SCR-05, `Bạn giữ 1/2 vé · …`); đóng được | ui |

**Kết quả:** ⬜

---

### TC-T006-10 · Chế độ Tự dò: chạm ô để đánh dấu, tải lại vẫn còn
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-15, BR-20, NFR-07 | chrome |

**Tiền điều kiện:** `game-running`; `localStorage['loto:mode']` chưa đặt (mặc định `manual`). Mở như C (2 vé).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Đăng nhập C, `/room` | `me-status` "Bạn đang chơi 2 vé · mode Tự dò"; không ô nào được đánh dấu/gợi ý | ui |
| 2 | P3 | Chạm 1 ô số bất kỳ trên `ticket-blue_a` (đã rao hoặc chưa rao) | Ô đó `data-marked="true"` (nền tối, chữ trắng) ngay | ui |
| 3 | P3 | Chạm lại ô đó | `data-marked="false"` | ui |
| 4 | P3 | Chạm lại để đánh dấu, ghi vị trí ô (`data-cell` số), tải lại trang (`F5`) | Ô vẫn `data-marked="true"`; `localStorage` có khóa dạng `{gameId}:{ticketId}` chứa số đã đánh dấu | ui |
| 5 | P3 | Quan sát vé | Không có viền đỏ/viền "chờ"/gợi ý nào trên vé (chỉ Auto mới có) | ui |

**Kết quả:** ⬜

---

### TC-T006-11 · Chế độ Auto: tự tô số đã rao, viền đỏ số vừa rao, viền chờ hàng thiếu 1 số
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-16, SUP-10, FLOW-07 b7 | chrome |

**Tiền điều kiện:** `game-running`. Mở `/room` bằng C rồi `localStorage.setItem('loto:mode','auto')` và tải lại.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Đăng nhập C, đặt mode Auto, tải lại | `me-status` "Bạn đang chơi 2 vé · mode Auto"; mọi số trong `called_numbers` có mặt trên vé C đã `data-marked="true"` (kiểu nền nhạt) | ui |
| 2 | P3 | Chờ số mới (P1 phải để scheduler chạy: mở tab H trước) hoặc đọc `last-number` | Nếu số vừa rao có trên vé C: ô đó `data-hit="true"` (viền đỏ); hàng chỉ còn thiếu đúng 1 số có `data-waiting="true"` ở ô thiếu | ui |
| 3 | P3 | Chạm 1 ô số | Không đổi (ô không chạm được ở Auto) | ui |

**Kết quả:** ⬜

---

### TC-T006-12 · Thanh KINH chỉ hiện với người có vé khi ván đang chơi; người không vé thấy ghi chú xem
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | permission | AC-17, AC-06 †, NFR-12, FLOW-03 A3 | chrome |

**Tiền điều kiện:** `game-running` rồi `game-paused`, `game-waiting` (seed lần lượt).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | `game-running`: đăng nhập B, `/room` | `kinh-bar` + `btn-kinh` "KINH" hiện | ui |
| 2 | P3 | Đổi C, `/room` | `kinh-bar` hiện | ui |
| 3 | P1 | Đổi H, `/room` | **Không** có `kinh-bar`; `spectator-note` "Bạn đang xem ván này. Lấy vé khi ván kết thúc." | ui |
| 4 | P2 | Seed `game-paused`, B `/room` | `kinh-bar` vẫn hiện khi `paused` | ui |
| 5 | P1 | H (có scheduler) với `game-running`: console `[draw]` | Có log gọi `drawNumber` role `host`. Người xem không vé (nếu thêm 1 tài khoản mới vào phòng) **không** có log `[draw]` role backup (backup chỉ cho người có vé) | console |
| 6 | P2 | Seed `game-waiting`, B `/room` | **Không** có `kinh-bar` (ván `waiting`) | ui |

**Kết quả:** ⬜

---

### TC-T006-13 · KINH vé chưa đủ hàng: vẫn ghi lượt (miss), ván chờ duyệt, KHÔNG có toast "kinh hụt"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-18 †, FLOW-08 E2, E3 | chrome |

**Tiền điều kiện:** `game-row-ready` (`red_a` của B chưa đủ hàng).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, `/room`, bấm "KINH" (1 vé → gửi ngay, không sheet) | ≤ 1 giây toast "Bình B KINH!" (đúng câu này; **không** có toast "kinh hụt"); nút KINH khóa ~1 giây | ui, toast |
| 2 | P2 | Quan sát màn | `game-subtitle` "Ván 1 · Chờ host duyệt KINH"; `claim-card` có `claim-item-u_tk_b-red_a` "Bình B · vé Đỏ A" kèm "Vé chưa đủ hàng" (`data-result=miss`); số ngừng rao; nút đổi thành "Đã KINH vé này" (disabled) | ui |
| 3 | P2 | Emulator UI › `games/{id}` | `status = awaiting_confirm`, `claims = [{uid:"u_tk_b", ticket_id:"red_a", result:"miss", row:null}]`, `resume_status = running`, `next_call_at = null` | emulator-ui |
| 4 | P3 | Đổi C, `/room` (mở sau) | Thấy `claim-card` giống B; không có toast cũ khi mới mở màn | ui |

**Kết quả:** ⬜

---

### TC-T006-14 · Đang chờ duyệt vẫn KINH thêm được; vé đã KINH bị khóa
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-22 †, AC-47 (mới), FLOW-08 A2, A3, BR-28 | chrome |

**Tiền điều kiện:** `game-awaiting` (`claims=[C blue_a win row0]`, `resume_status=running`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Đăng nhập C, mở `/room` | Không toast cũ hiện khi mở màn; `game-subtitle` "Ván 1 · Chờ host duyệt KINH"; `claim-card` có `claim-item-u_tk_c-blue_a`; `kinh-bar` **hiện** (không bị ẩn); nút "KINH" enabled vì còn vé Lam B | ui |
| 2 | P3 | Bấm "KINH" | Sheet: dòng "Kinh vé Lam A · Đã KINH vé này" **disabled**; "Kinh vé Lam B" bấm được | ui |
| 3 | P3 | Bấm "Kinh vé Lam B" | Toast "Cúc C KINH!"; `claim-card` có thêm `claim-item-u_tk_c-blue_b`; Emulator: `claims` dài 2, **`status` vẫn `awaiting_confirm`**, `resume_status` vẫn `running` | ui, emulator-ui |
| 4 | P3 | Quan sát nút KINH | Hiện "Đã KINH vé này", disabled (cả 2 vé đã trong `claims`) | ui |
| 5 | P2 | Đổi B, `/room`, bấm "KINH" | Lượt `red_a` được append (claims dài 3), status giữ `awaiting_confirm` | ui, emulator-ui |

**Kết quả:** ⬜

---

### TC-T006-15 · ~~Đồng kinh trong cửa sổ 5 giây~~ (bỏ)
~~bỏ~~ — cửa sổ `claim_window`/đồng kinh bị bỏ theo specs mới (plan 6.3 #1, #2); thay bằng TC-T006-14. ID giữ để không đánh lại số.

---

### TC-T006-16 · Người chơi rời phòng khi ván chờ bắt đầu
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-33 †, FLOW-11 b1–5, BR-22, BR-02 | chrome |

**Tiền điều kiện:** `game-waiting`. B đã đăng nhập ở `/room`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Bấm "Rời" | Dialog `leave-dialog` `data-variant="simple"`: "Rời phòng?" + "Vé của bạn sẽ được trả về bộ. Bạn có thể vào lại bằng link mời nếu phòng chưa đầy."; "Ở lại" / "Rời phòng" | ui |
| 2 | P2 | Bấm "Rời phòng" | Về `/`; banner `Bạn đã rời phòng "Phòng chơi (chờ)".` | url, ui |
| 3 | P2 | Emulator UI | `users/u_tk_b.current_room_id = null`; `rooms/r_gm_wait.member_count` giảm 1 (3→2); doc `players/u_tk_b` **bị xóa**; `last_event.type = member_left`; RTDB `presence/r_gm_wait/u_tk_b` và `presence_access/r_gm_wait/u_tk_b` không còn | emulator-ui |
| 4 | P3 | Đổi C (hoặc H) mở `/room` | Thấy toast "Bình B đã rời phòng" nếu đang mở lúc B rời (mở sẵn trước bước 2, thao tác xen kẽ) | toast |

**Kết quả:** ⬜

---

### TC-T006-17 · Người chơi rời giữa ván: dialog cảnh báo vé bị hủy
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-34 †, FLOW-11, BR-21 (không còn `GAME_IN_PROGRESS`/`HOST_CANNOT_LEAVE`) | chrome |

**Tiền điều kiện:** `game-running`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, `/room`, bấm "Rời" | Nút **không** bị khóa; dialog `data-variant="playing"`: "Ván đang diễn ra: vé của bạn sẽ bị hủy và bạn không thể báo KINH nữa. Vào lại bằng link mời nếu phòng chưa đầy." | ui |
| 2 | P2 | Bấm "Ở lại" | Dialog đóng, ván tiếp tục | ui |
| 3 | P2 | "Rời" → "Rời phòng" | Về `/` với banner `Bạn đã rời phòng "Phòng chơi (đang quay)".` | url, ui |
| 4 | P2 | Emulator UI | `users/u_tk_b.current_room_id = null`; `member_count` −1; doc `players/u_tk_b` **vẫn còn** (vé hủy, `claims` cũ giữ); ván vẫn `running`; `last_event.type = member_left` | emulator-ui |
| 5 | — | Sau khi rời, B gọi `createClaim` → `NOT_ROOM_MEMBER` | Xem `tests/emulator/room/leave-room.test.ts` (AC-34), `draw-number.test.ts` | — |

**Kết quả:** ⬜

---

### TC-T006-18 · Host đóng tab: người giữ vé thay host gọi số kế tiếp (dự phòng N+5 / N+10)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | resilience | AC-07, AC-08, FLOW-06 A4, Q-048, Q-052 | chrome |

**Tiền điều kiện:** `game-running`; B (`red_a`) là dự phòng 1, C (`blue_a`) dự phòng 2; `draw_interval_sec = 3` → B gọi sau ≈ N+5 = 8 giây, C sau ≈ N+10 = 13 giây kể từ số trước.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, mở `/room`, đợi 1–2 số (xác nhận `[draw]` role `host`) rồi **đóng hẳn tab/cửa sổ** của H | Ván chưa tự tạm dừng | — |
| 2 | P2 | Mở tab mới `/room` (cookie đã đổi: "Clear site data" rồi đăng nhập B) | Ván `running`; `called-count` = k | ui |
| 3 | P2 | Ghi `called-count`, chờ ≈ 8–10 giây kể từ số cuối | Có số mới; `read_console_messages` lọc `[draw]`: role `backup` (index 0), `drawn: true`; không tự tạm dừng | console, ui |
| 4 | P2 | Emulator UI/Cloud log (terminal chạy `npm run dev`): dòng `{"op":"drawNumber",...,"uid":"u_tk_b","role":"backup",...}` | Có dòng log cho B | emulator-ui |
| 5 | P2 | Tiếp tục theo dõi | Số kế tiếp vẫn do B gọi (cách nhau ≈ N + 5 s vì H vắng) | ui |
| 6 | P3 | Đổi C, mở `/room`; đồng thời **B đã đóng tab** (đóng tab B trước ở bước 7 của TC này, chỉ đóng sau khi hoàn tất bước 5) | Số kế tiếp xuất hiện ở C sau ≈ N + 10 giây kể từ số trước | ui |
| 7 | P3 | Console `[draw]` | role `backup` index 1, `drawn: true`; log server `uid = u_tk_c` | console |

Ghi chú: AC dựa trên timing; kết quả lệch ±1 giây là chấp nhận được. Nếu hẹn giờ trong tab nền bị Chrome hãm, ghi nhận và báo.

**Kết quả:** ⬜

---

### TC-T006-19 · Phòng còn ≤ 15 phút: chip đếm lùi và toast cảnh báo một lần
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | boundary | AC-35, FLOW-14 b1, BR-04 | chrome |

**Tiền điều kiện:** `game-near-expiry` (`expires_at = +14 phút`, ván `waiting`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, mở `/room` | `expiry-chip` "⏱ Còn 13:5x" (≈ 14:00 trừ vài giây) giảm 1 mỗi giây; toast "Phòng sẽ hết hạn sau 15 phút" **một lần** | ui, toast |
| 2 | P1 | Tải lại trang | Chip tiếp tục đếm; (toast cảnh báo là cục bộ theo phiên: ghi nhận có hiện lại hay không, không coi là lỗi) | ui |
| 3 | P1 | Seed `game-waiting` (còn 8 giờ), mở `/room` | **Không** có `expiry-chip`, không toast cảnh báo | ui |

**Kết quả:** ⬜

---

### TC-T006-20 · Ván chờ bắt đầu hết hạn: phòng đóng, cả 3 về trang chủ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-36, FLOW-14 b2, 3, 5, 6, BR-04 | chrome |

**Tiền điều kiện:** `game-expiring-waiting` (`expires_at = +60s`); mở `/room` ngay sau seed.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, mở `/room` | `expiry-chip` đếm lùi từ ≈ 0:5x | ui |
| 2 | P1 | Chờ chip về 0:00 + vài giây (jitter 0–2s) | Tự về `/` với banner `Phòng "Phòng chơi (hết hạn, chờ)" đã hết hạn.` | url, ui |
| 3 | P1 | Emulator UI | `rooms/r_gm_expw`: `status = closed`, `close_reason = expired`, `member_count = 0`, `last_event.type = room_closed`; ván `cancelled`; `users/{u_tk_h,u_tk_b,u_tk_c}.current_room_id = null`; RTDB `presence/r_gm_expw` không còn | emulator-ui |
| 4 | P2, P3 | Đổi B (rồi C), mở `/` | Không còn "phòng hiện tại"; (nếu mở `/room` → về `/` với banner hết hạn) | url, ui |

**Kết quả:** ⬜

---

### TC-T006-21 · Ván đang quay hết hạn: phòng chuyển "Đóng sau ván này", ván vẫn chạy
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-37, FLOW-14 b4, A2, BR-04 | chrome |

**Tiền điều kiện:** `game-expiring-running` (`expires_at = +60s`); mở `/room` ngay.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, `/room` | Ván đang quay, chip đếm lùi | ui |
| 2 | P1 | Chờ hết hạn | Toast "Phòng sẽ đóng khi ván này kết thúc"; chip đổi thành "Đóng sau ván này"; **số vẫn tiếp tục** rao | ui, toast |
| 3 | P1 | Emulator UI | `rooms/r_gm_expr.status = closing`, `last_event.type = room_closing`; ván vẫn `running` | emulator-ui |
| 4 | P1 | Đóng tab H, mở B (`/room`), đợi 10–15 giây | Ván vẫn quay nhờ người dự phòng (kể cả khi host offline) | ui |
| 5 | P1 | Host bấm "⏸ Tạm dừng" rồi "▶ Tiếp tục" khi phòng `closing` | Cả hai thành công (resume được cả khi phòng `closing`) | ui |

**Kết quả:** ⬜

---

### TC-T006-22 · Ván chờ duyệt KINH hết hạn: ván kết thúc, phòng đóng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-38 †, FLOW-14 A1, Q-042 | chrome |

**Tiền điều kiện:** `game-awaiting-expiring` (`awaiting_confirm`, `claims=[C blue_a win]`, `expires_at = +60s`); mở `/room` ngay bằng P2 (B).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, `/room` | Thẻ `claim-card` của C hiện; chip đếm lùi | ui |
| 2 | P2 | Chờ hết hạn | Về `/` với banner `Phòng "Phòng chơi (chờ duyệt, hết hạn)" đã hết hạn.` | url, ui |
| 3 | P2 | Emulator UI | Ván `status = finished`, `result = won`, `winners` = các claim `win` (1 phần tử: C `blue_a`); phòng `closed`/`expired`; mọi `current_room_id = null` | emulator-ui |
| 4 | — | Nhánh claims chỉ có `miss` → `no_winner` | Xem `tests/emulator/room/expire-room.test.ts`, `room-expiry.test.ts` | — |

**Kết quả:** ⬜

---

### TC-T006-23 · Phòng đã quá hạn từ trước (không ai mở): mở lại app thì phòng đóng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-39, AC-10 (nhánh startGame quá hạn), FLOW-14 E1, Q-051 | chrome |

**Tiền điều kiện:** `game-expired-idle` (`waiting`, `expires_at` đã qua 1 giờ, phòng vẫn `active`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, mở `/room` | Màn hiện thoáng qua rồi tự về `/` (hoặc vào thẳng `/`) | url |
| 2 | P1 | Quan sát `/` | Banner `Phòng "Phòng chơi (đã quá hạn)" đã hết hạn.` | ui |
| 3 | P1 | Emulator UI | `rooms/r_gm_idle`: `status = closed`, `close_reason = expired`; ván `cancelled`; `current_room_id = null` cho cả 3 | emulator-ui |
| 4 | — | Bắt đầu ván khi quá hạn → `ROOM_CLOSING` + lazy expiry đã commit | Xem `start-pause-resume.test.ts` (AC-10) | — |

**Kết quả:** ⬜

---

### TC-T006-24 · Số cuối rao khi phòng đang đóng: ván kết thúc và phòng đóng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | boundary | AC-26, BR-04, FLOW-14 b4–6 | chrome |

**Tiền điều kiện:** `game-nearly-done-closing` (89 số; phòng `closing`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, `/room` (chip "Đóng sau ván này") | `expiry-chip` = "Đóng sau ván này"; sau ≤ 5 giây số 90 được rao | ui |
| 2 | P1 | Ngay sau số 90 | Về `/` với banner `Phòng "Phòng chơi (sắp hết số, đang đóng)" đã hết hạn.` | url, ui |
| 3 | P1 | Emulator UI | Ván `finished` (`no_winner`); `rooms/r_gm_nearc.status = closed`, `close_reason = expired`; `current_room_id = null` cho 3 người; **không** tạo ván mới `waiting` | emulator-ui |

**Kết quả:** ⬜

---

### TC-T006-25 · Bố cục 1 vé: ô 38×32, chữ 17px, panel số 96px
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | responsive | AC-27, NFR-12 | chrome |

**Tiền điều kiện:** `game-running`; viewport 375×812; B (1 vé). Sau đó lặp lại ở 360×800.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, `/room` | `my-tickets` `data-count="1"`, `number-panel` `data-compact="false"` | ui |
| 2 | P2 | `javascript_tool`: `getBoundingClientRect()` của 1 ô `ticket-red_a [data-cell]` (không `empty`); `getComputedStyle().fontSize` | Ô rộng 38 (±1), cao 32 (±1); `fontSize = 17px` | layout |
| 3 | P2 | `getBoundingClientRect()` của `number-panel` | Cao = 96 (±1) | layout |
| 4 | P2 | `document.documentElement.scrollWidth` so với `innerWidth` | Không tràn ngang (`scrollWidth ≤ innerWidth`) | layout |
| 5 | P2 | `resize_window` 360×800, lặp bước 2–4 | Không tràn ngang; panel đủ 96px | layout |

**Kết quả:** ⬜

---

### TC-T006-26 · Bố cục 2 vé: ô 38×28, header 52, panel 52, vừa viewport không cuộn
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | responsive | AC-28, Q-049, NFR-12 | chrome |

**Tiền điều kiện:** `game-running`; viewport 375×812; C (2 vé).
**Mong đợi theo plan:** cả 2 vé nằm trọn viewport, `my-tickets-area.scrollTop = 0`, đáy vé thứ 2 ≤ đỉnh `kinh-bar`. **Lưu ý (lệch tiềm ẩn):** code đặt dock 2 vé = KINH 48 + thanh dưới 48 = 96 (đỉnh KINH ≈ y 716); ước tính chồng: header 52 + panel 52 + host/me bar 40 + 3 khoảng 6 + 2 vé (2×282 + 6) ≈ 732 > 716 → có thể vé 2 bị cuộn/che. QC **đo thực tế** và ghi số liệu vào kết quả; mong đợi PASS theo plan, nếu số đo > đỉnh `kinh-bar` thì FAIL kèm số đo.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Đăng nhập C, `/room` | `my-tickets` `data-count="2"`, `number-panel` `data-compact="true"` | ui |
| 2 | P3 | `getBoundingClientRect()` ô của `ticket-blue_a` | 38 (±1) × 28 (±1) | layout |
| 3 | P3 | `room-header` và `number-panel` | Cao 52 và 52 (±1); panel 1 dòng | layout |
| 4 | P3 | `ticket-blue_b` bottom và `kinh-bar` top; `my-tickets-area.scrollTop`; `window.scrollY` | `ticket-blue_b.bottom ≤ kinh-bar.top`; `scrollTop = 0` (không cuộn); cả 2 vé trong 0–812 | layout |
| 5 | P3 | `kinh-bar`, `bottom-bar` | Cùng hiển thị trong viewport (bottom-bar chạm đáy 812); không tràn ngang | layout |
| 6 | P3 | `resize_window` 360×800, lặp bước 4–5 | Không tràn ngang (ghi nhận nếu 2 vé không vừa ở 800 — specs chỉ cam kết 375×812) | layout |

**Kết quả:** ⬜

---

### TC-T006-27 · Bật tiếng: chạm lớp "Chạm để bật tiếng", số mới phát giọng rao trễ ≤ 500ms
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | happy | AC-29, NFR-14, NFR-05, SUP-02, ADR-08 | chrome |

**Tiền điều kiện:** `game-running`; profile sạch (sessionStorage chưa có `loto:soundUnlocked`); `loto:sound` mặc định (Bật).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, `/room` | Lớp phủ `sound-gate` "Chạm để bật tiếng" hiện; sau lớp phủ vẫn thấy số/`last-number` cập nhật (người chưa chạm vẫn thấy số, không có log `[audio]` phát) | ui, console |
| 2 | P2 | Chạm `sound-gate` | Lớp phủ biến mất; `sessionStorage['loto:soundUnlocked'] = "1"` | ui |
| 3 | P2 | Chờ số mới (P1 hoặc dự phòng đang gọi) rồi đọc `[audio]` | Có log `console.debug('[audio]', {...latencyMs...})` với `latencyMs ≤ 500` cho mỗi số mới sau lúc chạm; không có log cho các số đã có từ trước khi tải | console |
| 4 | P2 | Tải lại trang (cùng phiên) | Không hiện lại `sound-gate` | ui |
| 5 | P2 | Chuẩn: audio chỉ phát khi `called_numbers` tăng sau lần tải đầu | Không log `[audio]` ở thời điểm tải trang | console |

Ghi chú: không nghe được âm thanh qua Chrome tự động → chỉ xác nhận qua log; nghe thật là `manual` nếu cần.

**Kết quả:** ⬜

---

### TC-T006-28 · Thiếu clip số 90 / manifest lỗi: vẫn chơi bằng hình, có toast khi không tải được
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | error | AC-30, FLOW-07 A1, BR-26 | chrome |

**Tiền điều kiện:** `game-nearly-done` (manifest mẫu `public/audio/manifest.json` **thiếu số 90**).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, `/room`, chạm "Chạm để bật tiếng" | Gate đóng | ui |
| 2 | P2 | Chờ số 90 (≤ 5 giây) | `last-number` = 90 hiện bình thường; không crash/lỗi đỏ trong console; log `[audio]` ghi không có clip (null) | ui, console |
| 3 | P2 | Chặn tải manifest (DevTools › Network › block `/audio/manifest.json`) rồi tải lại `/room` (seed lại `game-running`), chạm bật tiếng | Toast "Không tải được tiếng rao"; vẫn thấy số và chơi tiếp | toast, ui |

**Kết quả:** ⬜

---

### TC-T006-29 · Toast sự kiện phòng: đúng câu, tự ẩn sau 3 giây, không bắn toast sự kiện cũ khi mở màn
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | multi-user | AC-31, SUP-01, NFR-02 | chrome |

**Tiền điều kiện:** `game-awaiting` (có `last_event = claim_submitted` cũ).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, mở `/room` | **Không** toast "Cúc C KINH!" (sự kiện cũ có sẵn lúc mở màn) | toast |
| 2 | P2 | Ở B bấm "KINH" (vé `red_a`) | Toast "Bình B KINH!" ≤ 1 giây, tự ẩn sau ≈ 3 giây | toast |
| 3 | P2 | Bấm liên tiếp nhiều hành động tạo `last_event` (dùng H: Bắt đầu → Tạm dừng → Tiếp tục ở các TC khác) | Các toast lần lượt hiện (queue), không chồng/mất; câu đúng: "Ván 1 bắt đầu", "Ván đã tạm dừng", "Ván tiếp tục" | toast |
| 4 | P3 | C rời phòng khi B còn mở (TC-16/17) | B thấy toast "Cúc C đã rời phòng" | toast |
| 5 | — | Map đủ 16 type `last_event` | `last-event-toast.test.ts`, `use-room-toasts.test.tsx` | — |

**Kết quả:** ⬜

---

### TC-T006-30 · Sheet Mời (chỉ host): link, mã phòng, copy, hạn link, ẩn "Chia sẻ…" khi không hỗ trợ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | happy | AC-32 †, FLOW-03 b1–3, A4, BR-05, SUP-06 | chrome |

**Tiền điều kiện:** `game-waiting`. Cấp quyền clipboard cho `localhost:3000` nếu Chrome hỏi.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, `/room`, bấm "Mời" (`btn-invite`) | Sheet `invite-sheet` "Mời bạn bè": `invite-link` = `http://localhost:3000/join/GAMEWAITINGINVITE0000`; `invite-code` = "GMW234" (chữ lớn); `invite-expires` "Link hết hạn lúc HH:mm (cùng lúc phòng đóng) · 3/16 người" | ui |
| 2 | P1 | Bấm "Copy link" | Toast "Đã copy link"; clipboard (`navigator.clipboard.readText()`) = link ở bước 1 | toast, ui |
| 3 | P1 | Bấm "Copy mã" | Toast "Đã copy mã phòng"; clipboard = "GMW234" | toast, ui |
| 4 | P1 | Đóng sheet rồi mở lại | Cùng link, cùng mã | ui |
| 5 | P1 | `javascript_tool`: kiểm `typeof navigator.share` rồi thấy nút "Chia sẻ…" (`btn-share`) | Có `navigator.share` → nút hiện; xóa `navigator.share` (`navigator.share = undefined`) trước khi mở sheet → nút **ẩn** | ui |
| 6 | P2 | Đăng nhập B, `/room` | Không có nút "Mời" | ui |
| 7 | P3 | Đăng nhập C, `/room` | Không có nút "Mời" | ui |

**Kết quả:** ⬜

---

### TC-T006-31 · Wake Lock theo trạng thái ván
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | alt | AC-41, NFR-15 | chrome |

**Tiền điều kiện:** `game-running`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập H, `/room`; `document.documentElement.dataset.wakelock` | `active` khi `running` (nếu trình duyệt hỗ trợ; nếu không → `unsupported`, không lỗi console) | console |
| 2 | P1 | Bấm "⏸ Tạm dừng" rồi đọc dataset | `released` | console |
| 3 | P1 | Bấm "▶ Tiếp tục" rồi đọc dataset | `active` | console |
| 4 | P1 | Ép `unsupported` (xóa `navigator.wakeLock` bằng `delete Navigator.prototype.wakeLock` rồi tải lại) | `unsupported`, màn vẫn dùng bình thường, không lỗi | console |

**Kết quả:** ⬜

---

### TC-T006-32 · Mất kết nối rồi nối lại: banner hiện/ẩn, dữ liệu khớp
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | resilience | AC-42, NFR-07, SCR-04 #22 | chrome |

**Tiền điều kiện:** `game-running`; B (đánh dấu 1 ô ở chế độ Tự dò trước, vd ô X).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, `/room`, đánh dấu 1 ô | Ô `data-marked="true"` | ui |
| 2 | P2 | Mở `http://localhost:3000/room?debug=offline` | ≤ ~2 giây hiện banner `conn-banner` "Mất kết nối – đang kết nối lại…" | ui |
| 3 | P2 | Chờ ≤ 30 giây rồi mở `/room?debug=online` | Banner ẩn; `called-count` khớp `rooms.called_numbers` trong Emulator UI; vé và ô đã đánh dấu (X) vẫn `data-marked="true"` | ui, emulator-ui |
| 4 | P2 | So với máy khác (đổi P3, `/room`) | `called-count`/`last-number` bằng nhau | ui |

**Kết quả:** ⬜

---

### TC-T006-33 · Bảng 90 số
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | alt | AC-43, BR-20, SCR-04.A9 | chrome |

**Tiền điều kiện:** `game-running` (5 số: 11, 24, 37, 52, 68).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, `/room`, bấm "Bảng 90 ›" (`btn-board90`) | Sheet `board90` "Bảng 90 số"; `board-called` "Số đã rao (5/90)" (hoặc số lớn hơn nếu đã có số mới); lưới 1–90 (`board-cell-1`..`board-cell-90`) 10 cột | ui |
| 2 | P2 | Kiểm các ô | Các số trong `called_numbers` tô đậm; số vừa rao (ô `board-cell-68` nếu chưa có số mới) viền đỏ; `board-recent` "Gần nhất: …" | ui |
| 3 | P2 | Bấm đóng (`board-close`) | Sheet đóng, về lại màn chơi | ui |
| 4 | P2 | Ván `waiting` mới (`game-waiting`): nút "Bảng 90 ›" | (ván chưa có số) — ghi nhận nút/khung hiển thị đúng (không lỗi) | ui |

**Kết quả:** ⬜

---

### TC-T006-34 · Thanh nút dưới: Chat/Người/Lịch sử/Cài đặt mở khung "Sắp có"
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | alt | SCR-04 #16 (T-008..T-012 chưa làm) | chrome |

**Tiền điều kiện:** `game-running`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập B, `/room`, bấm tab "Chat" (`tab-chat`) | `sheet-coming-soon` hiện "Sắp có"; thanh KINH và thanh dưới vẫn hiển thị | ui |
| 2 | P2 | Đóng, lặp "Người", "Lịch sử", "Cài đặt" | Mỗi tab mở khung "Sắp có" | ui |
| 3 | P2 | Bấm tab "Vé" | Mở sheet "Chọn vé" (SCR-05) | ui |

**Kết quả:** ⬜

---

### TC-T006-35 · Tải lại giữa ván: trạng thái ván và vé được khôi phục
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | resilience | NFR-07, AC-15, AC-42 | chrome |

**Tiền điều kiện:** `game-running`; B đang ở `/room`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đánh dấu 2 ô, ghi `called-count` | — | ui |
| 2 | P2 | Tải lại (`F5`) | Thấy `room-skeleton` ngắn rồi màn đầy đủ; `game-subtitle` đúng, `called-count` ≥ trước đó; 2 ô vẫn đánh dấu; không toast sự kiện cũ | ui |
| 3 | P2 | Mở `/room` khi `users/u_tk_b.current_room_id = null` (xóa bằng Emulator UI) | Về `/` (không kẹt ở skeleton) | url |

**Kết quả:** ⬜

---

### TC-T006-36 · Rule `startGame`: dọn player, `NO_TICKETS_HELD`, `ROOM_CLOSING`, `NOT_ROOM_HOST`
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | permission | AC-02, AC-09 (API), AC-10, AC-11, AC-01 (dữ liệu) | automated |

`tests/emulator/game/start-pause-resume.test.ts` (AC-01 happy + random đều; AC-02 xóa player rỗng/đã rời và làm mới tên/ảnh; AC-09 `NO_TICKETS_HELD` không ghi gì; AC-10 quá hạn → `ROOM_CLOSING` + ván `cancelled` + phòng `closed`; AC-11 `NOT_ROOM_HOST` cho start/pause/resume; AC-12/13 pause/resume; AC-37 pause/resume vẫn chạy khi phòng quá hạn/`closing`).
**Kết quả:** ⬜ (chrome-tester bỏ qua)

---

### TC-T006-37 · Rule `drawNumber`: quá sớm, trùng seq, người xem/đã rời, 3 lời gọi song song
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | boundary | AC-04, AC-05, AC-06 † | automated |

`tests/emulator/game/draw-number.test.ts` (AC-04 `DRAW_TOO_EARLY` + `details[0].nextCallAt` + biên −300ms; AC-05 `seq` cũ → `drawn:false`, 3 lời gọi song song → đúng 1 `drawn:true`; AC-06 ngoài phòng/không có doc player/đã rời giữa ván → `NOT_ROOM_MEMBER`; người có doc player gọi được; lazy expiry; log cấu trúc) + `src/features/game/shared/domain/pick-next-number.test.ts`.
**Kết quả:** ⬜ (chrome-tester bỏ qua)

---

### TC-T006-38 · Rule `createClaim`: miss/paused/awaiting/lỗi vé
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-18 †, AC-19 †, AC-20 †, AC-22 †, AC-23 † | automated |

`tests/emulator/game/create-claim.test.ts` (claim đúng → `awaiting_confirm`; claim hụt vẫn ghi `miss`; KINH khi `paused` → `awaiting_confirm`, `resume_status = paused`; đang `awaiting_confirm` → chỉ append; `NOT_TICKET_HOLDER`, `TICKET_ALREADY_CLAIMED` (vé khác cùng người vẫn được), `CLAIMS_CLOSED` khi `waiting/finished/cancelled`, người đã rời → `NOT_ROOM_MEMBER`, lazy expiry) + `src/features/game/client/lib/game-errors.test.ts` (map toast: "Vé này không tham gia ván", "Vé này đã báo KINH, chờ host duyệt", "Ván đã kết thúc", "Chưa gửi được KINH, bấm lại").
**Kết quả:** ⬜ (chrome-tester bỏ qua)

---

### TC-T006-39 · Vé 2 hàng cùng đủ: chọn hàng nhỏ hơn
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | boundary | AC-24, Q-050 | automated |

`src/features/game/shared/domain/check-claim.test.ts` (2 hàng đủ → `row` nhỏ nhất; 4/5 → miss; ô 0 bỏ qua; số rao từ đầu ván vẫn tính).
**Kết quả:** ⬜ (chrome-tester bỏ qua)

---

### TC-T006-40 · `expireRoom`: chưa tới hạn → `ROOM_NOT_EXPIRED`, gọi lặp idempotent
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | boundary | AC-40, AC-36/37/38 (dữ liệu), Q-051 | automated |

`tests/emulator/room/expire-room.test.ts`, `tests/emulator/room/room-expiry.test.ts`, `src/features/room/shared/domain/decide-expiry.test.ts` (đủ tổ hợp phòng × ván, biên `now == expires_at`).
**Kết quả:** ⬜ (chrome-tester bỏ qua)

---

### TC-T006-41 · Security Rules: client không ghi được trạng thái ván; người ngoài không đọc `games`
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | security | AC-44, ADR-03, NFR-08, NFR-09 | automated |

`tests/emulator/game/game-rules.test.ts` (thành viên đọc `rooms`/`games`/`players`; host/player không ghi `called_numbers`, `status`, `claims`, `players`; người ngoài/phòng khác/đã rời không đọc được; presence không ghi được sau khi rời/đóng phòng).
**Kết quả:** ⬜ (chrome-tester bỏ qua)

---

### TC-T006-42 · Hiệu năng `createClaim`: P95 < 1000 ms
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | boundary | AC-45, NFR-03 | automated |

`tests/emulator/game/claim-latency.test.ts` (20 lượt liên tiếp trên emulator).
**Kết quả:** ⬜ (chrome-tester bỏ qua)

---

### TC-T006-43 · Cuộn ván mới chỉ chép player online (BR-29)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | boundary | AC-46 (mới), AC-25 † (dữ liệu), AC-26 (dữ liệu), BR-29 | automated |

`tests/emulator/game/draw-number.test.ts` › "drawNumber — the 90th number (rollover)": chép player online (AC-25), người đã rời/không có presence không được chép (AC-46, vé trống ở ván mới), phòng `closing` → ván `finished`, phòng `closed` (AC-26).
**Kết quả:** ⬜ (chrome-tester bỏ qua)

---

### TC-T006-44 · Hàm thuần phía client (dò, Auto, toast, clip, bố cục)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | boundary | AC-15/16/27/28/30/31 (đơn vị), AC-07/08 (đơn vị) | automated |

`src/features/game/shared/domain/{marks-store,auto-effects,ticket-layout,select-clip,last-event-toast,backup-order,draw-fire-at}.test.ts`, `src/features/game/client/hooks/{use-draw-scheduler,use-expiry-timer,use-wake-lock,use-audio,use-connection}.test.tsx`, `src/features/game/client/components/{kinh-bar,leave-dialog,claim-card,invite-sheet,board90-sheet,sound-gate,room-screen}.test.tsx`.
**Kết quả:** ⬜ (chrome-tester bỏ qua)

---

## Từ điển
- **Ưu tiên:** P0 luồng chính, phải pass để đóng task (luôn nằm trong smoke) · P1 luồng thay thế/lỗi/biên quan trọng · P2 hiếm gặp, cosmetic.
- **Loại:** `happy` · `alt` (luồng A*) · `error` (luồng E*) · `boundary` (biên BR) · `permission` · `multi-user` · `resilience` · `responsive` · `security`.
- **Chạy bằng:** `chrome` · `automated` (Vitest, đã có file test) · `manual`.
- **Cách kiểm:** `url` · `ui` · `toast` · `emulator-ui` · `cookie` · `console` · `network` · `layout`.
