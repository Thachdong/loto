# T-007 · Kết quả ván: đồng kinh 5 giây, host xác nhận, chúc mừng và ván mới

> ⚠ **Cần cập nhật (2026-11-19, Q-055..Q-058 – đối chiếu specs/actions.md):** Viết lại task: bỏ cửa sổ đồng kinh 5 giây và `closeClaimWindow`/SCR-09.A2; SCR-09 thành "Chờ host duyệt" (danh sách `claims` + gợi ý), host `confirmGame` (khi có vé đúng, lỗi `NO_WINNING_CLAIM`) hoặc `rejectClaims` mới (SCR-09.A3, khi toàn hụt, lỗi `CLAIM_HAS_WIN`) (Q-055); `confirmGame` chỉ chép player online (BR-29, Q-058).

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-05 | M1 | 8 | T-006 | TODO |

## 1. Mục tiêu demo
Sau task này: **khi một player KINH đúng, mọi người trong phòng thấy thẻ "KINH! 🎉" đếm ngược 5 giây; player khác KINH đúng trong 5 giây được thêm vào danh sách đồng thắng; hết giờ thiết bị tự gọi `closeClaimWindow`, host thấy overlay với vé thắng (hàng thắng viền xanh) và bấm "Xác nhận kết thúc ván" → cả phòng thấy "🎊 Chúc mừng! 🎊", nghe tiếng chúc mừng, bấm "Đóng" về phòng với ván mới `waiting` và vé vẫn thuộc người giữ. Host offline lúc chờ xác nhận → player thấy "Đang chờ host xác nhận" + "Host đang offline".**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-09.A0 | Realtime: `games/{gameId}` (giữ gameId của ván vừa có KINH), `tickets/{ticket_id}`, RTDB `presence/{roomId}/{host_uid}` |
| Thao tác | SCR-09.A1 | Host xác nhận kết thúc ván |
| Thao tác | SCR-09.A2 | Tự động đóng cửa sổ đồng kinh khi hết 5 giây |
| API | `closeClaimWindow` | `closeClaimWindowAction({roomId, gameId})` → `GameState`; idempotent |
| API | `confirmGame` | `confirmGameAction({roomId, gameId})` → `GameConfirmResult` |
| API | `createClaim` (mở rộng) | Nhánh "đúng trong cửa sổ" (append `winners`) và `CLAIMS_CLOSED` khi `awaiting_confirm` — action đã có từ T-006 `[ASSUMED]` (xem Ghi chú) |
| Dữ liệu | TBL-05 `games` | `status` (`claim_window` → `awaiting_confirm` → `finished`), `winners`, `result`, `ended_at`, `confirmed_by`; tạo doc ván mới `waiting` |
| Dữ liệu | TBL-06 `players` | Chép player còn trong phòng (cùng `ticket_ids`) sang ván mới |
| Dữ liệu | TBL-02 `rooms` | `current_game_id`, `game_count + 1`, `last_event = game_finished`; nhánh phòng quá hạn: đóng phòng (logic `expireRoom` từ T-006) |
| Dữ liệu | TBL-03 `tickets` | chỉ đọc (vé thắng) |
| Dữ liệu | TBL-08 RTDB `presence` | chỉ đọc (host online/offline) |
| Rule | BR-18 | Cửa sổ 5 giây; mọi Kinh đúng trong cửa sổ đồng thắng |
| Rule | BR-28 | Ván chỉ kết thúc khi host xác nhận sau cửa sổ; không bác bỏ; host tự kinh tự xác nhận; host offline → chờ; chờ xác nhận không nhận Kinh |
| Rule | BR-07 | Ván mới `waiting` tự tạo khi ván trước kết thúc; tối đa 1 ván chưa kết thúc |
| Rule | BR-11 | Vé vẫn thuộc người giữ ở ván mới |
| Rule | BR-04 | Phòng quá hạn: ván chờ xác nhận tự `finished` rồi đóng phòng |
| Phụ trợ | SUP-01 | Listener `games` + `last_event = game_finished` |
| Phụ trợ | SUP-02 | Tiếng chúc mừng khi `finished` (bộ audio mẫu từ T-006) |
| Phụ trợ | SUP-03 | Client đếm giờ, gọi `closeClaimWindow` |
| NFR | NFR-02, NFR-03 | Trạng thái ván tới mọi người ≤ 1 giây; người đồng kinh hiện trong danh sách ≤ 1 giây |
| NFR | NFR-08, NFR-09 | Server kiểm thời điểm bằng giờ server; chỉ host xác nhận |
| Flow | FLOW-08 bước 6–9, A2, A5, E5 | |
| Flow | FLOW-14 A1 | Phòng quá hạn lúc chờ xác nhận |
| Flow | FLOW-07 E2 (chỉ hiển thị) | Overlay "không ai thắng" khi `result = no_winner` (`drawNumber` ở T-006 đã ghi) |

**Ngoài phạm vi:**
- Bấm KINH, kiểm hàng (BR-17), kinh hụt, mở cửa sổ với Kinh đúng đầu tiên (T-006).
- Logic rao hết 90 số → `no_winner` + tạo ván mới (T-006 `drawNumber`); task này chỉ hiển thị overlay #8.
- Logic `expireRoom` / lazy expiry (T-006); task này chỉ gọi lại và kiểm nhánh `awaiting_confirm` / `closing`.
- Lịch sử ván (T-010), chat trên overlay (T-008).

## 3. Việc cần làm
### UI
- [ ] Component `GameResult` gắn trong trang phòng (SCR-04), tự mở khi listener ván thấy `status ∈ {claim_window, awaiting_confirm}` hoặc `finished` với `result ∈ {won, no_winner}` vừa chuyển trong phiên (không mở lại cho ván cũ khi tải lại trang) `[ASSUMED]`.
- [ ] Listener `games/{gameId}` **giữ gameId của ván đang hiển thị** kể cả khi `rooms.current_game_id` đã sang ván mới (SCR-09.A0); đóng overlay mới thả listener.
- [ ] Dạng thẻ `claim_window` (nửa trên SCR-04, không che vé và thanh KINH): tiêu đề "KINH! 🎉" (#1); vòng đếm ngược 5 → 0 tính từ `claim_window_ends_at − now` (#2) + "Đang chờ đồng kinh…"; danh sách người thắng (#3) cập nhật realtime; lời nhắc "Bạn cũng đủ hàng? Bấm KINH ngay trong {n} giây!" chỉ cho người có vé tham gia ván và chưa thắng (#9).
  - Đồng hồ client: hiệu chỉnh lệch giờ bằng server time offset `[ASSUMED]` (lấy từ RTDB `.info/serverTimeOffset`) để đếm ngược khớp giờ server.
- [ ] Hết giờ (`now ≥ claim_window_ends_at`): mọi client đang thấy `claim_window` gọi `closeClaimWindowAction`; `CLAIM_WINDOW_OPEN` → hẹn gọi lại sau 300ms; `200` hoặc `GAME_STALE` → dừng, để listener cập nhật. Thêm jitter 0–300ms để giảm gọi trùng `[ASSUMED]`.
- [ ] Dạng overlay toàn màn (`awaiting_confirm` / `finished`), nền tối, thanh KINH bên dưới khóa:
  - [ ] #1 tiêu đề theo trạng thái: "Có người KINH đúng" / "🎊 Chúc mừng! 🎊" + "Ván {seq_no} kết thúc · {k} người thắng".
  - [ ] #3 mỗi người thắng: ảnh, `display_name`, chip "Vé {Màu} {A/B}", "Hàng {row+1}: a · b · c · d · e" (5 số từ `tickets/{ticket_id}.grid` hàng `row`).
  - [ ] #4 vé thắng thu nhỏ dùng `PaperTicket` (T-005) với ô đã rao tô đậm (theo `rooms.called_numbers`, giữ tới khi ván mới bắt đầu – Q-046) và hàng thắng viền xanh; nhiều người thắng → người đầu mở sẵn, người sau "▸ Xem vé".
  - [ ] #5 host + `awaiting_confirm`: nút "Xác nhận kết thúc ván" + dòng phụ "Host không bác bỏ được kết quả đã kiểm tra."; đang gửi → disabled + spinner; lỗi → toast "Chưa xác nhận được, thử lại", nút bấm lại được.
  - [ ] #6 player + `awaiting_confirm`: "⏳ Đang chờ host xác nhận kết thúc ván."; host offline (RTDB `presence/{roomId}/{host_uid}.online = false` hoặc không có node) thêm "Host đang offline — ván chờ host quay lại."
  - [ ] #7 `finished`: nút "Đóng" → đóng overlay về SCR-04 (ván mới `waiting`) + dòng "Vé của bạn vẫn được giữ cho ván {n+1}" (chỉ người có vé được chép).
  - [ ] #8 `result = no_winner`: "Ván {n} kết thúc — không ai thắng", không có #3, có nút "Đóng" (Q-050).
- [ ] `finished` + `won`: phát tiếng chúc mừng (SUP-02, chỉ khi người dùng đã "Bật tiếng"); hiệu ứng pháo giấy, tắt khi `prefers-reduced-motion: reduce` (Q-050).
- [ ] Phòng quá hạn khi đang chờ xác nhận: hiện trang `finished` ngắn rồi SCR-04 đưa về SCR-02 "Phòng đã hết hạn" (luồng điều hướng có từ T-006).
- [ ] Map lỗi `confirmGame`: `GAME_NOT_AWAITING_CONFIRM` / `GAME_STALE` → bỏ qua, UI theo listener; `NOT_ROOM_HOST` → ẩn #5.
- [ ] Toast `CLAIMS_CLOSED` ở SCR-04 "Đã hết lượt báo KINH" (đã map ở T-006; kiểm lại với trạng thái thật).
- [ ] Chuỗi tiếng Việt vào từ điển (NFR-16).

### API / Backend
- [ ] `createClaimAction` (mở rộng T-006): ván `claim_window` + Kinh đúng → append `winners` (`uid, display_name, ticket_id, color, row, claimed_at`), không đổi `claim_window_ends_at` (cửa sổ không gia hạn) `[ASSUMED]`; vé đã có trong `winners` → `409 TICKET_ALREADY_WON`; ván `awaiting_confirm`/`finished` → `409 CLAIMS_CLOSED`. Một player 2 vé cùng đủ hàng: mỗi vé một lượt (FLOW-08 A4).
  - Kinh đúng gửi khi `now ≥ claim_window_ends_at` nhưng ván vẫn `claim_window` (chưa ai đóng) → không nhận, trả `CLAIMS_CLOSED` `[ASSUMED]` (BR-18: chỉ "trong cửa sổ").
- [ ] `closeClaimWindowAction` (`closeClaimWindow`): session → Zod → member (`403 NOT_ROOM_MEMBER`) → `gameId ≠ current_game_id` → `409 GAME_STALE` → transaction:
  - ván không còn `claim_window` → `200` trạng thái hiện tại;
  - `now < claim_window_ends_at` → `409 CLAIM_WINDOW_OPEN`;
  - phòng `active` → `status = awaiting_confirm`;
  - phòng `closing` → ván `finished`, `result = won`, `ended_at`, `confirmed_by = null`, rồi đóng phòng (dùng hàm `closeRoom` của `expireRoom` – T-006), `last_event` theo `expireRoom` (BR-04, Q-042).
  - Lazy expiry chạy trước (dùng chung): phòng `active` mà `now ≥ expires_at` → chuyển `closing` rồi xử lý như trên.
  - Trả `GameState`.
- [ ] `confirmGameAction` (`confirmGame`): member → host (`403 NOT_ROOM_HOST`) → `GAME_STALE` → lazy expiry → ván ≠ `awaiting_confirm` → `409 GAME_NOT_AWAITING_CONFIRM` → transaction:
  - ván: `status = finished`, `result = won`, `ended_at`, `confirmed_by = uid`;
  - phòng `active`: tạo `games/{newId}` (`seq_no = game_count + 1`, `status = waiting`, `winners = []`, `player_count = 0`, `created_at`, `expire_at`); `rooms.current_game_id = newId`, `game_count + 1`; chép sang ván mới mọi player của ván cũ **còn trong phòng** (`users/{uid}.current_room_id == roomId`) với `display_name`, `photo_url`, `ticket_ids`, `joined_at` (BR-07, BR-11). `called_numbers` giữ nguyên (Q-046);
  - phòng `closing`: không tạo ván mới, đóng phòng như `expireRoom` → `nextGameId = null`;
  - `last_event = {type: game_finished, actor_uid, at, text}`; trả `{finishedGameId, result, winners, nextGameId, roomStatus}`.
  - Đọc `users` của các player (≤ 16) trong transaction để xác định "còn trong phòng".
- [ ] Đưa phần "kết thúc ván + tạo ván mới + chép player" thành hàm domain dùng chung `finishGameAndRollOver(tx, room, game, result, confirmedBy)`; refactor `drawNumber` (nhánh `no_winner`, T-006) dùng chung nếu khác logic `[ASSUMED]`.
- [ ] Clock inject được (`now()` qua dependency) để test thời điểm cửa sổ và hết hạn phòng.

### Data
- [ ] Không thêm collection/field mới. Kiểm `firestore.rules`: client không ghi `games`/`players`; thành viên đọc được ván cũ (cây con `rooms/{roomId}`).
- [ ] Script seed thêm kịch bản `[ASSUMED]` tên:
  - `result-ready`: phòng `active`, host H, player B, C; ván `running`; B giữ `red_a`, C giữ `blue_b` (+ `pink_a`), host H giữ `green_a`; `rooms.called_numbers` đã chứa đủ 5 số hàng 1 của `red_a`, hàng 3 của `blue_b`, một hàng bất kỳ của `pink_a`, hàng 2 của `green_a` (và ≥ 1 số khác); `next_call_at` = now + 60 giây để không rao số mới trong lúc test.
  - `result-awaiting`: ván `awaiting_confirm` với 2 winners (B `red_a` hàng 0, C `blue_b` hàng 2); player D đã rời phòng (`current_room_id = null`) nhưng còn doc player giữ `teal_a`.
  - `result-expired`: như `result-awaiting` nhưng `rooms.expires_at` = now − 1 phút.

### Khác
- [ ] File audio mẫu "chúc mừng" có trong bộ audio mẫu của T-006; thiếu thì thêm 1 file mẫu.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | Seed `result-ready`, H, B, C đang ở phòng | B bấm KINH cho `red_a` | Trong ≤ 1 giây cả 3 thấy thẻ "KINH! 🎉" nửa trên màn (vé và nút KINH vẫn thấy, bấm được), vòng đếm 5 → 0, danh sách có B "Vé Đỏ A · Hàng 1: …"; C và H thấy lời nhắc "Bạn cũng đủ hàng? Bấm KINH ngay trong {n} giây!", B không thấy | FLOW-08 bước 6, BR-18, NFR-03, SCR-09 trang 1 |
| AC-2 | Như AC-1, còn > 1 giây | C bấm KINH cho `blue_b` | C được thêm vào danh sách người thắng ở mọi máy ≤ 1 giây; Emulator `winners` có 2 phần tử; `claim_window_ends_at` không đổi | BR-18, FLOW-08 A2 |
| AC-3 | Như AC-1, C giữ 2 vé `blue_b`, `pink_a` đều đủ hàng | C bấm KINH lần lượt cho 2 vé trong cửa sổ | Cả 2 vé của C đều trong `winners`; bấm lại vé đã thắng → `409 TICKET_ALREADY_WON` (test) | FLOW-08 A4, BR-18 |
| AC-4 | Ván `claim_window` | Đồng hồ tới `claim_window_ends_at` | Các client gọi `closeClaimWindow`; ván `awaiting_confirm` (Emulator), chỉ 1 lần chuyển trạng thái dù nhiều client gọi; mọi máy chuyển sang overlay ≤ 1 giây | SCR-09.A2, BR-18, BR-28, Q-051 |
| AC-5 | Ván `claim_window`, còn 3 giây | Gọi `closeClaimWindowAction` (test, giờ server) | `409 CLAIM_WINDOW_OPEN`, trạng thái giữ nguyên; client hẹn gọi lại 300ms | BR-18, NFR-08 |
| AC-6 | Ván đã `awaiting_confirm` | Client khác gọi `closeClaimWindowAction` lần nữa | `200` trả `status = awaiting_confirm`, không đổi dữ liệu (idempotent) | Q-051 |
| AC-7 | Ván `awaiting_confirm`, host H online | H nhìn overlay | Tiêu đề "Có người KINH đúng"; mỗi người thắng có ảnh, tên, chip vé, "Hàng n: 5 số"; vé thắng thu nhỏ kiểu vé giấy, ô đã rao tô đậm, hàng thắng viền xanh; người thắng thứ 2 có "▸ Xem vé"; nút "Xác nhận kết thúc ván" + dòng "Host không bác bỏ được kết quả đã kiểm tra."; không có nút bác bỏ | BR-28, SCR-09 trang 2 |
| AC-8 | Ván `awaiting_confirm` | B (player) nhìn overlay | Thấy "⏳ Đang chờ host xác nhận kết thúc ván.", không có nút xác nhận; thanh KINH khóa | BR-28, SCR-09 trang 3 |
| AC-9 | Ván `awaiting_confirm` | B gọi `createClaimAction` (test) hoặc bấm KINH nếu còn hiện | `409 CLAIMS_CLOSED`; `winners` không đổi | BR-28 |
| AC-10 | Ván `awaiting_confirm` | Host H đóng tab (presence H `online = false`) | B thấy thêm "Host đang offline — ván chờ host quay lại."; ván đứng ở `awaiting_confirm` (Emulator) và không có số mới; H mở lại phòng → overlay host + nút xác nhận hiện lại | FLOW-08 E5, BR-28, Q-048 |
| AC-11 | Seed `result-awaiting` (B, C thắng; D đã rời còn doc player giữ `teal_a`) | H bấm "Xác nhận kết thúc ván" | Emulator: ván cũ `finished`, `result = won`, `confirmed_by = H`, `ended_at` có; ván mới `waiting`, `seq_no = game_count + 1`; `rooms.current_game_id` = ván mới, `game_count + 1`; ván mới có player B, C, H với `ticket_ids` như cũ, **không** có D; `last_event.type = game_finished` | FLOW-08 bước 7b, 9, BR-07, BR-11, BR-22 |
| AC-12 | Như AC-11 | Sau khi xác nhận | Mọi máy thấy "🎊 Chúc mừng! 🎊" + "Ván {n} kết thúc · 2 người thắng", pháo giấy, nghe tiếng chúc mừng (máy đã bật tiếng); người có vé thấy "Vé của bạn vẫn được giữ cho ván {n+1}" | FLOW-08 bước 8, SUP-01, SUP-02, SCR-09 trang 4 |
| AC-13 | Như AC-12 | B bấm "Đóng" rồi mở sheet "Vé" | Overlay đóng, SCR-04 ở ván mới `waiting`; sheet hiện Đỏ A "Bạn"; vé `teal_a` của D "Trống" | BR-11, BR-07, BR-22 |
| AC-14 | Host H chính là người thắng (`green_a`) | H bấm KINH đúng → hết cửa sổ → H bấm xác nhận | Thành công như AC-11; `confirmed_by = H`, H có trong `winners` | FLOW-08 A5, BR-28 |
| AC-15 | Ván `awaiting_confirm` | B (không phải host) gọi `confirmGameAction` (test) | `403 NOT_ROOM_HOST`; ván không đổi | NFR-09, BR-21 |
| AC-16 | Ván `claim_window` (chưa hết giờ) | H gọi `confirmGameAction` (test) | `409 GAME_NOT_AWAITING_CONFIRM` | BR-28 |
| AC-17 | Seed `result-expired` (phòng quá hạn, ván `awaiting_confirm`) | H bấm "Xác nhận kết thúc ván" (hoặc bất kỳ client gọi `expireRoom`) | Ván tự `finished` (`result = won`, winners giữ nguyên); phòng `closed`, `close_reason = expired`, không có ván mới; mọi máy thấy trang chúc mừng ngắn rồi về SCR-02 "Phòng đã hết hạn"; action xác nhận trả `GAME_NOT_AWAITING_CONFIRM` (UI không báo lỗi) hoặc kết quả `nextGameId = null` | FLOW-14 A1, BR-04, FLOW-08 E5 |
| AC-18 | Phòng `closing` (quá hạn khi ván đang chạy), ván `claim_window` | Hết 5 giây, client gọi `closeClaimWindow` | Ván `finished` với winners đã có, phòng `closed`, không tạo ván mới, không qua `awaiting_confirm` | BR-04, Q-042, api-contract `closeClaimWindow` |
| AC-19 | Ván kết thúc do rao hết 90 số (`result = no_winner`, seed hoặc T-006) | — | Mọi máy thấy overlay "Ván {n} kết thúc — không ai thắng", không có danh sách người thắng, có nút "Đóng" → về ván mới `waiting` | FLOW-07 E2, BR-19, Q-050 |
| AC-20 | Lỗi mạng khi host bấm xác nhận (DevTools Offline) | H bấm "Xác nhận kết thúc ván" | Toast "Chưa xác nhận được, thử lại"; nút bấm lại được; bật mạng bấm lại → thành công | SCR-09 Error |
| AC-21 | `confirmGame` đã thành công, `rooms.current_game_id` sang ván mới | B đang ở overlay | Overlay vẫn hiện dữ liệu ván cũ (người thắng, vé thắng) tới khi B bấm "Đóng" | SCR-09.A0 |

## 5. Test
### Unit / integration (Vitest + Firebase Emulator, clock giả lập)
| Case | Phủ AC |
|---|---|
| `createClaimAction` ở `claim_window` + vé đủ hàng → append winners, `claim_window_ends_at` không đổi | AC-2 |
| `createClaimAction` 2 vé của cùng player trong cửa sổ → 2 winners; lần 3 cùng vé → `TICKET_ALREADY_WON` | AC-3 |
| `createClaimAction` ở `awaiting_confirm` / `finished` → `CLAIMS_CLOSED` | AC-9 |
| `closeClaimWindowAction` trước hạn → `CLAIM_WINDOW_OPEN`; đúng hạn → `awaiting_confirm`; gọi lại → 200 không đổi | AC-4, AC-5, AC-6 |
| `closeClaimWindowAction` 5 lời gọi đồng thời đúng hạn → 1 lần chuyển trạng thái, tất cả trả ok | AC-4 |
| `closeClaimWindowAction` non-member → `NOT_ROOM_MEMBER`; gameId cũ → `GAME_STALE` | AC-4 (biên) |
| `closeClaimWindowAction` phòng `closing` → ván `finished`, phòng `closed`, không ván mới | AC-18 |
| `confirmGameAction` happy: ván cũ `finished`/`won`/`confirmed_by`; ván mới `waiting` đúng `seq_no`; `current_game_id`, `game_count`; chép player còn trong phòng với `ticket_ids`, bỏ player đã rời; `called_numbers` giữ nguyên; `last_event` | AC-11 |
| `confirmGameAction` host cũng là winner | AC-14 |
| `confirmGameAction` non-host → `NOT_ROOM_HOST`; ván `claim_window` → `GAME_NOT_AWAITING_CONFIRM`; gọi lần 2 sau thành công → `GAME_STALE` | AC-15, AC-16 |
| `confirmGameAction` với phòng quá hạn (clock > `expires_at`) → ván `finished` (`result = won`, winners giữ), phòng `closed`, không ván mới | AC-17 |
| Rules: client không ghi được `games`, `players`; member đọc được ván cũ sau khi `current_game_id` đổi | AC-21 |
| Logic thuần: `winningRowNumbers(grid, row)`, `resultViewState(game, me, isHost, hostOnline)` → dạng thẻ/overlay, các phần tử #1–#9 hiện/ẩn đúng bảng trạng thái SCR-09 | AC-1, AC-7, AC-8, AC-10, AC-12, AC-19 |
| Hook đếm ngược: gọi close đúng lúc theo server offset, retry 300ms khi `CLAIM_WINDOW_OPEN`, dừng khi status đổi (fake timers) | AC-4, AC-5 |

### Kịch bản test trên Chrome (AI chạy)
Môi trường: `npm run dev` + Firebase Emulator Suite; Chrome device mode 375×812; profile **H** (host), **B**, **C**; Emulator UI `localhost:4000`. Bật tiếng ("Bật tiếng") ở cả 3 trước khi bắt đầu.

| Bước | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|
| 1 | `npm run seed -- result-ready`; H, B, C mở phòng, chạm "Bật tiếng" | Ván đang chạy, panel số rao có các số seed | — |
| 2 | B bấm KINH cho Đỏ A | Gần như ngay cả 3 máy hiện thẻ "KINH! 🎉" ở nửa trên, vòng đếm từ 5; danh sách có B, "Vé Đỏ A · Hàng 1: …"; vé và nút KINH vẫn thấy; H và C thấy lời nhắc đồng kinh, B không | AC-1 |
| 3 | Trong lúc còn ≥ 2 giây, C bấm KINH (chọn vé Lam B, rồi Hồng A) | C (2 dòng vé) xuất hiện trong danh sách ở cả 3 máy; số giây đếm ngược không bị reset | AC-2, AC-3 |
| 4 | Chờ đếm về 0 | Cả 3 chuyển overlay toàn màn trong ≤ 1 giây; Emulator: `status = awaiting_confirm`, `winners` 3 phần tử | AC-4 |
| 5 | Quan sát H | "Có người KINH đúng", danh sách người thắng, vé Đỏ A thu nhỏ kiểu vé giấy với hàng 1 viền xanh, ô đã rao tô đậm; "▸ Xem vé" cho C, bấm mở ra vé Lam B với hàng 3 viền xanh; nút "Xác nhận kết thúc ván" + dòng "Host không bác bỏ…" | AC-7 |
| 6 | Quan sát B | "⏳ Đang chờ host xác nhận kết thúc ván."; không có nút xác nhận; nút KINH khóa | AC-8, AC-9 |
| 7 | Đóng cửa sổ H; chờ tới khi Emulator UI RTDB `presence/{H}.online = false` | B và C thấy thêm "Host đang offline — ván chờ host quay lại."; không có số mới được rao; ván vẫn `awaiting_confirm` | AC-10 |
| 8 | Mở lại profile H vào phòng | H thấy lại overlay + nút xác nhận; dòng "Host đang offline" ở B biến mất | AC-10 |
| 9 | DevTools của H → Network Offline; bấm "Xác nhận kết thúc ván" | Toast "Chưa xác nhận được, thử lại"; nút vẫn bấm được | AC-20 |
| 10 | Bật lại mạng, H bấm "Xác nhận kết thúc ván" | Cả 3 thấy "🎊 Chúc mừng! 🎊", "Ván 1 kết thúc · 2 người thắng" (`[ASSUMED]` k = số người khác nhau, C 2 vé tính 1 người; C hiện 2 dòng vé), pháo giấy, nghe tiếng chúc mừng; dòng "Vé của bạn vẫn được giữ cho ván 2" | AC-12 |
| 11 | Emulator UI kiểm | Ván 1 `finished`, `result = won`, `confirmed_by = H`; ván mới `waiting` `seq_no = 2`; `rooms.current_game_id` trỏ ván mới; ván mới có players H, B, C với `ticket_ids` cũ | AC-11 |
| 12 | Trước khi bấm "Đóng", B vẫn thấy người thắng của ván 1 | Overlay không bị mất dữ liệu dù `current_game_id` đã đổi | AC-21 |
| 13 | B bấm "Đóng", mở sheet "Vé" | Về SCR-04 ván 2 chờ bắt đầu; Đỏ A "Bạn" | AC-13 |
| 14 | `npm run seed -- result-awaiting`; H bấm xác nhận; Emulator UI kiểm | Ván mới không có player D; B mở sheet "Vé": Ngọc A "Trống" | AC-11, AC-13 |
| 15 | H bắt đầu ván 2 (T-006); seed lại `called_numbers` qua Emulator UI để hàng 2 của Lục A đủ; H bấm KINH cho Lục A; chờ hết 5 giây; H bấm xác nhận | H trong danh sách người thắng và tự xác nhận được; `confirmed_by = H` | AC-14 |
| 16 | `npm run seed -- result-expired`; H, B mở phòng; H bấm xác nhận (hoặc chờ client gọi `expireRoom`) | Trang chúc mừng ngắn rồi cả 2 về SCR-02 "Phòng đã hết hạn"; Emulator: ván `finished`, phòng `closed`, `close_reason = expired`, không có ván mới; không có toast lỗi | AC-17 |
| 17 | Seed ván `finished` với `result = no_winner` (hoặc dùng kịch bản 90 số của T-006); quan sát | Overlay "Ván {n} kết thúc — không ai thắng", không có danh sách; "Đóng" về ván mới | AC-19 |
| 18 | Bật `prefers-reduced-motion` (DevTools Rendering → Emulate CSS media) và lặp bước 10 với seed mới | Không có pháo giấy, nội dung còn đủ | AC-12 (biến thể) |

AC-5, AC-6, AC-15, AC-16, AC-18 phủ bằng integration test (khó quan sát chính xác thời điểm trên Chrome).

### Dữ liệu seed / tiền điều kiện
- T-001..T-006 xong (đăng nhập, phòng, vé, KINH, `expireRoom`, bộ audio mẫu).
- 3 tài khoản emulator H, B, C (+ D chỉ trong seed `result-awaiting`).
- Seed `result-ready`, `result-awaiting`, `result-expired` (mục 3 Data); seed ván `no_winner` `[ASSUMED]` dùng chung kịch bản của T-006 nếu có.

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] Integration test đồng thời cho `closeClaimWindow` pass ổn định (lặp 20 lần)
- [ ] Clock inject được; test hết hạn phòng không dùng `sleep` thật
- [ ] Hàm `finishGameAndRollOver` dùng chung cho `confirmGame` (và `drawNumber` nhánh `no_winner` nếu refactor)
- [ ] Smoke lại kịch bản Chrome của T-005 (lấy/bỏ vé ở ván mới) và T-006 (bắt đầu ván 2)
- [ ] Ảnh chụp 375×812 cho 4 trang SCR-09: đồng kinh, chờ xác nhận (host), chờ xác nhận (player, host offline), chúc mừng

## 7. Ghi chú
- `[ASSUMED]` Mở rộng `createClaim` trong T-007 (nhánh Kinh đúng trong `claim_window` + `CLAIMS_CLOSED` ở `awaiting_confirm`): slices T-006 để "cửa sổ đồng kinh" ra ngoài phạm vi và T-007 có BR-18/FLOW-08 A2, nhưng `createClaim` không có trong danh sách operationId của T-007. **Đề xuất** ghi rõ trong slices.md: T-007 dùng lại/mở rộng `createClaim`.
- `[ASSUMED]` Cửa sổ đồng kinh không gia hạn khi có người đồng kinh; Kinh tới sau `claim_window_ends_at` (dù chưa ai đóng) → `CLAIMS_CLOSED`.
- `[ASSUMED]` Ván tự kết thúc do phòng quá hạn: `result = won`, `confirmed_by = null`.
- `[ASSUMED]` Đếm ngược dùng server time offset (RTDB `.info/serverTimeOffset`) và jitter 0–300ms khi gọi `closeClaimWindow`.
- `[ASSUMED]` Overlay chỉ tự mở khi trạng thái chuyển trong phiên; tải lại trang khi ván đã `finished` không mở lại overlay ván cũ.
- `[ASSUMED]` Tên kịch bản seed.
- Lệch spec nhỏ: `confirmGame` trong api-contract có nhánh "phòng `closing`", nhưng `closeClaimWindow` đã đóng phòng `closing` trước khi tới `awaiting_confirm`; nhánh này chỉ xảy ra qua lazy expiry (phòng quá hạn lúc chờ xác nhận) — code theo api-contract, test ở AC-17.
- Lệch spec nhỏ: wireframe.md SCR-09.A0 ghi đọc `games/{current}`, scr-09 ghi giữ gameId của ván vừa có KINH — làm theo scr-09 (AC-21).
- Point 8 giữ nguyên; nếu phải refactor `drawNumber` dùng `finishGameAndRollOver` thì vẫn trong 8.
