# T-006 · Chơi trọn ván ở Phòng chơi (SCR-04): bắt đầu, rao số, dò vé, báo KINH, rời phòng, hết hạn

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-05 | M1 | 21 (màn lớn, giữ 1 task – Q-053) | T-005 | TODO |

## 1. Mục tiêu demo
Sau task này: **host + 2 player (3 profile Chrome, viewport 375×812) mở SCR-04 `/room`; host bấm "Bắt đầu" → server rao ngay số đầu, mọi người nghe rao (sau khi chạm "Bật tiếng"), cứ N giây host gọi `drawNumber` một lần; tắt tab host thì player giữ vé nhỏ nhất rao thay sau 5 giây. Player giữ 2 vé thấy cả 2 vé cùng màn không cuộn, tự dò chạm ô đánh dấu, bấm KINH → thấy "kinh hụt" (cả phòng có toast) hoặc kinh đúng (ván sang `claim_window`, thẻ "KINH!"). Host tạm dừng/tiếp tục; player rời phòng khi ván chờ; tới hạn 8 giờ (giả lập bằng seed `expires_at`) thì phòng đóng hoặc chờ đóng.**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-04.A0 | Tải phòng/ván/player/vé, ghi presence, theo dõi `users/{me}.current_room_id`, chuyển listener khi `current_game_id` đổi |
| Thao tác | SCR-04.A1 | Lớp "Chạm để bật tiếng" + nạp audio (ADR-08) |
| Thao tác | SCR-04.A2 | Đánh dấu ô (Tự dò), localStorage |
| Thao tác | SCR-04.A3 | Bấm KINH (1 vé / chọn 1 trong 2 vé) |
| Thao tác | SCR-04.A4, A5, A6 | Bắt đầu / Tạm dừng / Tiếp tục (host) |
| Thao tác | SCR-04.A7 | Sheet Mời: chia sẻ / copy link |
| Thao tác | SCR-04.A8 | Rời phòng (không phải host, chỉ ván `waiting`) |
| Thao tác | SCR-04.A9 | Sheet bảng 90 số |
| Thao tác | SCR-04.A10 | Client điều nhịp `drawNumber` (host + dự phòng) |
| Thao tác | SCR-04.A11 | Đếm ngược hết hạn, gọi `expireRoom` |
| API | `startGame` | rao ngay số đầu (Q-052) |
| API | `pauseGame`, `resumeGame` | |
| API | `drawNumber` | gồm nhánh hết 90 số → ván `finished` `no_winner` + tạo ván mới |
| API | `createClaim` | gồm nhánh đồng thắng trong `claim_window` (phía server) |
| API | `leaveRoom` | |
| API | `expireRoom`; **mở rộng** helper `applyLazyExpiry` đã tạo ở T-003 (thêm nhánh `claim_window`/`awaiting_confirm`) | |
| Dữ liệu | TBL-02 `rooms` | ghi `called_numbers`, `last_event`, `status`, `member_count`, `closed_at`, `close_reason`, `current_game_id`, `game_count` |
| Dữ liệu | TBL-05 `games` | ghi `status`, `pause_reason`, `next_call_at`, `claim_window_ends_at`, `winners`, `result`, `player_count`, `started_at`, `ended_at`; tạo ván mới khi hết 90 số |
| Dữ liệu | TBL-06 `players` | xóa player không vé lúc Bắt đầu; chép `display_name`/`photo_url`; xóa khi rời; chép sang ván mới |
| Dữ liệu | TBL-01 `users` | `current_room_id = null` khi rời / phòng đóng |
| Dữ liệu | TBL-03 `tickets` | chỉ đọc (grid) |
| Dữ liệu | TBL-08 RTDB `presence`, `presence_access` | client ghi online; server xóa khi rời/đóng phòng |
| Rule | BR-04, BR-10, BR-14, BR-15, BR-16, BR-17, BR-18 (mở cửa sổ + đồng thắng phía server), BR-19, BR-20, BR-21, BR-22, BR-26 | |
| Phụ trợ | SUP-01 (toast `last_event`), SUP-02 (tiếng rao, manifest), SUP-03 (client điều nhịp), SUP-06 (Web Share), SUP-10 (hiệu ứng Auto) | |
| NFR | NFR-01, NFR-03, NFR-05, NFR-07, NFR-08, NFR-12 (bố cục 1/2 vé – Q-049), NFR-14, NFR-15 | |
| Flow | FLOW-06 (1–5, A1, A2, A4, A5, E1–E3) | |
| Flow | FLOW-07 (1–8, A1, E1–E3) | |
| Flow | FLOW-08 bước 1–6 + A1–A4 + E1–E4 | |
| Flow | FLOW-11 (1–5, E0, E1) | |
| Flow | FLOW-14 (1–6, A1, A2, E1) | |
| Flow | FLOW-03 bước 1–3, A3, A4 (Mời trong phòng, khách vào lúc ván chạy) | |

**Ngoài phạm vi:**
- Thẻ/overlay SCR-09 đầy đủ, đếm ngược 5 giây + `closeClaimWindow`, host xác nhận `confirmGame`, tiếng chúc mừng, ván mới sau khi có người thắng → **T-007**. Ở T-006 khi ván sang `claim_window` chỉ hiện **thẻ tạm** "{tên} KINH! Đang chờ đồng kinh…" (giữ vị trí thẻ phía trên, không che vé/KINH) và ván đứng ở `claim_window` `[ASSUMED]`.
- UI đổi mode Tự dò/Auto, bật/tắt tiếng, đổi nhịp quay → **T-012**. T-006 đọc localStorage với mặc định Tự dò, tiếng Bật; `draw_interval_sec` mặc định 5 (seed được đặt 3 để test nhanh).
- Sheet Chat (T-008), Người (T-009), Lịch sử (T-010), Cài đặt (T-012), badge chat chưa đọc (T-008). Thanh nút dưới có đủ 5 nút; sheet chưa làm mở khung trống "Sắp có" `[ASSUMED]`.
- Kick, thu hồi vé (T-009/T-005); đăng xuất ở phòng (T-011).
- Kho tiếng rao thật (BIZ-09, ngoài app) — dùng **bộ audio mẫu**.
- Đo tải 800 người (NFR-06) – Q-053.

## 3. Việc cần làm
> Làm **tuần tự theo phần A → I**; mỗi phần xong chạy test của phần đó rồi mới sang phần sau. Mã đặt theo cấu trúc T-001 (lớp domain thuần / service / Server Action / UI).

### Phần A — Domain thuần (không phụ thuộc Firebase, test Vitest trước)
- [ ] `TICKET_ORDER` = `[red_a, red_b, orange_a, orange_b, yellow_a, yellow_b, green_a, green_b, teal_a, teal_b, blue_a, blue_b, purple_a, purple_b, pink_a, pink_b]` (thứ tự cố định Đỏ A → Hồng B – Q-052); dùng lại nếu T-005 đã có.
- [ ] `checkClaim(grid: number[81], called: number[]) → {win: boolean, row: number | null}`: hàng có đủ 5 số đều nằm trong `called` → thắng; nhiều hàng đủ → `row` nhỏ nhất (Q-050) (BR-17).
- [ ] `pickNextNumber(called, randomInt) → number`: chọn đều trong các số 1–90 chưa rao; `randomInt` tiêm vào (prod = `crypto.randomInt`) để test xác định (NFR-08).
- [ ] `backupOrder(players: {uid, ticket_ids}[], hostUid) → uid[]`: bỏ host, bỏ player không vé, sắp theo chỉ số vé nhỏ nhất trong `TICKET_ORDER` (Q-052, ADR-05).
- [ ] `drawFireAt({nextCallAt, role: 'host' | {backupIndex k}, serverOffsetMs}) → localEpochMs`: host = `next_call_at`; dự phòng thứ k (k = 1, 2, …) = `next_call_at + 5k s`; quy đổi sang giờ máy bằng `serverOffset`.
- [ ] `decideExpiry({roomStatus, gameStatus, now, expiresAt})` → `none | cancel_and_close | mark_closing | finish_and_close | close` (BR-04, FLOW-14): `waiting` → hủy ván + đóng; `running`/`paused`/`claim_window` → `closing`; `awaiting_confirm` → ván `finished` + đóng; phòng `closing` mà ván đã `finished`/`cancelled` → đóng.
- [ ] `autoEffects(grid, called, lastNumber) → {marked: Set, hit: number | null, waitingRows: number[]}`: hàng còn thiếu đúng 1 số = "chờ" (SUP-10, BR-20).
- [ ] `lastEventToast(lastEvent, me) → string | null`: map đủ 15 `last_event.type` sang câu tiếng Việt ở SCR-04 #17 (từ điển NFR-16).
- [ ] `selectClip(manifest, kind, n?, rng) → url | null`: chọn ngẫu nhiên trong các câu của số `n` / câu nối / kinh hụt; thiếu → `null` (Q-029, BR-26).
- [ ] `ticketLayout(count: 1 | 2) → {cell: {w: 38, h: 32} | {w: 38, h: 28}, font, titleFont, blockGap, compactHeader}` (Q-049).

### Phần B — Lazy expiry + `expireRoom` (làm trước các action khác vì mọi action gọi nó)
- [ ] Service `applyLazyExpiry(tx, roomRef, now)`: đọc room + ván hiện tại (+ query `users where current_room_id == roomId` khi cần đóng) **trước mọi ghi** (ràng buộc transaction Firestore); áp `decideExpiry`; trả `{roomStatus, gameStatus, closed: boolean}`. Nếu T-004 đã có bản rút gọn thì thay bằng bản đầy đủ này `[ASSUMED]`.
- [ ] Hàm `closeRoomInTx(tx, room, users, now)`: `status = closed`, `closed_at`, `close_reason = expired`, `member_count = 0`, `last_event = room_closed`, `users.current_room_id = null` cho mọi người có `current_room_id == roomId` (Q-039).
- [ ] Sau commit (ngoài transaction): xóa RTDB `presence/{roomId}`, `presence_access/{roomId}` bằng admin SDK; lỗi xóa chỉ ghi log, không làm fail action `[ASSUMED]`.
- [ ] Nhánh `mark_closing`: `rooms.status = closing`, `last_event = room_closing`; ván chạy tiếp.
- [ ] Nhánh `finish_and_close` (ván `awaiting_confirm`): `games.status = finished`, `result = won` (giữ `winners`), `ended_at`, rồi đóng phòng (BR-28, Q-042).
- [ ] `expireRoomAction({roomId})`: xác thực → thành viên (`NOT_ROOM_MEMBER`) → `now < expires_at` → `409 ROOM_NOT_EXPIRED` → `applyLazyExpiry` → trả `RoomExpireResult {roomStatus, gameStatus}`. Idempotent (gọi lần 2 khi đã `closing` trả lại trạng thái hiện tại).
- [ ] Gắn `applyLazyExpiry` vào đầu transaction của **mọi** action trên phòng trong task này (`startGame`, `pauseGame`, `resumeGame`, `drawNumber`, `createClaim`, `leaveRoom`) và rà lại các action T-003..T-005 (`createRoom` khi `current_room_id` trỏ phòng quá hạn, `joinRoom`, `takeTicket`, `releaseTicket`, `renewTicketSet`, `reclaimPlayerTickets`) đã gọi đúng helper (ADR-05).
- [ ] Quy ước khi lazy expiry vừa đóng/chuyển `closing` mà action bị chặn: transaction **commit phần hết hạn** rồi trả lỗi nghiệp vụ (không throw để khỏi rollback) — vd `startGame` → `ROOM_CLOSING`; phòng đã `closed` → `NOT_ROOM_MEMBER` `[ASSUMED]`.

### Phần C — Server Actions ván chơi (lớp service + Zod + transaction, trả `ActionResult<T>`)
- [ ] **Thời gian server cho client:** mọi action của task trả kèm `meta.serverNow` (ISO) trong envelope `ActionResult` (không đổi schema `data`) để client tính `serverTimeOffset` (ADR-05) `[ASSUMED]` — api-contract chỉ nói "thời gian server trả trong response". `DRAW_TOO_EARLY` có `details[0].nextCallAt`.
- [ ] `startGameAction({roomId, gameId})` (BR-14, Q-047, Q-052):
  - Host (`NOT_ROOM_HOST`), ván hiện tại (`GAME_STALE`), `waiting` (`GAME_NOT_WAITING`), phòng `active` và `now < expires_at` (`ROOM_CLOSING`).
  - Đọc players + `users` của từng player; xóa player `ticket_ids` rỗng hoặc `current_room_id ≠ roomId`; còn 0 → `422 NO_TICKETS_HELD`, không ghi gì.
  - Chép `display_name`, `photo_url` hiện tại vào player; `player_count`, `started_at = now`, `status = running`, `pause_reason = null`.
  - `rooms.called_numbers = [pickNextNumber([])]`, `games.next_call_at = now + draw_interval_sec`, `last_event = game_started` (text "Ván {n} bắt đầu").
  - Trả `GameState`.
- [ ] `pauseGameAction`: host, ván hiện tại `running` (`GAME_NOT_RUNNING`); `status = paused`, `pause_reason = host`, `next_call_at = null`, `last_event = game_paused`. **Không** dùng `loop_version` (SCR-04.A5 còn nhắc nhưng DB/API đã bỏ) `[ASSUMED]`.
- [ ] `resumeGameAction`: host, `paused` (`GAME_NOT_PAUSED`); `status = running`, `pause_reason = null`, `next_call_at = now + N`, `last_event = game_resumed`. Phòng `closing` vẫn tiếp tục được (BR-04).
- [ ] `drawNumberAction({roomId, gameId, seq})` — đúng thứ tự api-contract:
  1. Lazy expiry; ván hiện tại (`GAME_STALE`); người gọi là host **hoặc** có doc player của ván, ngược lại `403 NOT_ROOM_MEMBER`; ván `running` (`GAME_NOT_RUNNING`).
  2. `seq ≠ len(called_numbers)` → `200 {drawn: false, …trạng thái hiện tại}`.
  3. `now < next_call_at − 300ms` → `409 DRAW_TOO_EARLY` + `nextCallAt`.
  4. Append `pickNextNumber`; `next_call_at = now + draw_interval_sec` (đọc giá trị hiện tại → nhịp mới áp dụng từ số kế – BR-15).
  5. Đủ 90 số → ván `finished`, `result = no_winner`, `ended_at`, `next_call_at = null`, `last_event = game_finished`; phòng `active` → gọi helper `rolloverToNewGame` (tạo ván `waiting` `seq_no + 1`, chép player còn trong phòng với `ticket_ids` giữ nguyên, `rooms.current_game_id`, `game_count + 1`; `called_numbers` giữ tới lần Bắt đầu sau – TBL-02); phòng `closing` → `closeRoomInTx` (BR-19, BR-07, BR-11). Ván kết thúc ngay khi rao số thứ 90 vì `DrawRequest.seq` tối đa 89 `[ASSUMED]`. `rolloverToNewGame` để T-007 (`confirmGame`) dùng lại.
  6. Ghi log có cấu trúc `{op: 'drawNumber', roomId, gameId, uid, role: host|backup, seq, drawn, code}` (dùng để quan sát dự phòng khi test, NFR-17).
- [ ] `createClaimAction({roomId, gameId, ticketId})` (BR-17, BR-18, BR-28, NFR-03):
  - Zod `ticketId` theo pattern `TicketId` (`VALIDATION_FAILED`); thành viên (`NOT_ROOM_MEMBER`); ván hiện tại (`GAME_STALE`); trạng thái ∈ `running/paused/claim_window` ngược lại `CLAIMS_CLOSED`; `ticketId ∈ players/{uid}.ticket_ids` (`403 NOT_TICKET_HOLDER`); vé đã trong `winners` → `TICKET_ALREADY_WON`.
  - `checkClaim(tickets/{ticketId}.grid, rooms.called_numbers)` lúc xử lý.
  - Hụt → `last_event = claim_miss` (text "{tên} kinh hụt"), **giữ nguyên** trạng thái (running vẫn quay, paused vẫn dừng – FLOW-08 A1/E3).
  - Đúng đầu tiên (`running`/`paused`) → append `winners {uid, display_name, ticket_id, color, row, claimed_at}`, `status = claim_window`, `next_call_at = null`, `pause_reason = null`, `claim_window_ends_at = now + 5s`, `last_event = claim_win`.
  - Đúng trong `claim_window` → chỉ append `winners` (đồng thắng – BR-18; UI đếm ngược ở T-007).
  - Transaction tuần tự hóa các lượt gần cùng lúc (FLOW-08 A3).
- [ ] `leaveRoomAction({roomId})` (BR-21, BR-22, Q-052): host → `409 HOST_CANNOT_LEAVE`; ván khác `waiting` → `409 GAME_IN_PROGRESS`; `users.current_room_id = null`, `member_count − 1`, xóa doc player của mình, `last_event = member_left` ("{tên} đã rời phòng"); sau commit xóa RTDB `presence/{roomId}/{uid}` và `presence_access/{roomId}/{uid}`. Trả `data: null`.
- [ ] Mã lỗi + thông điệp tiếng Việt lấy từ bảng mã lỗi api-contract (đã có khung ở T-001); thêm các mã mới của task nếu chưa có.

### Phần D — Data & rules
- [ ] Không tạo collection mới. Kiểm `firestore.rules` (T-003) đã cho thành viên đọc `rooms/{roomId}` và cây con (`games`, `players`, `tickets`); **mọi ghi từ client bị cấm** (ADR-03) — thêm test deny cho các field của task: `rooms.called_numbers`, `games.status`, `games.winners`, `players`.
- [ ] RTDB rules (T-004/T-005): client chỉ ghi `presence/{roomId}/{uid}` của mình khi `presence_access/{roomId}/{uid} == true`; test: sau `leaveRoom` / phòng đóng, client **không** ghi lại presence được.
- [ ] Index: `users.current_room_id` single (tự có) cho query đóng phòng; không cần composite mới. `rooms.called_numbers`, `last_event` tắt index (TBL-02) — thêm `fieldOverrides` vào `firestore.indexes.json` nếu T-003 chưa có.
- [ ] Script seed `scripts/seed-t006.ts` (`npm run seed:t006 -- <scenario> [--expires-in <giây>] [--interval <giây>]`) `[ASSUMED]` tên/cờ, ghi bằng admin SDK lên emulator, in ra `roomId`:
  - `base`: user H (host), B, C trong Auth emulator (email cố định `host@test.local`, `b@test.local`, `c@test.local`), phòng "Phòng test T-006" `draw_interval_sec = 3`, `expires_at = now + 8h` (hoặc `--expires-in`), ván 1 `waiting`, player B `[red_a]`, C `[blue_a, blue_b]`, H không vé, cả 3 `current_room_id = room`, `member_count = 3`, `presence_access` cho 3 người.
  - `empty`: như `base` nhưng không có player.
  - `nearly-done`: ván `running`, đã rao 89 số, `next_call_at = now + 3s`.
  - `awaiting`: ván `awaiting_confirm`, `winners = [C, blue_a, row 0]`.
  - Lệnh phụ `fill-row --ticket <id> --row <r>`: append các số còn thiếu của hàng `r` vé `<id>` vào `called_numbers` của ván đang chạy (để test kinh đúng).
- [ ] Bộ audio mẫu `public/audio/v0/…` + `public/audio/manifest.json` `{version: "v0", numbers: {"1": [...], …, "90": [...]}, connectors: [≥2], congrats: [≥1], miss: [≥1]}`; AAC mono 48 kbps (ADR-08). Tạo offline bằng TTS máy (vd `say -v Linh` + `ffmpeg`) qua script `scripts/make-sample-audio.sh` `[ASSUMED]`; **bỏ trống cố ý số 90** trong manifest mẫu để kiểm FLOW-07 A1 `[ASSUMED]`.

### Phần E — UI khung màn & vé (`/room`, mobile-first, cột ≤ 480px – NFR-12)
- [ ] Hook `useRoomState()` (A0): listener `rooms/{roomId}`, `games/{current_game_id}`, `games/{current}/players`, `tickets` (chỉ vé của mình), `users/{me}`; khi `current_game_id` đổi → hủy listener ván cũ, gắn ván mới; ghi `presence/{roomId}/{me} = {online:true, display_name, photo_url, at}` + `onDisconnect → online:false` (dùng lại T-005 nếu đã có).
- [ ] `users.current_room_id` thành null / đọc phòng bị từ chối → điều hướng SCR-02, ghi lý do vào `sessionStorage` cho banner SCR-02 #4: `left` (mình bấm Rời) / `expired` (`rooms.status = closed` hoặc `expires_at` đã qua) / `unknown` (Q-050).
- [ ] **Loading:** header (tên phòng từ cache nếu có) + skeleton panel + 1 vé; thanh nút dưới hiện ngay.
- [ ] **Header (1–4):** tên phòng; phụ đề "Ván {game_count} · {Chờ bắt đầu / Đang quay / Tạm dừng / Chờ đồng kinh / Chờ host xác nhận}"; chip "⏱ Còn mm:ss" khi `expires_at − now ≤ 15 phút`; `rooms.status = closing` → chip "Đóng sau ván này"; nút **Mời** chỉ host; nút **Rời** chỉ người không phải host (Q-050) — khóa (disabled + gợi ý "Ván đang diễn ra, chưa rời được") khi ván khác `waiting` (Q-052).
- [ ] **Panel số đã rao (5–8):** số vừa rao 76px (phần tử cuối `called_numbers`); chưa có → "–" + "Chưa rao số nào" + "Nhịp quay {draw_interval_sec} giây/số"; "Số thứ {len}/90"; đếm ngược "Số kế tiếp sau {n} giây" từ `next_call_at` (đã trừ `serverTimeOffset`); `paused` → "⏸ Host đã tạm dừng"; `claim_window`/`awaiting_confirm` → "Đang kiểm tra KINH"; 5 số gần nhất (mới nhất bên trái); link "Bảng 90 ›".
- [ ] **Thanh điều khiển host (9):** `waiting` → "▶ Bắt đầu" + "{x}/16 vé đã có chủ · {member_count} người trong phòng"; 0 vé có chủ → nút khóa + "Cần ít nhất 1 người lấy vé" (FLOW-06 E1); `rooms.status = closing` → ẩn nút. `running` → "⏸ Tạm dừng". `paused` → "▶ Tiếp tục". `claim_window`/`awaiting_confirm` → ẩn. Nút bấm xong khóa tới khi action trả về (tránh bấm đúp).
- [ ] **Dòng trạng thái player (10):** `waiting` "Chờ host bắt đầu · {x} vé đã có chủ"; `paused` "Host đã tạm dừng ván"; đang chơi "Bạn đang chơi {n} vé · mode {Tự dò/Auto}".
- [ ] **Component `PaperTicket`** (dùng lại lưới vé giấy của SCR-05 #4 nếu T-005 đã làm, thêm prop `size: 'single' | 'double'`): khung viền màu vé, dải tiêu đề "✦ VÉ {MÀU} {A/B} ✦", 9×9 chia 3 khối 3 hàng ngăn bằng dải hoa văn; ô trống đặc màu đậm (Đỏ #e2574c, Cam #f08a3c, Vàng #e6b800, Lục #4caf50, Ngọc #1aa39a, Lam #3f7fd1, Tím #8e5cc7, Hồng #e0609e); ô số nền trắng chữ đen đậm; ô đã đánh dấu nền tối chữ trắng.
  - **1 vé:** ô 38×32, chữ 17px, tiêu đề 24px, dải ngăn 10px, vé ≈ 336px; panel số rao đầy đủ 96px.
  - **2 vé (Q-049):** header 52px; panel số rao rút thành **1 dòng 52px** (số 44px + 5 số gần nhất + đếm ngược + "Bảng 90 ›"); ô 38×28, chữ 15px, tiêu đề 16px, dải ngăn 5px → vé ≈ 282px; 2 vé + khoảng 6px ≈ 570px nằm gọn giữa đáy thanh số (y = 144) và đỉnh thanh KINH (y = 732) ở 375×812, **không cuộn**.
  - Gắn `data-testid="ticket-{id}"`, `data-cell="{n}"`, `data-marked` để AI kiểm bằng JS trên Chrome.
- [ ] **Empty (13):** `waiting` và không có vé → card "Bạn chưa có vé" + nút "Chọn vé" mở SCR-05; ván đang chạy và mình không là player → "Bạn đang xem ván này. Lấy vé khi ván kết thúc." (FLOW-03 A3, BR-10). Ván `waiting` chạm vé → mở SCR-05.
- [ ] **Đánh dấu (A2, Tự dò):** chạm ô có số khi ván không `waiting` → toggle; lưu localStorage `{gameId}:{ticketId}` = mảng số; cho đánh dấu cả số chưa rao (Q-050); ô trống không chạm được; localStorage lỗi → giữ trong bộ nhớ trang; tải lại trang → khôi phục (NFR-07).
- [ ] **Mode Auto (SUP-10, BR-20):** đọc localStorage `loto:mode` (`manual` mặc định | `auto`) `[ASSUMED]` tên key; Auto → ô đánh dấu tính từ `called_numbers` (không cho chạm), số vừa rao có trên vé viền đỏ + `navigator.vibrate(100)` nếu có, hàng thiếu 1 số viền "chờ". Tự dò không gợi ý gì.
- [ ] **Thanh KINH (14) + popover (15):** cố định ngay trên thanh nút dưới, nằm trên mọi sheet; hiện khi ván `running`/`paused`/`claim_window` **và** mình có doc player ≥ 1 vé. 1 vé → gọi `createClaim` ngay; 2 vé → action sheet "Kinh vé {màu} {A/B}" từng vé (FLOW-08 A4). Bấm xong khóa 1 giây. `awaiting_confirm` → khóa "KINH (đã đóng)". Lỗi: `NOT_TICKET_HOLDER` → "Vé này không tham gia ván"; `CLAIMS_CLOSED` → "Đã hết lượt báo KINH"; `TICKET_ALREADY_WON` → "Vé này đã được ghi thắng" `[ASSUMED]` câu chữ; lỗi mạng → "Chưa gửi được KINH, bấm lại".
- [ ] **Thẻ tạm `claim_window`:** "{tên người thắng đầu} KINH! Đang chờ đồng kinh…" ở nửa trên, không che vé + KINH (T-007 thay bằng SCR-09) `[ASSUMED]`.
- [ ] **Thanh nút dưới (16):** Vé (SCR-05, có sẵn từ T-005) · Chat · Người · Lịch sử · Cài đặt (khung "Sắp có"); sheet chiếm vùng giữa header và thanh KINH.
- [ ] **Sheet bảng 90 (20, A9):** lưới 1–90 × 10 cột, số đã rao tô đậm, số vừa rao viền đỏ, "Số đã rao ({n}/90)", dòng thứ tự gần nhất.
- [ ] **Sheet Mời (19, A7):** link `{origin}/join/{invite_code}`, "Link hết hạn lúc HH:mm (cùng lúc phòng đóng) · {member_count}/16 người" (GMT+7); "Chia sẻ…" gọi `navigator.share` (ẩn nếu không hỗ trợ; người dùng hủy → không làm gì); "Copy link" → toast "Đã copy link", Clipboard lỗi → chọn sẵn text trong ô link. Mở lại luôn cùng link (FLOW-03 A4).
- [ ] **Dialog rời (21, A8):** "Rời phòng?" + hệ quả (vé trả về bộ; vào lại bằng link nếu phòng chưa đầy – BR-22, BR-25); "Ở lại" / "Rời phòng". Trước khi gọi `leaveRoom`: hủy `onDisconnect` và ngừng ghi presence `[ASSUMED]`; thành công → sessionStorage lý do `left` → SCR-02 banner "Bạn đã rời phòng "{tên}"."; lỗi mạng → toast "Không rời được phòng, thử lại"; `GAME_IN_PROGRESS` → toast "Ván đang diễn ra, chưa rời được".
- [ ] Toàn bộ chữ đặt trong từ điển tiếng Việt (NFR-16); giờ hiển thị GMT+7.

### Phần F — Client timer điều nhịp `drawNumber` (SUP-03, ADR-05, Q-051, Q-052)
- [ ] Hook `useDrawScheduler({room, game, players, me})` chỉ chạy khi `game.status = running` và mình là **host** hoặc **player có vé** của ván; người xem không có vé không hẹn giờ.
- [ ] Vai trò: host → `fireAt = next_call_at`; người khác → `k = backupOrder(players, host_uid).indexOf(me) + 1`, `fireAt = next_call_at + 5k s` (Q-052). Thứ tự tính từ danh sách player của ván (không đổi khi ván chạy) nên mọi client tính giống nhau; **không** lọc theo presence `[ASSUMED]` (lượt trùng vô hại nhờ `seq`).
- [ ] Mỗi lần `called_numbers.length`, `next_call_at`, `status` hoặc `gameId` đổi → hủy timer cũ, hẹn timer mới theo `(gameId, seq = len(called_numbers))`. Thấy số mới trước giờ của mình → không gọi.
- [ ] Khi bắn: gọi `drawNumberAction({roomId, gameId, seq})`.
  - `drawn: true` / `drawn: false` → không làm gì (listener cập nhật).
  - `DRAW_TOO_EARLY` → cập nhật `serverTimeOffset` từ `meta.serverNow` + `nextCallAt`, hẹn lại.
  - `GAME_NOT_RUNNING` / `GAME_STALE` → dừng, chờ listener.
  - Lỗi mạng → thử lại sau 1 giây, tối đa 3 lần `[ASSUMED]`.
- [ ] `serverTimeOffset` = `serverNow − (tGửi + tNhận)/2`, cập nhật sau mỗi action; khởi tạo bằng 0. Dùng chung cho đếm ngược `next_call_at` và `expires_at`.
- [ ] `visibilitychange` → `visible`: tính lại ngay (bù timer bị trình duyệt hãm khi tab ẩn).
- [ ] **Wake Lock (NFR-15):** `navigator.wakeLock.request('screen')` khi `running`, nhả khi trạng thái khác; xin lại khi tab hiện lại; không hỗ trợ → bỏ qua. Ghi `document.documentElement.dataset.wakelock = active | released | unsupported` để kiểm được `[ASSUMED]`.
- [ ] Log dev `console.debug('[draw]', {role, k, seq, fireAt, result})` (chỉ dev) để AI đọc khi test trên Chrome.

### Phần G — Client timer hết hạn phòng (A11, BR-04, FLOW-14)
- [ ] Đếm ngược từ `rooms.expires_at` (đã trừ offset). Còn ≤ 15 phút → chip "⏱ Còn mm:ss" + toast cục bộ một lần "Phòng sẽ hết hạn sau 15 phút" (không cần API – Q-051).
- [ ] Về 0, hoặc mở màn mà `now ≥ expires_at` và phòng còn `active` → gọi `expireRoomAction` sau jitter ngẫu nhiên 0–2 giây (giảm tranh chấp khi cả phòng cùng gọi) `[ASSUMED]`; `ROOM_NOT_EXPIRED` → cập nhật offset, hẹn lại; phòng `closing` → hiện "Phòng đóng khi ván này kết thúc", chip "Đóng sau ván này", ẩn "Bắt đầu" ở ván mới; `closed` → listener `users` đưa về SCR-02 banner "Phòng "{tên}" đã hết hạn.".

### Phần H — Audio (SUP-02, ADR-08, NFR-05, NFR-14)
- [ ] Lớp "Chạm để bật tiếng" (18): hiện lần đầu vào phòng trong phiên trình duyệt (`sessionStorage loto:soundUnlocked`) nếu localStorage `loto:sound` ≠ `off` (mặc định Bật) `[ASSUMED]` tên key.
- [ ] Chạm → tạo/`resume()` `AudioContext`; tải `manifest.json` rồi tải + `decodeAudioData` theo thứ tự ưu tiên: câu nối → kinh hụt → chúc mừng (để sẵn cho T-007) → số 1–90; cache `AudioBuffer` trong bộ nhớ. Lỗi tải manifest → toast "Không tải được tiếng rao", vẫn chơi bằng hình.
- [ ] Phát khi listener thấy `called_numbers` **tăng** trong lúc đang ở phòng (không phát lại số cũ khi mới mở / kết nối lại): câu của số mới chọn ngẫu nhiên (`selectClip`) phát ngay (mục tiêu ≤ 0,5 giây sau khi số hiện – NFR-05); sau câu số, nếu còn ≥ 1 giây trước `next_call_at` thì phát 1 câu nối ngẫu nhiên `[ASSUMED]` cách xen câu nối. Câu chưa giải mã xong / thiếu trong manifest → chỉ hiện số (Q-029, FLOW-07 A1).
- [ ] `last_event.type = claim_miss` (mới) → phát câu kinh hụt.
- [ ] Hàng đợi phát: số mới đến khi câu nối đang phát → dừng câu nối, phát số.
- [ ] Log dev `console.debug('[audio]', {kind, n, clip, latencyMs})` (latency = lúc bắt đầu phát − lúc listener nhận số) để kiểm NFR-05 trên Chrome.

### Phần I — Toast & kết nối (SUP-01, NFR-02, NFR-07)
- [ ] Toast (17) dưới header: khi `rooms.last_event.at` đổi **sau lần tải đầu** (không bắn toast cho sự kiện cũ lúc mở màn) → `lastEventToast`; tự ẩn 3 giây; nhiều sự kiện liên tiếp xếp hàng.
- [ ] Banner mất kết nối (22): theo RTDB `.info/connected` + lỗi snapshot Firestore → "Mất kết nối – đang kết nối lại…"; có lại kết nối → ẩn, dữ liệu tự đồng bộ (listener), ô đánh dấu đọc lại từ localStorage.
- [ ] Hook debug chỉ ở dev: `?debug=offline` gọi `goOffline(rtdb)` + `disableNetwork(firestore)`, `?debug=online` bật lại — để AI giả lập mất mạng trên Chrome `[ASSUMED]`.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-01 | Phòng ván 1 `waiting`, B giữ `red_a`, C giữ `blue_a`+`blue_b`, H (host) không vé | H bấm "▶ Bắt đầu" | ≤ 1 giây cả 3 thấy phụ đề "Ván 1 · Đang quay", một số lớn + "Số thứ 1/90", toast "Ván 1 bắt đầu"; Emulator: `games.status = running`, `player_count = 2`, `started_at`, `next_call_at ≈ now + 3s`, `rooms.called_numbers` có 1 phần tử, player có `display_name`/`photo_url` | FLOW-06 b1–5, FLOW-07 b1, Q-052 |
| AC-02 | Lúc Bắt đầu còn player doc có `ticket_ids` rỗng và player có `current_room_id` khác phòng | H bấm Bắt đầu | Hai player đó bị xóa khỏi `players`; `player_count` chỉ đếm player có vé còn trong phòng | Q-047, BR-14 |
| AC-03 | Ván `running`, host online, nhịp 3 giây | Chờ 15 giây | Mỗi ~3 giây có số mới; "Số thứ n/90" tăng 1; đếm ngược "Số kế tiếp sau {n} giây"; 5 số gần nhất mới nhất bên trái; tại cùng thời điểm 3 cửa sổ hiện cùng số (lệch ≤ 1 giây); số không trùng | FLOW-07 b1–5, BR-15, BR-20, NFR-01 |
| AC-04 | Ván `running`, `next_call_at` ở tương lai | Client gọi `drawNumber` sớm hơn `next_call_at − 300ms` | `409 DRAW_TOO_EARLY` kèm `nextCallAt`; `called_numbers` không đổi | ADR-05, NFR-08 |
| AC-05 | Ván `running`, `len(called_numbers) = 5` | 3 client cùng gọi `drawNumber{seq:5}` sau `next_call_at`; 1 client gọi `seq:4` | Đúng 1 lượt `drawn: true`, các lượt còn lại `200 drawn: false`; `called_numbers` dài 6 | ADR-05, Q-052 |
| AC-06 | Thành viên không phải host và không có doc player (người xem) | Gọi `drawNumber` | `403 NOT_ROOM_MEMBER`; UI người xem không hẹn giờ gọi | ADR-05, NFR-09 |
| AC-07 | Ván `running`, B (vé `red_a`) là dự phòng 1, C (`blue_a`) dự phòng 2 | Đóng cửa sổ H | Số kế xuất hiện ở B, C sau ≈ `N + 5` giây kể từ số trước; log server `drawNumber` `uid = B`, `role = backup`; ván tiếp tục, không tự tạm dừng | FLOW-06 A4, FLOW-07 b1, Q-048, Q-052 |
| AC-08 | Như AC-07, H và B đều đã đóng | Chờ | Số kế xuất hiện ở C sau ≈ `N + 10` giây; log `uid = C` | Q-052 |
| AC-09 | Ván `waiting`, chưa ai giữ vé | H mở phòng | Nút Bắt đầu khóa + "Cần ít nhất 1 người lấy vé"; gọi thẳng `startGame` → `422 NO_TICKETS_HELD`, dữ liệu không đổi | FLOW-06 E1, BR-14 |
| AC-10 | Phòng đã quá `expires_at` (ván `waiting`) | H gọi `startGame` | Trả `409 ROOM_CLOSING`; lazy expiry đã commit: ván `cancelled`, phòng `closed` | FLOW-06 E2, BR-14, BR-04 |
| AC-11 | B, C không phải host | Mở SCR-04 | Không thấy thanh điều khiển host; gọi `startGame`/`pauseGame`/`resumeGame` → `403 NOT_ROOM_HOST` | FLOW-06 E3, NFR-09 |
| AC-12 | Ván `running` | H bấm "⏸ Tạm dừng" | Cả phòng: phụ đề "Tạm dừng", panel "⏸ Host đã tạm dừng", toast "Ván đã tạm dừng"; 10 giây không có số mới; `next_call_at = null`, `pause_reason = host`; `drawNumber` → `GAME_NOT_RUNNING` | FLOW-06 A1, BR-16 |
| AC-13 | Ván `paused` | H bấm "▶ Tiếp tục" | Toast "Ván tiếp tục"; số kế xuất hiện sau ≈ N giây; `status = running` | FLOW-06 A2 |
| AC-14 | Ván `waiting` | Player chạm ô có số | Ô không đổi (không đánh dấu); chạm vé mở SCR-05 | SCR-04 trạng thái `waiting`, BR-10 |
| AC-15 | Ván `running`, mode Tự dò | C chạm ô số (đã rao hoặc chưa rao) rồi tải lại trang | Ô đổi sang nền tối chữ trắng ngay; chạm lại thì bỏ; sau tải lại các ô vẫn được đánh dấu; không có gợi ý nào trên vé | BR-20, Q-050, NFR-07 |
| AC-16 | localStorage `loto:mode = auto`, ván `running` | Có số mới | Mọi số đã rao trên vé tự đánh dấu; số vừa rao có trên vé viền đỏ; hàng thiếu đúng 1 số có viền "chờ"; ô không chạm được | SUP-10, BR-20, FLOW-07 b7 |
| AC-17 | Ván `running`/`paused`/`claim_window` | Xem màn | Thanh KINH hiện với B, C (có vé); **không** hiện với H (không vé) và khi ván `waiting`; H thấy "Bạn đang xem ván này. Lấy vé khi ván kết thúc." | NFR-12, SCR-04 #13, #14, FLOW-03 A3 |
| AC-18 | Ván `running`, vé `red_a` chưa đủ hàng | B bấm KINH | ≤ 1 giây cả 3 thấy toast "B kinh hụt"; B, C (đã bật tiếng) phát câu kinh hụt; ván vẫn `running`, số tiếp tục; nút KINH khóa 1 giây sau khi bấm | FLOW-08 E2, E3, BR-17, NFR-03 |
| AC-19 | Ván `paused` | B bấm KINH hụt | Toast kinh hụt; ván vẫn `paused` | FLOW-08 A1, Q-029 |
| AC-20 | Ván `running`, hàng 0 vé `blue_a` đã đủ 5 số trong `called_numbers` (gồm số rao từ trước) | C bấm KINH → chọn "Kinh vé Lam A" | ≤ 1 giây: `games.status = claim_window`, `winners[0] = {C, blue_a, row 0}`, `claim_window_ends_at = +5s`, `next_call_at = null`, `last_event = claim_win`; cả phòng thấy thẻ "C KINH! Đang chờ đồng kinh…" và không còn số mới; KINH vẫn bấm được | FLOW-08 b2–6, BR-16, BR-17, BR-18, NFR-03 |
| AC-21 | C giữ 2 vé, ván `running` | C bấm KINH | Hiện action sheet 2 dòng "Kinh vé Lam A" / "Kinh vé Lam B"; chọn dòng nào gửi đúng `ticketId` đó; cả 2 vé đều có thể được ghi thắng riêng | FLOW-08 A4, SCR-04 #15 |
| AC-22 | Ván `claim_window`, đã có 1 người thắng | Player khác (hoặc vé thứ 2) kinh đúng | `winners` thêm phần tử, `status` vẫn `claim_window`; kinh hụt trong cửa sổ chỉ toast hụt | BR-18, FLOW-08 A2, A3 |
| AC-23 | — | Gọi `createClaim` với vé không thuộc mình / vé đã thắng / ván `waiting` hoặc `awaiting_confirm` | Lần lượt `403 NOT_TICKET_HOLDER` (toast "Vé này không tham gia ván", ván không dừng), `409 TICKET_ALREADY_WON`, `409 CLAIMS_CLOSED` (toast "Đã hết lượt báo KINH") | FLOW-08 E1, BR-22, BR-28 |
| AC-24 | Vé có 2 hàng cùng đủ | Kinh đúng | `winners.row` = chỉ số hàng nhỏ hơn | Q-050 |
| AC-25 | Ván `running` đã rao 89 số, không ai kinh | Tới nhịp | Số thứ 90 được rao; ván `finished`, `result = no_winner`; có ván mới `waiting` (`seq_no + 1`, `current_game_id`, `game_count` đổi), player còn trong phòng được chép sang với `ticket_ids` giữ nguyên; cả phòng thấy toast "Ván 1 kết thúc" và phụ đề "Ván 2 · Chờ bắt đầu" | BR-19, BR-07, BR-11, FLOW-07 E2, E3 |
| AC-26 | Như AC-25 nhưng phòng `closing` | Tới nhịp số 90 | Ván `finished` và phòng `closed`; mọi người về SCR-02 banner "Phòng … đã hết hạn" | BR-04, FLOW-14 b4–6 |
| AC-27 | B giữ 1 vé, viewport 375×812 | Xem SCR-04 | Ô vé 38×32 (±1px), chữ 17px, panel số rao đầy đủ 96px | NFR-12, SCR-04 Ghi chú UX |
| AC-28 | C giữ 2 vé, viewport 375×812, ván `running` | Xem SCR-04, không cuộn | Ô 38×28 (±1px); header 52px, panel số 1 dòng 52px; đáy vé thứ 2 ≤ đỉnh thanh KINH; cả 2 vé nằm trọn trong viewport (`scrollTop = 0`); KINH và thanh nút dưới hiển thị | Q-049, NFR-12 |
| AC-29 | Vào phòng lần đầu trong phiên, tiếng Bật | Thấy lớp "Chạm để bật tiếng", chạm | Lớp biến mất; số mới phát câu rao, log `[audio]` có `latencyMs ≤ 500`; người chưa chạm không phát tiếng nhưng vẫn thấy số | NFR-14, NFR-05, SUP-02, ADR-08 |
| AC-30 | Manifest thiếu câu cho số 90 / tải manifest lỗi | Số 90 được rao / bật tiếng | Chỉ hiện số, không lỗi / toast "Không tải được tiếng rao", vẫn chơi bằng hình | FLOW-07 A1, Q-029, BR-26 |
| AC-31 | Có sự kiện phòng | `last_event` đổi (bắt đầu, tạm dừng, tiếp tục, kinh hụt, KINH, rời…) | Toast đúng câu SCR-04 #17 ≤ 1 giây ở mọi máy, tự ẩn sau 3 giây; nhiều sự kiện liên tiếp lần lượt hiện; mở màn không bắn toast sự kiện cũ | SUP-01, NFR-02 |
| AC-32 | H là host | Bấm "Mời" | Sheet có link `/join/{invite_code}`, "Link hết hạn lúc HH:mm (GMT+7) · 3/16 người"; "Copy link" → toast "Đã copy link" và clipboard có link; đóng/mở lại vẫn cùng link; trình duyệt không có `navigator.share` → ẩn "Chia sẻ…". B, C không thấy nút Mời | FLOW-03 b1–3, A4, BR-05, SUP-06 |
| AC-33 | Ván `waiting`, B không phải host | B bấm "Rời" → "Rời phòng" | B về SCR-02 với banner "Bạn đã rời phòng "…"."; H, C thấy toast "B đã rời phòng"; Emulator: `users/B.current_room_id = null`, `member_count` giảm 1, doc player B bị xóa (vé `red_a` trống), RTDB `presence/{room}/B` và `presence_access/{room}/B` không còn | FLOW-11 b1–5, BR-22, BR-02 |
| AC-34 | Ván khác `waiting` | B xem nút "Rời" / gọi `leaveRoom` | Nút khóa + gợi ý; API `409 GAME_IN_PROGRESS`. H không có nút Rời; H gọi `leaveRoom` → `409 HOST_CANNOT_LEAVE` | FLOW-11 E0, E1, BR-21, Q-052 |
| AC-35 | `expires_at − now ≤ 15 phút` | Mở SCR-04 | Chip "⏱ Còn mm:ss" đếm lùi; toast "Phòng sẽ hết hạn sau 15 phút" một lần | FLOW-14 b1, BR-04 |
| AC-36 | Ván `waiting`, `expires_at` sắp tới | Đếm ngược về 0 | Client gọi `expireRoom`; ván `cancelled`, phòng `closed`, `close_reason = expired`, `member_count = 0`, `users.current_room_id = null` cho cả 3, RTDB presence phòng bị xóa; cả 3 về SCR-02 banner "Phòng "…" đã hết hạn." | FLOW-14 b2, 3, 5, 6, BR-04 |
| AC-37 | Ván `running`, `expires_at` tới | Đếm ngược về 0 | Phòng `closing`, `last_event = room_closing`, toast "Phòng sẽ đóng khi ván này kết thúc", chip "Đóng sau ván này"; ván vẫn quay (kể cả khi host offline) | FLOW-14 b4, A2, BR-04 |
| AC-38 | Ván `awaiting_confirm`, `expires_at` tới | Gọi `expireRoom` | Ván `finished` `result = won` giữ `winners`; phòng `closed` | FLOW-14 A1, BR-28, Q-042 |
| AC-39 | Phòng đã quá hạn khi không ai mở | Một thành viên mở lại app | Client gọi `expireRoom` (hoặc action kế tiếp áp lazy expiry) → phòng đóng; người đó về SCR-02 với banner hết hạn | FLOW-14 E1, Q-051 |
| AC-40 | `now < expires_at` | Gọi `expireRoom` | `409 ROOM_NOT_EXPIRED`, không đổi dữ liệu; gọi lần 2 khi đã `closing` → trả trạng thái hiện tại (idempotent) | Q-051 |
| AC-41 | Ván `running` | Xem `document.documentElement.dataset.wakelock` | `active` khi running; `released` khi tạm dừng/kết thúc; trình duyệt không hỗ trợ → `unsupported`, không lỗi | NFR-15 |
| AC-42 | Ván `running` | Ngắt kết nối (`?debug=offline`) rồi nối lại (`?debug=online`) trong ≤ 30 giây | Hiện banner "Mất kết nối – đang kết nối lại…"; nối lại → banner ẩn, số đã rao/vé/ô đánh dấu khớp với máy khác | NFR-07, SCR-04 #22 |
| AC-43 | Ván có ≥ 1 số | Bấm "Bảng 90 ›" | Sheet lưới 1–90 (10 cột), số đã rao tô đậm, số vừa rao viền đỏ, "Số đã rao ({n}/90)" | BR-20, SCR-04.A9 |
| AC-44 | Client đăng nhập là thành viên | Ghi trực tiếp `rooms.called_numbers` / `games.status` / `players` bằng Firebase JS SDK | Bị Security Rules từ chối; người ngoài phòng đọc `games` cũng bị từ chối | ADR-03, NFR-08, NFR-09 |
| AC-45 | Ván `running`, P95 | 20 lượt `createClaim` liên tiếp trên emulator | Thời gian xử lý action P95 < 1000 ms | NFR-03 |

## 5. Test
### Unit / integration
Vitest; nhóm "integration" chạy với Firebase Emulator Suite (Auth, Firestore, RTDB), mỗi test seed dữ liệu riêng, giả lập "now" bằng cách seed `next_call_at`/`expires_at`/`claim_window_ends_at` lệch so với hiện tại.

| Case | Phủ AC |
|---|---|
| `checkClaim`: hàng đủ 5 số → win + row; 4/5 → miss; số rao từ đầu ván vẫn tính; 2 hàng đủ → row nhỏ nhất; ô 0 bỏ qua | AC-18, AC-20, AC-24 |
| `pickNextNumber`: 10.000 lần không trả số đã rao; còn 1 số → trả đúng số đó; phân bố đều (chi-square lỏng) | AC-03 |
| `backupOrder`: bỏ host, bỏ player không vé, sắp theo vé nhỏ nhất (`red_a` < `blue_a` < `pink_b`); player 2 vé lấy vé nhỏ hơn | AC-07, AC-08 |
| `drawFireAt`: host = `next_call_at`; k=1 → +5s; k=2 → +10s; áp `serverOffset` | AC-07, AC-08 |
| `decideExpiry`: đủ 7 tổ hợp trạng thái phòng × ván, biên `now == expires_at` | AC-36, AC-37, AC-38, AC-40 |
| `autoEffects`: hàng thiếu đúng 1 số → waiting; số vừa rao có trên vé → hit | AC-16 |
| `lastEventToast`: 15 type → câu đúng; type lạ → null | AC-31 |
| `selectClip`: nhiều câu → ngẫu nhiên trong tập; số thiếu → null | AC-29, AC-30 |
| `ticketLayout(1/2)` đúng kích thước Q-049 | AC-27, AC-28 |
| Lưu ô đánh dấu: toggle, khôi phục; localStorage ném lỗi → bộ nhớ trang | AC-15 |
| `startGame` happy: status, `player_count`, `called_numbers` 1 phần tử, `next_call_at`, `last_event`, chép tên/ảnh | AC-01 |
| `startGame` xóa player rỗng / đã rời phòng | AC-02 |
| `startGame` `NO_TICKETS_HELD` (rollback, dữ liệu y nguyên), `GAME_NOT_WAITING`, `GAME_STALE`, `UNAUTHENTICATED` | AC-09 |
| `startGame` phòng quá hạn → `ROOM_CLOSING` + phòng đã `closed` | AC-10 |
| `startGame`/`pauseGame`/`resumeGame` bởi player → `NOT_ROOM_HOST` | AC-11 |
| `pauseGame` happy + `GAME_NOT_RUNNING`; `drawNumber` khi paused → `GAME_NOT_RUNNING` | AC-12 |
| `resumeGame` happy (`next_call_at = now + N`) + `GAME_NOT_PAUSED`; phòng `closing` vẫn resume được | AC-13 |
| `drawNumber` sớm → `DRAW_TOO_EARLY` + `nextCallAt`; đúng biên `next_call_at − 300ms` → chấp nhận | AC-04 |
| `drawNumber` 3 lời gọi song song cùng `seq` → đúng 1 `drawn:true`; `seq` cũ → `drawn:false` | AC-05 |
| `drawNumber` bởi player (không phải host) → được; bởi thành viên không có player → `NOT_ROOM_MEMBER` | AC-06, AC-07 |
| `drawNumber` dùng `draw_interval_sec` hiện tại cho `next_call_at` mới | AC-03 |
| `drawNumber` số thứ 90 → `finished` `no_winner` + ván mới `waiting`, player còn trong phòng được chép | AC-25 |
| `drawNumber` số thứ 90 khi phòng `closing` → phòng `closed`, users được dọn | AC-26 |
| `drawNumber` trên phòng quá hạn đang chạy → phòng `closing` rồi vẫn rao | AC-37 |
| `createClaim` hụt khi `running` (status giữ, `last_event = claim_miss`) và khi `paused` (vẫn paused) | AC-18, AC-19 |
| `createClaim` đúng đầu tiên → `claim_window`, `winners`, `claim_window_ends_at`, `next_call_at = null` | AC-20 |
| `createClaim` 2 vé của cùng player đều thắng; đồng thắng trong `claim_window`; 2 lời gọi song song đúng → 1 mở cửa sổ, 1 append | AC-21, AC-22 |
| `createClaim` `NOT_TICKET_HOLDER`, `TICKET_ALREADY_WON`, `CLAIMS_CLOSED` (`waiting`, `awaiting_confirm`), `VALIDATION_FAILED` (ticketId sai pattern), `NOT_ROOM_MEMBER` (đã rời) | AC-23 |
| `createClaim` đo 20 lần trên emulator, P95 < 1000 ms | AC-45 |
| `leaveRoom` happy (users, `member_count`, player, `last_event`, RTDB node bị xóa); `GAME_IN_PROGRESS`; `HOST_CANNOT_LEAVE` | AC-33, AC-34 |
| `expireRoom`: `ROOM_NOT_EXPIRED`; `waiting` → cancelled + closed + dọn users + presence; `running` → closing; `awaiting_confirm` → finished + closed; gọi lần 2 idempotent | AC-36, AC-37, AC-38, AC-40 |
| Lazy expiry trong action bất kỳ (vd `createClaim`) khi phòng quá hạn ván `waiting` → phòng đóng, trả `NOT_ROOM_MEMBER` | AC-39 |
| Rules: client ghi `rooms.called_numbers`, `games.status`, `games/*/players` → deny; người ngoài phòng đọc `games` → deny; thành viên đọc → allow; sau `leaveRoom` client ghi RTDB presence → deny | AC-44 |

### E2E — Kịch bản test trên Chrome (AI chạy)
**Môi trường:** `firebase emulators:start` + `npm run dev` (localhost:3000), Emulator UI localhost:4000. Chrome 3 profile/cửa sổ: **H** (host@test.local), **B** (b@test.local), **C** (c@test.local), mỗi cửa sổ viewport **375×812** (DevTools device mode). Đăng nhập bằng tài khoản giả của Auth emulator. Đọc log server ở terminal `npm run dev`, log client ở Console. Đo kích thước/vị trí bằng JS `getBoundingClientRect()` trên `data-testid`.

| Bước | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|
| 1 | `npm run seed:t006 -- base` ; mở `localhost:3000/room` ở H, B, C | Cả 3 thấy "Phòng test T-006", phụ đề "Ván 1 · Chờ bắt đầu", panel "–" + "Chưa rao số nào" + "Nhịp quay 3 giây/số"; H thấy "▶ Bắt đầu" + "3/16 vé đã có chủ · 3 người trong phòng" và nút "Mời"; B, C thấy "Chờ host bắt đầu · 3 vé đã có chủ" và nút "Rời"; không ai thấy KINH; cả 3 thấy lớp "Chạm để bật tiếng" | AC-11, AC-17, AC-29, AC-32 |
| 2 | B, C chạm lớp "Bật tiếng"; H **không** chạm | Lớp biến mất ở B, C; Console B, C có log `[audio]` tải manifest xong; H vẫn còn lớp | AC-29 |
| 3 | B: đo ô `ticket-red_a` | Ô 38×32 (±1px), panel số 96px | AC-27 |
| 4 | C: đo 2 vé `ticket-blue_a`, `ticket-blue_b` | Ô 38×28; header 52px; panel 1 dòng 52px; `bottom(ticket-blue_b) ≤ top(kinh-bar)` (sau khi KINH xuất hiện ở bước 7 đo lại); `window.scrollY = 0`, 2 vé trọn trong viewport | AC-28 |
| 5 | C chạm một ô số trên `blue_a`; C chạm vé | Ô không đổi màu; chạm vé mở sheet SCR-05 (đóng lại) | AC-14 |
| 6 | H bấm "Mời" → "Copy link"; đóng, bấm "Mời" lần nữa | Sheet có link `/join/…`, "Link hết hạn lúc HH:mm · 3/16 người"; toast "Đã copy link"; lần 2 cùng link; nếu `navigator.share` không có thì không thấy "Chia sẻ…" | AC-32 |
| 7 | H bấm "▶ Bắt đầu" | ≤ 1 giây cả 3: "Ván 1 · Đang quay", 1 số + "Số thứ 1/90", toast "Ván 1 bắt đầu"; B, C có thanh KINH; H thấy "Bạn đang xem ván này. Lấy vé khi ván kết thúc." và "⏸ Tạm dừng"; Console B, C có `[audio]` phát số với `latencyMs ≤ 500`; Emulator UI: `games.status = running`, `player_count = 2`, `next_call_at` có giá trị | AC-01, AC-17, AC-29, AC-31 |
| 8 | Chờ 12 giây, chụp 3 cửa sổ gần cùng lúc 2 lần | Số tăng mỗi ~3 giây, "Số thứ n/90" giống nhau ở 3 cửa sổ; 5 số gần nhất; đếm ngược chạy; terminal: log `drawNumber` `role = host`, `drawn = true`; B, C có thể có log `drawn = false` hoặc không gọi | AC-03 |
| 9 | B: `document.documentElement.dataset.wakelock` | `active` (hoặc `unsupported` nếu Chrome không cho) | AC-41 |
| 10 | B nhìn nút "Rời" | Nút khóa, có gợi ý "Ván đang diễn ra, chưa rời được" | AC-34 |
| 11 | C chạm 3 ô đã rao + 1 ô chưa rao trên `blue_a`; tải lại trang C (chạm lại lớp Bật tiếng) | Ô đổi nền tối chữ trắng ngay; sau tải lại 4 ô vẫn đánh dấu, số đã rao hiện đúng; không ô nào có viền gợi ý | AC-15 |
| 12 | B bấm KINH (vé chưa đủ hàng) | ≤ 1 giây 3 cửa sổ có toast "B kinh hụt"; Console B, C `[audio]` kind `miss`; số vẫn chạy; KINH ở B khóa ~1 giây | AC-18, AC-31 |
| 13 | H bấm "⏸ Tạm dừng"; chờ 10 giây | Toast "Ván đã tạm dừng"; panel "⏸ Host đã tạm dừng"; B, C dòng "Host đã tạm dừng ván"; không có số mới; Emulator `next_call_at = null`; B `wakelock = released` | AC-12, AC-41 |
| 14 | B bấm KINH khi đang tạm dừng | Toast "B kinh hụt"; vẫn tạm dừng | AC-19 |
| 15 | H bấm "▶ Tiếp tục" | Toast "Ván tiếp tục"; số mới sau ~3 giây | AC-13 |
| 16 | Đóng hẳn cửa sổ H; đo khoảng giữa 2 số kế tiếp ở B | Số tiếp tục với khoảng ≈ 8 giây (3 + 5); terminal log `drawNumber` `uid = B`, `role = backup`; phụ đề vẫn "Đang quay" | AC-07 |
| 17 | Đóng thêm cửa sổ B; đo ở C | Khoảng ≈ 13 giây (3 + 10); log `uid = C` | AC-08 |
| 18 | Mở lại H, B (`/room`) | Vào lại phòng, thấy đúng số đã rao; nhịp về ~3 giây (log `role = host`) | AC-03, AC-42 |
| 19 | C mở "Bảng 90 ›" | Lưới 10 cột, số đã rao tô đậm, số vừa rao viền đỏ, "Số đã rao (n/90)" khớp panel | AC-43 |
| 20 | B: Console `localStorage.setItem('loto:mode','auto')`, tải lại | Các số đã rao trên `red_a` tự đánh dấu; số mới có trên vé viền đỏ; hàng thiếu 1 số viền "chờ"; dòng trạng thái "mode Auto"; chạm ô không đổi | AC-16 |
| 21 | `npm run seed:t006 -- fill-row --ticket blue_a --row 0` | Panel C nhảy số; Emulator `called_numbers` chứa đủ 5 số hàng 0 `blue_a` | — |
| 22 | C bấm KINH | Hiện action sheet "Kinh vé Lam A" / "Kinh vé Lam B" | AC-21 |
| 23 | C chọn "Kinh vé Lam A" | ≤ 1 giây 3 cửa sổ thấy thẻ "C KINH! Đang chờ đồng kinh…" + toast "C KINH!"; không còn số mới; panel "Đang kiểm tra KINH"; KINH vẫn hiện ở B, C; Emulator: `status = claim_window`, `winners[0] = {uid C, ticket_id blue_a, row 0}`, `claim_window_ends_at` ≈ +5s | AC-20 |
| 24 | `npm run seed:t006 -- empty`; mở lại H | Nút Bắt đầu khóa + "Cần ít nhất 1 người lấy vé" | AC-09 |
| 25 | `npm run seed:t006 -- base`; B bấm "Rời" → dialog → "Rời phòng" | B về SCR-02 với banner "Bạn đã rời phòng "Phòng test T-006"."; H, C toast "B đã rời phòng"; Emulator: `users/B.current_room_id = null`, `member_count = 2`, không còn player B; RTDB `presence/{room}/B`, `presence_access/{room}/B` không còn | AC-33 |
| 26 | `npm run seed:t006 -- base --expires-in 900`; mở H, C | Chip "⏱ Còn 14:5x" đếm lùi; toast "Phòng sẽ hết hạn sau 15 phút" | AC-35 |
| 27 | `npm run seed:t006 -- base --expires-in 40`; mở H, B, C; chờ 45 giây | Cả 3 về SCR-02 banner "Phòng "Phòng test T-006" đã hết hạn."; Emulator: phòng `closed`, `close_reason = expired`, ván `cancelled`, 3 user `current_room_id = null`; RTDB `presence/{room}` trống | AC-36 |
| 28 | `npm run seed:t006 -- base --expires-in 40`; H Bắt đầu ngay; chờ 45 giây | Chip "Đóng sau ván này", toast "Phòng sẽ đóng khi ván này kết thúc"; số vẫn rao; Emulator phòng `closing` | AC-37 |
| 29 | `npm run seed:t006 -- nearly-done`; mở H, B, C (đã bật tiếng) | Sau ~3 giây có "Số thứ 90/90"; số 90 không phát tiếng (manifest mẫu thiếu), không lỗi Console; toast "Ván 1 kết thúc"; phụ đề "Ván 2 · Chờ bắt đầu"; vé B, C vẫn hiện; Emulator: ván 1 `finished` `no_winner`, ván 2 `waiting` có player B, C | AC-25, AC-30 |
| 30 | `npm run seed:t006 -- awaiting --expires-in 20`; mở C; chờ 25 giây | C về SCR-02 banner hết hạn; Emulator: ván `finished` `result = won` giữ `winners`, phòng `closed` | AC-38 |
| 31 | `npm run seed:t006 -- base --expires-in 20`; **không** mở cửa sổ nào, chờ 30 giây; rồi mở B ở `localhost:3000` | B được đưa vào phòng rồi về SCR-02 với banner hết hạn (hoặc "Bạn không còn ở trong phòng"); terminal có log `expireRoom`; Emulator phòng `closed` | AC-39 |
| 32 | `npm run seed:t006 -- base`, H Bắt đầu; C mở `?debug=offline` 10 giây rồi `?debug=online` | Banner "Mất kết nối – đang kết nối lại…" khi offline; nối lại → banner ẩn, số đã rao và ô đánh dấu của C khớp H | AC-42 |

### Dữ liệu seed / tiền điều kiện
- T-001..T-005 đã xong (đăng nhập, tạo phòng + 16 vé, vào phòng, lấy vé, presence).
- Emulator Suite chạy với Auth, Firestore, RTDB; script `npm run seed:t006` (Phần D) với các kịch bản `base`, `empty`, `nearly-done`, `awaiting`, lệnh `fill-row`, cờ `--expires-in`, `--interval`.
- Bộ audio mẫu `public/audio/manifest.json` (thiếu cố ý số 90).
- 3 profile Chrome đăng nhập H, B, C qua Auth emulator.

### Test tay
Toàn bộ AC giao diện đã nằm trong "Kịch bản test trên Chrome (AI chạy)"; AC còn lại phủ bằng integration test. Dev chỉ nghe thử tiếng trên 1 điện thoại thật nếu có (không bắt buộc – Q-053):

| Bước | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|
| 1 | (Tùy chọn) Mở `http://<IP-LAN>:3000/room` trên điện thoại cùng mạng, chạm "Bật tiếng", host Bắt đầu | Nghe câu rao gần như cùng lúc số hiện; màn hình không tự tắt khi ván chạy | AC-29, AC-41 |

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] Phần A–I đều tick; mỗi phần có test pass trước khi sang phần sau
- [ ] Mọi action của task gọi `applyLazyExpiry` đầu transaction; các action T-003..T-005 đã rà lại
- [ ] Rules có test deny cho mọi field ván do task ghi (client không ghi được `called_numbers`, `status`, `winners`, `players`)
- [ ] Test song song `drawNumber` (cùng `seq`) và `createClaim` (cùng lúc) pass — không rao trùng, không mở 2 cửa sổ
- [ ] AI chạy đủ 32 bước "Kịch bản test trên Chrome", có ảnh chụp bước 4 (2 vé không cuộn), 16–17 (dự phòng), 23 (KINH đúng), 27 (hết hạn)
- [ ] Bộ audio mẫu + manifest có trong repo; README ghi cách tạo lại
- [ ] Smoke lại kịch bản chính T-002..T-005 (đăng nhập, tạo phòng, vào bằng link, lấy/bỏ vé) — không hỏng

## 7. Ghi chú
- **Point:** giữ **21** theo slices.md. Checklist gồm 7 operation (trong đó `drawNumber` có nhánh hết 90 số + tạo ván mới, `expireRoom` + lazy expiry dùng chung), 2 bộ timer client, audio, 2 bố cục vé, toast, Wake Lock — 21 là sát, rủi ro vượt. Nếu cần giảm tải mà không tách task: chuyển hiệu ứng Auto (SUP-10) sang T-012 (vốn là task bật mode Auto) — đề xuất, chưa đổi phạm vi.
- `[ASSUMED]` Thẻ tạm `claim_window` ở T-006; SCR-09 đầy đủ + `closeClaimWindow` ở T-007. Nhánh đồng thắng của `createClaim` làm ở T-006 (phía server) vì thuộc cùng operation.
- `[ASSUMED]` `pauseGame` không dùng `loop_version` (SCR-04.A5 còn nhắc; database.md và api-contract không có field này) — theo api-contract: `next_call_at = null`.
- `[ASSUMED]` Thứ tự dự phòng chỉ theo vé nhỏ nhất (Q-052), **không** lọc theo presence; FLOW-07 trigger cũ "2 người online" đã bị Q-052 thay.
- `[ASSUMED]` Ván kết thúc ngay khi rao số thứ 90 trong cùng transaction (vì `DrawRequest.seq` tối đa 89).
- `[ASSUMED]` `serverTimeOffset` lấy từ `meta.serverNow` trong envelope `ActionResult` (api-contract chỉ nói "thời gian server trả trong response").
- `[ASSUMED]` Lazy expiry commit phần hết hạn rồi mới trả lỗi nghiệp vụ (vd `ROOM_CLOSING`); xóa RTDB presence sau commit, lỗi chỉ ghi log.
- `[ASSUMED]` Tên key localStorage/sessionStorage: `loto:mode`, `loto:sound`, `loto:soundUnlocked`; T-012 dùng lại.
- `[ASSUMED]` Cách xen câu nối: sau câu số, nếu còn ≥ 1 giây tới `next_call_at`; câu nối bị ngắt khi có số mới.
- `[ASSUMED]` Bộ audio mẫu tạo bằng TTS máy, thiếu cố ý số 90 để kiểm FLOW-07 A1.
- `[ASSUMED]` `expireRoom` gọi sau jitter 0–2 giây; `drawNumber` lỗi mạng thử lại 1 giây × 3.
- `[ASSUMED]` Câu toast cho `TICKET_ALREADY_WON` ("Vé này đã được ghi thắng") và `GAME_IN_PROGRESS` khi rời ("Ván đang diễn ra, chưa rời được") — scr-04.md chưa ghi.
- `[ASSUMED]` Hook debug `?debug=offline|online`, `dataset.wakelock`, log `[draw]`/`[audio]`, script `seed:t006` chỉ phục vụ test local (Q-053), tắt ở build production.
- `[ASSUMED]` Sheet Chat/Người/Lịch sử/Cài đặt hiển thị khung "Sắp có" tới khi task tương ứng làm.
- ADR-13 còn ghi Playwright e2e; theo Q-053 thay bằng kịch bản Chrome do AI chạy.
