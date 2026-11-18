# T-005 · Chọn vé: xem 16 vé, lấy/bỏ vé, host tạo bộ vé mới

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-04 | M1 | 8 | T-004 | TODO |

## 1. Mục tiêu demo
Sau task này: **player trong phòng mở sheet "Vé" (SCR-05), thấy 16 vé thu nhỏ theo màu kèm người giữ, chạm một vé để xem trước kiểu vé giấy, bấm "Lấy vé này" (tối đa 2 vé) và người khác trong phòng thấy vé đó có chủ trong ≤ 1 giây; bỏ vé được khi ván đang chờ. Host bấm "Tạo bộ vé mới": còn người giữ thì thấy dialog danh sách người giữ (online/offline), thu hồi vé người offline, rồi tạo bộ vé mới và cả phòng thấy toast "Bộ vé mới đã được tạo".**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-05.A0 | Realtime: `rooms/{roomId}/tickets` (16 doc), `games/{current_game_id}/players`, RTDB `presence/{roomId}` |
| Thao tác | SCR-05.A1 | Lấy vé |
| Thao tác | SCR-05.A2 | Bỏ vé |
| Thao tác | SCR-05.A3 | Tạo bộ vé mới (host) |
| Thao tác | SCR-05.A4 | Thu hồi vé người offline trong dialog "Chưa tạo được bộ vé mới" (host) |
| API | `takeTicket` | `takeTicketAction({roomId, ticketId})` → `MyTickets` |
| API | `releaseTicket` | `releaseTicketAction({roomId, ticketId})` → `MyTickets` |
| API | `renewTicketSet` | `renewTicketSetAction({roomId})` → `TicketSetRenewed` |
| API | `reclaimPlayerTickets` | `reclaimPlayerTicketsAction({roomId, uid})` → `ReclaimResult`; T-009 dùng lại |
| Dữ liệu | TBL-06 `players` | **tạo mới** (doc tạo khi lấy vé đầu tiên; `ticket_ids` 0–2) + index `ticket_ids` array-contains |
| Dữ liệu | TBL-03 `tickets` | ghi đè `grid`, `set_no`, `updated_at` khi tạo bộ mới; còn lại chỉ đọc |
| Dữ liệu | TBL-02 `rooms` | `ticket_set_no + 1`, `last_event` (`ticket_set_renewed`, `tickets_reclaimed`); đọc `host_uid`, `current_game_id` |
| Dữ liệu | TBL-05 `games` | chỉ đọc `status` |
| Dữ liệu | TBL-08 RTDB `presence/{roomId}/{uid}` | client ghi node của mình + `onDisconnect`; server đọc khi thu hồi / trả `TICKETS_STILL_HELD` |
| Rule | BR-09 | Tối đa 2 vé / người, mỗi vé tối đa 1 người, không bắt buộc theo cặp |
| Rule | BR-10 | Chỉ lấy/bỏ khi ván `waiting` |
| Rule | BR-11 | Vé giữ từ ván trước vẫn hiện "Bạn" (chỉ hiển thị; chép player sang ván mới làm ở T-007) |
| Rule | BR-12 | Tạo bộ mới chỉ khi `waiting` và không còn ai giữ vé |
| Rule | BR-13 | Host thu hồi vé người offline khi `waiting` |
| Rule | BR-08 | Bộ mới sinh bằng `generateTicketSet` (đã có từ T-003, ADR-14) |
| Phụ trợ | SUP-01 | `last_event` → toast; listener `players` cho lấy/bỏ vé |
| Phụ trợ | SUP-04 | Presence online/offline |
| NFR | NFR-02 | Lấy/bỏ vé tới người khác ≤ 1 giây |
| NFR | NFR-08, NFR-09 | Sinh vé ở server; thao tác host bị chặn với non-host |
| Flow | FLOW-05 bước 1–5, A1–A3, E1–E3 | |
| Flow | FLOW-04 bước 1–5, A1, A2, E1, E2 | |

**Ngoài phạm vi:**
- Vẽ vé đang giữ trong màn phòng, nút "Chọn vé" ở thẻ "Bạn chưa có vé", chạm vé ở SCR-04 để mở SCR-05, thanh nút dưới đầy đủ (T-006).
- Chuyển ván sang `running` (`startGame` – T-006): trong task này trạng thái ván ≠ `waiting` chỉ tạo bằng seed/Emulator UI để kiểm khóa.
- Chép player sang ván mới (BR-11, `confirmGame` – T-007).
- Sheet "Người trong phòng" + kick (T-009, dùng lại `reclaimPlayerTickets`).
- Người vào lại phòng không được trả vé cũ (BR-25 – `leaveRoom` T-006 / `joinRoom` T-004).

## 3. Việc cần làm
### UI
- [ ] Nút mở sheet "Vé" trên khung trang phòng hiện có (từ T-003/T-004) `[ASSUMED]`: thêm nút "Vé" ở vị trí thanh nút dưới; T-006 thay bằng tab bar đầy đủ.
- [ ] Component `TicketSheet` (sheet trượt từ dưới, chiều cao từ dưới header tới trên thanh nút dưới — SCR-05 §1), bố cục ở viewport 375×812:
  - [ ] Header "Chọn vé" + dòng đếm "Bạn giữ {k}/2 vé · {x}/16 vé đã có chủ" (#1); hết vé trống → thêm "Hết vé trống — chờ người khác bỏ vé ở ván sau" (FLOW-05 A2).
  - [ ] Banner khóa "🔒 Ván đang chạy — chỉ lấy/bỏ vé khi ván chờ bắt đầu." khi `games.status ≠ waiting` (#2).
  - [ ] Lưới 16 thẻ vé 4×4, thứ tự màu cố định `red, orange, yellow, green, teal, blue, purple, pink`, A rồi B, mỗi hàng 2 cặp (#3). Thẻ: nhãn "{Màu} {A/B}" (Đỏ, Cam, Vàng, Lục, Ngọc, Lam, Tím, Hồng), hình thu nhỏ vé (3 khối 3 hàng, ô trống tô màu vé đậm, ô có số màu trắng, không hiện số), người giữ = player có `ticket_ids ∋ ticketId` (ảnh + `display_name`) hoặc "Trống"; vé của tôi viền đậm + nhãn "Bạn".
  - [ ] Ván không `waiting` + người giữ không còn trong `presence/{roomId}` → thẻ hiện "Khóa tới hết ván" (#3, BR-22, Q-050).
  - [ ] Màn xem trước vé trong sheet (nút ‹ quay lại) (#4): component `PaperTicket` lưới 9×9 kiểu vé giấy (khung + tiêu đề màu vé, 3 khối 3 hàng cách dải hoa văn, ô trống đặc màu vé đậm, ô số nền trắng chữ đen 17px, ô 38×32px — cùng spec SCR-04 §5); dòng phụ "Trống · cặp với vé {màu} {cạnh khác} ({người giữ})" hoặc tên người giữ. `PaperTicket` viết dùng chung để T-006/T-007 dùng lại.
  - [ ] Nút "Lấy vé này" (#5) với các biến thể khóa: "Tối đa 2 vé" (đã giữ 2), "Đã có người lấy" (có chủ), "Ván đang chạy" (≠ `waiting`). Nút "Bỏ vé" (#6) chỉ khi vé của tôi + `waiting`. Vùng bấm ≥ 44px (NFR-12).
  - [ ] Lấy vé xong không đóng sheet (Q-050); nút đang gửi → disabled + spinner, chống bấm đôi.
  - [ ] Host + `waiting`: nút "Tạo bộ vé mới" (#7). Bấm: client thấy 0 người giữ → dialog xác nhận (#9) "Tạo bộ vé mới? 16 vé sẽ được sinh lại cho cả phòng." Hủy / Tạo; còn người giữ → gọi action vẫn được nhưng mở dialog #8 theo `details[]` của lỗi `TICKETS_STILL_HELD` `[ASSUMED]`: luôn hỏi xác nhận #9 trước, server là nguồn quyết định — lỗi `TICKETS_STILL_HELD` mở #8.
  - [ ] Dialog "Chưa tạo được bộ vé mới" (#8): danh sách người giữ (ảnh, tên, chip vé, online/offline lấy realtime từ RTDB `presence`, không chỉ từ `details`); người offline có nút "Thu hồi" → `reclaimPlayerTickets`; người online có dòng "Nhắc họ bỏ vé". Thu hồi xong dòng đó biến mất; danh sách rỗng → nút "Tạo bộ vé mới" trong dialog bật.
  - [ ] Non-host không thấy #7, #8, #9.
  - [ ] Trạng thái: Loading = 16 thẻ skeleton theo màu; Error đọc = "Không tải được bộ vé" + "Thử lại" (gắn lại listener); lỗi thao tác = toast.
  - [ ] Map mã lỗi → toast (SCR-05 §3): `TICKET_TAKEN` "Vé đã có người lấy"; `TICKET_LIMIT_REACHED` "Tối đa 2 vé"; `GAME_NOT_WAITING` (lấy/bỏ) "Ván đã bắt đầu, không đổi vé được", (tạo bộ mới) "Chỉ tạo bộ vé mới khi ván chờ bắt đầu"; `TICKET_NOT_HELD` → không toast, để listener làm mới; `TARGET_ONLINE` → toast "Người này đang online, không thu hồi được" `[ASSUMED]`; lỗi mạng / `INTERNAL_ERROR` → toast "Có lỗi, thử lại" `[ASSUMED]`.
- [ ] Toast phòng từ `rooms.last_event`: `ticket_set_renewed` → "Bộ vé mới đã được tạo"; `tickets_reclaimed` → "Host đã thu hồi vé của {tên}" (người bị thu hồi thấy "Host đã thu hồi vé của bạn") `[ASSUMED]` câu chữ. Nếu T-004 đã có hook toast `last_event` chung thì chỉ thêm 2 loại này.
- [ ] Hook `usePresence(roomId)`: khi ở trang phòng ghi `presence/{roomId}/{me} = {online: true, display_name, photo_url, at: ServerValue.TIMESTAMP}` + `onDisconnect().update({online: false})`; T-006 dùng lại.
- [ ] Chuỗi tiếng Việt vào từ điển chung (NFR-16).

### API / Backend
- [ ] `takeTicketAction` (api-contract `takeTicket`): session → Zod (`roomId`, `ticketId` dạng `{color}_{a|b}`) → lazy expiry phòng (dùng chung) → transaction trên `rooms.current_game_id`:
  - không phải thành viên (`users.current_room_id ≠ roomId`) → `403 NOT_ROOM_MEMBER`; vé không tồn tại → `404 TICKET_NOT_FOUND`;
  - ván ≠ `waiting` → `409 GAME_NOT_WAITING` (BR-10);
  - query `players where ticket_ids array-contains ticketId` có kết quả → `409 TICKET_TAKEN` (BR-09; hai người cùng lấy → người commit sau nhận lỗi);
  - mình đã giữ 2 → `422 TICKET_LIMIT_REACHED`;
  - tạo (nếu chưa có) `players/{uid}` với `display_name`, `photo_url` từ `users`, `joined_at`, `expire_at`; `arrayUnion(ticketId)`. Không ghi `last_event`. Trả `{gameId, ticketIds}`.
  - Thứ tự kiểm `[ASSUMED]`: member → ticket tồn tại → `waiting` → đã có chủ → giới hạn 2.
- [ ] `releaseTicketAction` (`releaseTicket`): member, vé tồn tại, `waiting` (`GAME_NOT_WAITING`), `ticketId ∈ players/{uid}.ticket_ids` khác → `409 TICKET_NOT_HELD`; `arrayRemove`, giữ doc với `[]` (Q-047).
- [ ] `renewTicketSetAction` (`renewTicketSet`): member, host (`403 NOT_ROOM_HOST`), `waiting`, mọi player có `ticket_ids` rỗng; còn người giữ → `409 TICKETS_STILL_HELD` với `details[] = {code: "holder", uid, displayName, ticketIds, online}` (online đọc RTDB `presence/{roomId}/{uid}` bằng Admin SDK). Hợp lệ → `generateTicketSet(crypto rng)` ghi đè `grid`, `set_no`, `updated_at` của 16 doc; `rooms.ticket_set_no + 1`; `last_event = {type: ticket_set_renewed, actor_uid, at}`; trả `{ticketSetNo}`. Không tự thu hồi.
- [ ] `reclaimPlayerTicketsAction` (`reclaimPlayerTickets`): member, host, `uid ≠ me` (`422 CANNOT_TARGET_SELF`), có doc player ở ván hiện tại (`404 PLAYER_NOT_FOUND`), `waiting`, đích offline theo RTDB (`online = false` hoặc không có node) khác → `409 TARGET_ONLINE`. Xóa doc player; `last_event = {type: tickets_reclaimed, actor_uid, target_uid, at}`; trả `{uid, releasedTicketIds}`.
  - Đọc RTDB nằm ngoài Firestore transaction `[ASSUMED]`: đọc presence trước, rồi transaction kiểm phần Firestore; chấp nhận khoảng hở nhỏ (ADR-06).
- [ ] Mọi action trả `ActionResult<T>` và mã lỗi đúng bảng lỗi api-contract.

### Data
- [ ] `firestore.indexes.json`: single-field `ticket_ids` array-contains cho collection group `players` (nếu emulator/production cần khai báo).
- [ ] `firestore.rules`: xác nhận `tickets`, `games/*/players` đọc được bởi thành viên phòng (rule cây con `rooms/{roomId}` từ T-003), client không ghi được.
- [ ] `database.rules.json`: `presence/{roomId}/{uid}` chỉ chính chủ ghi khi `presence_access/{roomId}/{uid} == true`; thành viên (có `presence_access`) đọc được `presence/{roomId}`. Nếu T-004 đã viết → chỉ bổ sung test.
- [ ] Script seed (mở rộng script của T-001) thêm kịch bản:
  - `tickets-basic`: phòng `active`, ván 1 `waiting`, host H + player B + player C là thành viên (có `presence_access`), chưa ai giữ vé.
  - `tickets-running`: như trên nhưng B giữ `red_a`, C giữ `blue_b`, ván `running`, C **không** có node presence (đã rời) — để kiểm khóa và "Khóa tới hết ván".
  - `tickets-carry`: ván 2 `waiting`, player B đã có `ticket_ids: [green_a]` (giả lập chép từ ván 1) — kiểm BR-11.
  `[ASSUMED]` tên kịch bản / cú pháp `npm run seed -- <tên>`.

### Khác
- [ ] Không có biến môi trường mới.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | B là thành viên phòng, ván `waiting`, chưa ai giữ vé | B mở sheet "Vé" | Thấy đúng 16 thẻ theo thứ tự Đỏ A, Đỏ B, Cam A … Hồng B (4×4), mỗi thẻ có hình thu nhỏ vé và "Trống"; dòng đếm "Bạn giữ 0/2 vé · 0/16 vé đã có chủ" | SCR-05.A0, FLOW-05 bước 1, BR-08 |
| AC-2 | Như AC-1 | B chạm thẻ "Đỏ A" | Mở màn xem trước: vé 9×9 kiểu vé giấy (khung + tiêu đề màu đỏ, 3 khối 3 hàng, ô trống tô đỏ đậm, ô số nền trắng chữ đen, đúng 5 số mỗi hàng, khớp `tickets/red_a.grid` trên Emulator UI); dòng phụ "Trống · cặp với vé Đỏ B (Trống)"; nút "Lấy vé này" bật | SCR-05 #4, Q-049 |
| AC-3 | Như AC-2; C mở sheet ở cửa sổ khác | B bấm "Lấy vé này" | B: thẻ Đỏ A hiện "Bạn" viền đậm, đếm "1/2 · 1/16", sheet không đóng; Emulator: `games/{g1}/players/{B}` có `ticket_ids: ["red_a"]`, `display_name`, `joined_at`; C: thẻ Đỏ A hiện ảnh + tên B trong ≤ 1 giây | FLOW-05 bước 2–5, SUP-01, NFR-02 |
| AC-4 | B giữ `red_a` | B lấy thêm `pink_b` (khác màu) | Thành công, B giữ 2 vé "Bạn giữ 2/2" — không bắt buộc theo cặp | BR-09 |
| AC-5 | B giữ 2 vé | B mở xem trước một vé trống | Nút hiện "Tối đa 2 vé" và bị khóa; gọi action trực tiếp (test) trả `422 TICKET_LIMIT_REACHED`, `ticket_ids` không đổi | BR-09, FLOW-05 E2 |
| AC-6 | B giữ `red_a`; C mở xem trước `red_a` | — | Nút hiện "Đã có người lấy" khóa; dòng phụ hiện tên B | BR-09, FLOW-05 E3 |
| AC-7 | B và C cùng mở xem trước `teal_a` trống | Cả hai bấm "Lấy vé này" gần như cùng lúc | Đúng 1 người giữ `teal_a` trên Emulator; người còn lại thấy toast "Vé đã có người lấy" và thẻ cập nhật tên người kia | BR-09, FLOW-05 E3 |
| AC-8 | B giữ `red_a`, ván `waiting` | B mở xem trước `red_a`, bấm "Bỏ vé" | Thẻ về "Trống" ở cả B và C (≤ 1 giây); Emulator: `players/{B}.ticket_ids = []` (doc vẫn còn) | FLOW-05 A1, BR-10, NFR-02 |
| AC-9 | Ván `running` (seed `tickets-running`), B giữ `red_a` | B mở sheet | Banner "🔒 Ván đang chạy — chỉ lấy/bỏ vé khi ván chờ bắt đầu."; mọi nút lấy hiện "Ván đang chạy" khóa; không có "Bỏ vé"; host không thấy "Tạo bộ vé mới"; gọi `takeTicket`/`releaseTicket` (test) → `409 GAME_NOT_WAITING` | BR-10, FLOW-05 E1, SCR-05 trạng thái |
| AC-10 | Seed `tickets-running`: C giữ `blue_b` nhưng không còn node presence | B mở sheet | Thẻ Lam B hiện "Khóa tới hết ván" | SCR-05 #3, BR-22, Q-050 |
| AC-11 | Seed `tickets-carry`: ván 2 `waiting`, B đã có `ticket_ids: [green_a]` | B mở sheet | Thẻ Lục A hiện "Bạn", đếm "1/2" — không cần lấy lại | BR-11, FLOW-05 A3 |
| AC-12 | 15 vé đã có chủ, C đang mở sheet | B lấy vé trống cuối cùng | Ở C (16/16 có chủ): dòng 1 thêm "Hết vé trống — chờ người khác bỏ vé ở ván sau" | FLOW-05 A2, SCR-05 Empty |
| AC-13 | Host H, ván `waiting`, không ai giữ vé (`ticket_set_no = 1`) | H bấm "Tạo bộ vé mới" → dialog xác nhận → "Tạo" | Emulator: 16 doc `tickets` có `grid` mới, `set_no = 2`; `rooms.ticket_set_no = 2`, `last_event.type = ticket_set_renewed`; mọi người thấy toast "Bộ vé mới đã được tạo" và hình thu nhỏ đổi | FLOW-04 bước 1–5, BR-12, BR-08, SUP-01 |
| AC-14 | H, ván `waiting`, B (online) giữ `red_a`, C (offline) giữ `blue_b` | H bấm "Tạo bộ vé mới" → "Tạo" | Không tạo bộ mới (`ticket_set_no` không đổi); mở dialog "Chưa tạo được bộ vé mới" liệt kê B (online, "Nhắc họ bỏ vé", không có nút Thu hồi) và C (offline, nút "Thu hồi") | BR-12, FLOW-04 E2, SCR-05 #8 |
| AC-15 | Như AC-14 | H bấm "Thu hồi" ở dòng C | Emulator: doc `players/{C}` bị xóa, `last_event.type = tickets_reclaimed`, `target_uid = C`; thẻ Lam B về "Trống" ở mọi người; dòng C biến mất khỏi dialog; C vẫn là thành viên (`users/{C}.current_room_id` không đổi) | BR-13, FLOW-04 A1, A2, SUP-04 |
| AC-16 | Như AC-15, sau đó B bỏ vé `red_a` | H bấm "Tạo bộ vé mới" lần nữa | Tạo thành công như AC-13 | FLOW-04 A1 → bước 4 |
| AC-17 | B (player, không phải host) | B mở sheet; gọi `renewTicketSetAction`/`reclaimPlayerTicketsAction` (test) | UI không có nút "Tạo bộ vé mới"; action trả `403 NOT_ROOM_HOST`, dữ liệu không đổi | NFR-09, BR-21 |
| AC-18 | Ván `running` (seed) | Gọi `renewTicketSetAction`/`reclaimPlayerTicketsAction` bằng host (test) | `409 GAME_NOT_WAITING`, dữ liệu không đổi | BR-12, BR-13, FLOW-04 E1 |
| AC-19 | B online giữ vé | Host gọi `reclaimPlayerTicketsAction({uid: B})` (test) / host gọi với uid của chính mình | `409 TARGET_ONLINE` / `422 CANNOT_TARGET_SELF`; vé B không đổi | BR-13, BIZ-10 E1 |
| AC-20 | User X không phải thành viên phòng | X gọi `takeTicketAction` (test); X đọc `rooms/{roomId}/tickets` bằng client SDK (rules test) | `403 NOT_ROOM_MEMBER`; rules từ chối đọc; client ghi trực tiếp `players`/`tickets` bị rules từ chối | NFR-09, ADR-03 |
| AC-21 | Listener vé lỗi (giả lập bằng cách tắt emulator Firestore) | B mở sheet | Sheet hiện "Không tải được bộ vé" + "Thử lại"; bật lại emulator, bấm "Thử lại" → 16 thẻ hiện | SCR-05 Error |
| AC-22 | B mở trang phòng | B đóng tab | Trong Emulator UI RTDB, `presence/{roomId}/{B}.online` chuyển `false` (≤ 60 giây, ADR-06); mở lại phòng → `true` | SUP-04, ADR-06 |

## 5. Test
### Unit / integration (Vitest + Firebase Emulator)
| Case | Phủ AC |
|---|---|
| `takeTicketAction` happy: tạo doc player lần đầu với `display_name`, `photo_url`, `joined_at`; lần 2 chỉ `arrayUnion` | AC-3, AC-4 |
| `takeTicketAction` khi đã giữ 2 → `TICKET_LIMIT_REACHED`, dữ liệu không đổi | AC-5 |
| `takeTicketAction` vé đã có chủ → `TICKET_TAKEN` | AC-6 |
| Concurrency: `Promise.all` 2 user lấy cùng vé → đúng 1 ok, 1 `TICKET_TAKEN`; chạy lặp 20 lần | AC-7 |
| `takeTicketAction` / `releaseTicketAction` khi ván `running` → `GAME_NOT_WAITING` | AC-9 |
| `takeTicketAction` ticketId không tồn tại → `TICKET_NOT_FOUND`; sai format → `VALIDATION_FAILED` | AC-20 (biên) |
| `releaseTicketAction` happy (doc còn, `[]`); vé không giữ → `TICKET_NOT_HELD` | AC-8 |
| `renewTicketSetAction` happy: 16 grid đổi, `set_no`/`ticket_set_no` + 1, `last_event`; grid mới thỏa bất biến BR-08 (dùng hàm kiểm của T-003) | AC-13 |
| `renewTicketSetAction` còn người giữ → `TICKETS_STILL_HELD`, `details` đủ `uid, displayName, ticketIds, online` (presence seed trên RTDB emulator) | AC-14 |
| `renewTicketSetAction`, `reclaimPlayerTicketsAction` non-host → `NOT_ROOM_HOST`; ván `running` → `GAME_NOT_WAITING` | AC-17, AC-18 |
| `reclaimPlayerTicketsAction` happy (offline / không có node): xóa player, `last_event` `tickets_reclaimed` + `target_uid`, `users.current_room_id` giữ nguyên | AC-15 |
| `reclaimPlayerTicketsAction` đích online → `TARGET_ONLINE`; đích = mình → `CANNOT_TARGET_SELF`; đích không có player → `PLAYER_NOT_FOUND` | AC-19 |
| Mọi action với non-member → `NOT_ROOM_MEMBER`; không session → `UNAUTHENTICATED` | AC-20 |
| Firestore rules: member đọc được `tickets`, `players`; non-member bị từ chối; client ghi `players`/`tickets` bị từ chối | AC-20 |
| RTDB rules: ghi node của mình khi có `presence_access` → ok; ghi node người khác / không có `presence_access` → deny | AC-22 |
| Logic thuần UI: hàm `deriveTicketCards(tickets, players, presence, gameStatus, me)` → thứ tự màu, holder, "Bạn", "Khóa tới hết ván", đếm k/x, cờ hết vé trống, biến thể nút | AC-1, AC-6, AC-10, AC-11, AC-12 |

### Kịch bản test trên Chrome (AI chạy)
Môi trường: `npm run dev` + Firebase Emulator Suite; Chrome DevTools device mode 375×812. Ba profile Chrome: **H** (host), **B**, **C**; đăng nhập Google qua emulator. Emulator UI ở `localhost:4000`.

| Bước | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|
| 1 | Chạy `npm run seed -- tickets-basic`. H, B, C mở link phòng (đã là thành viên) | Cả 3 thấy trang phòng; Emulator UI RTDB có `presence/{roomId}/{H,B,C}.online = true` | AC-22 |
| 2 | B bấm "Vé" | Sheet "Chọn vé" trượt lên; thấy skeleton rồi 16 thẻ 4×4 thứ tự Đỏ A … Hồng B, tất cả "Trống", dòng "Bạn giữ 0/2 vé · 0/16 vé đã có chủ"; không có nút "Tạo bộ vé mới" | AC-1, AC-17 |
| 3 | B chạm "Đỏ A" | Xem trước vé giấy 9×9 đỏ, mỗi hàng 5 số; đối chiếu 1 hàng với `tickets/red_a.grid` trong Emulator UI khớp; dòng phụ "Trống · cặp với vé Đỏ B (Trống)" | AC-2 |
| 4 | C cũng mở sheet "Vé". B bấm "Lấy vé này" | B: thẻ Đỏ A "Bạn" viền đậm, "1/2 · 1/16", sheet vẫn mở; C: thẻ Đỏ A hiện ảnh + tên B gần như ngay (≤ 1 giây); Emulator: `players/{B}.ticket_ids = ["red_a"]` | AC-3 |
| 5 | B quay lại, chạm "Hồng B", lấy | "Bạn giữ 2/2 vé" | AC-4 |
| 6 | B chạm "Cam A" | Nút "Tối đa 2 vé" khóa | AC-5 |
| 7 | C chạm "Đỏ A" | Nút "Đã có người lấy" khóa, dòng phụ tên B | AC-6 |
| 8 | B và C cùng mở xem trước "Ngọc A" (B bỏ trước "Hồng B" để còn chỗ); AI bấm "Lấy vé này" ở 2 cửa sổ liên tiếp nhanh nhất có thể | Một bên lấy được; bên kia toast "Vé đã có người lấy"; Emulator chỉ 1 player có `teal_a` | AC-7 |
| 9 | B mở "Đỏ A", bấm "Bỏ vé" | B và C thấy Đỏ A "Trống"; Emulator `players/{B}.ticket_ids` không còn `red_a`, doc còn | AC-8 |
| 10 | Đảm bảo không ai giữ vé (bỏ hết). H mở sheet, bấm "Tạo bộ vé mới" → "Tạo" | Dialog xác nhận đúng câu chữ; sau "Tạo": cả 3 thấy toast "Bộ vé mới đã được tạo", hình thu nhỏ đổi; Emulator `rooms.ticket_set_no = 2`, `tickets/*.set_no = 2` | AC-13 |
| 11 | B lấy "Đỏ A", C lấy "Lam B". Đóng cửa sổ C, chờ tới khi Emulator UI RTDB `presence/{C}.online = false` | Presence C chuyển `false` | AC-22 |
| 12 | H bấm "Tạo bộ vé mới" → "Tạo" | Không có toast bộ mới; dialog "Chưa tạo được bộ vé mới" liệt kê B (online, "Nhắc họ bỏ vé") và C (offline, nút "Thu hồi"); `ticket_set_no` vẫn 2 | AC-14 |
| 13 | H bấm "Thu hồi" ở dòng C | Dòng C biến mất; thẻ Lam B "Trống" ở H và B; Emulator: không còn `players/{C}`, `last_event.type = tickets_reclaimed`; `users/{C}.current_room_id` vẫn là phòng | AC-15 |
| 14 | Mở lại profile C vào phòng, mở sheet | C không còn vé nào "Bạn"; (nếu `last_event` chưa bị ghi đè) thấy toast thu hồi | AC-15 |
| 15 | B bỏ "Đỏ A"; H bấm "Tạo bộ vé mới" → "Tạo" | Thành công, `ticket_set_no = 3` | AC-16 |
| 16 | Chạy `npm run seed -- tickets-running`; B mở sheet | Banner khóa; nút lấy "Ván đang chạy"; không có "Bỏ vé"; thẻ Lam B "Khóa tới hết ván"; H không thấy "Tạo bộ vé mới" | AC-9, AC-10, AC-18 |
| 17 | Chạy `npm run seed -- tickets-carry`; B mở sheet | Thẻ Lục A "Bạn", "Bạn giữ 1/2" | AC-11 |
| 18 | Từ `tickets-basic`, dùng Emulator UI tạo player giả giữ 15 vé; B lấy vé cuối cùng | Dòng "Hết vé trống — chờ người khác bỏ vé ở ván sau" xuất hiện ở C | AC-12 |
| 19 | Dừng emulator Firestore (hoặc DevTools → Offline trước khi mở sheet lần đầu), mở sheet | "Không tải được bộ vé" + "Thử lại"; bật lại → "Thử lại" hiện 16 thẻ | AC-21 |

AC-17 (action), AC-19, AC-20 phủ bằng integration test; AC-17 phần UI phủ ở bước 2.

### Dữ liệu seed / tiền điều kiện
- T-001..T-004 xong: đăng nhập emulator, tạo phòng sinh 16 vé, vào phòng bằng link (có `presence_access`).
- 3 tài khoản emulator: H (host), B, C; seed `tickets-basic`, `tickets-running`, `tickets-carry` (mục 3 Data).

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] Integration test concurrency lấy cùng vé pass ổn định (20 lần lặp)
- [ ] Rules Firestore + RTDB có test deny cho ghi từ client / non-member
- [ ] `PaperTicket` và `usePresence` tách thành component/hook dùng chung (T-006, T-007, T-009 dùng lại)
- [ ] Seed 3 kịch bản chạy được bằng 1 lệnh
- [ ] Ảnh chụp sheet ở 375×812: danh sách, xem trước, dialog chặn, trạng thái khóa

## 7. Ghi chú
- `[ASSUMED]` Nút "Vé" tạm trên khung trang phòng (T-003) để mở sheet; T-006 hoàn thiện tab bar.
- `[ASSUMED]` Host bấm "Tạo bộ vé mới" luôn qua dialog xác nhận #9 trước, server quyết định; `TICKETS_STILL_HELD` → mở dialog #8. Trạng thái online trong #8 lấy realtime từ RTDB, `details` chỉ là dữ liệu ban đầu.
- `[ASSUMED]` Câu toast cho `tickets_reclaimed`, `TARGET_ONLINE`, lỗi mạng (spec chưa ghi).
- `[ASSUMED]` Đọc presence RTDB ngoài transaction Firestore (không thể gộp transaction 2 DB); chấp nhận khoảng hở nhỏ.
- `[ASSUMED]` Thứ tự kiểm lỗi trong `takeTicket`: member → ticket tồn tại → `waiting` → đã có chủ → giới hạn 2.
- `[ASSUMED]` Tên kịch bản seed và cú pháp `npm run seed -- <tên>`.
- Lệch spec: `scr-05-tickets.md` ghi path `POST /rooms/{roomId}/tickets/regenerate`; nguồn chuẩn `api-contract.yml` là `POST /rooms/{roomId}/ticket-set/renew` (Server Action `renewTicketSetAction`) — làm theo api-contract.
- Lệch spec: `reclaimPlayerTickets` trong api-contract chỉ có `x-screens: [SCR-07.A2]`, thiếu `SCR-05.A4` (đã duyệt ở Q-050) — nên bổ sung ở api-contract (không sửa trong task này).
- Vì `startGame` chưa có (T-006), trạng thái ván ≠ `waiting` chỉ kiểm qua seed; khi xong T-006 chạy lại bước 16 với ván thật.
- Point 8 giữ nguyên: 4 action + 2 dialog + presence + `PaperTicket` dùng chung.
