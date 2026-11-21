# T-003 · Trang chủ & tạo phòng (SCR-02)

> ⚠ **Cần cập nhật (2026-11-19, Q-055..Q-058 – đối chiếu specs/actions.md):** `createRoom` sinh thêm `join_code` 6 ký tự (BR-30, Q-056); SCR-02 thêm card "Vào phòng" + dialog nhập mã → `joinRoom({roomCode})` (SCR-02.A4) — hoặc gộp vào T-004; nhãn trạng thái ván bỏ `claim_window`, `awaiting_confirm` = "Chờ host duyệt" (Q-055).

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-02 | M1 | 8 | T-002 | DONE |

## 1. Mục tiêu demo
Sau task này: **người dùng đã đăng nhập mở SCR-02, nhập tên phòng (hoặc để trống) rồi bấm "Tạo phòng" → vào trang phòng tối thiểu, thấy tên phòng, "Ván 1 · Chờ bắt đầu", "1 người" và link mời `/join/{code}`. Emulator có room, ván 1 `waiting` và 16 vé đúng BR-08. Người đang ở phòng mở lại app thì vào thẳng phòng. Người không ở phòng bấm Đăng xuất thì về SCR-01.**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-02.A0 | Tải hồ sơ + phòng hiện tại (listener `users/{uid}`, `rooms/{current_room_id}`) |
| Thao tác | SCR-02.A1 | Tạo phòng |
| Thao tác | SCR-02.A2 | Về phòng hiện tại |
| Thao tác | SCR-02.A3 | Đăng xuất, chỉ nhánh **không ở phòng** |
| API | `createRoom` → `createRoomAction` | `POST /rooms`, body `{name?}` → `RoomCreated` |
| API | `deleteCurrentSession` → `deleteCurrentSessionAction` | Chỉ nhánh không ở phòng. Nhánh ở phòng làm ở T-011 |
| Dữ liệu | TBL-02 `rooms` | Tạo mới |
| Dữ liệu | TBL-03 `tickets` | Tạo mới |
| Dữ liệu | TBL-05 `games` | Tạo mới |
| Dữ liệu | TBL-01 `users` | Ghi `current_room_id` |
| Dữ liệu | RTDB `presence_access/{roomId}/{uid}` | Server ghi `true` |
| Rule | BR-02 | Mỗi người tối đa 1 phòng |
| Rule | BR-04 | `expires_at = created_at + 8h`; lazy expiry khi tạo phòng mà phòng cũ đã quá hạn |
| Rule | BR-05 | `invite_code` tạo cùng phòng, `invite_expires_at = expires_at` |
| Rule | BR-07 | Ván 1 `waiting` tạo cùng phòng |
| Rule | BR-08 | `generateTicketSet` (ADR-14) |
| NFR | NFR-08 | Vé và mã mời sinh bằng `crypto` ở server |
| NFR | NFR-09 | Mã mời không đoán được; chỉ thành viên đọc được phòng |
| NFR | NFR-11 | `expire_at = created_at + 31 ngày` trên mọi doc thuộc phòng |
| Flow | FLOW-02 bước 1–7, E1 | |
| Flow | FLOW-01 bước 6–8 | Điều hướng khi mở app |
| ADR | ADR-03, ADR-05 (lazy expiry), ADR-09, ADR-14 | |

**Ngoài phạm vi:**
- Nội dung đầy đủ của trang phòng SCR-04: header, panel số, vé, nút Mời/Web Share, toast `last_event` (T-006).
- Lấy vé / RTDB presence (T-005).
- Đăng xuất khi đang ở phòng (T-011).
- Màn Hồ sơ SCR-10 (T-011).
- Banner lý do "bị kick" / "đã rời" (T-009, T-006 ghi lý do; T-003 dựng component banner).
- Cấu hình TTL policy (T-013).

## 3. Việc cần làm
### UI
- [x] Route `/` (SCR-02), thay khung tối thiểu của T-002. Server component:
  - Chưa có phiên → `/login`.
  - `users.current_room_id ≠ null` → `redirect('/room')`. Mở app khi đang ở phòng thì vào thẳng phòng (FLOW-01 bước 6, wireframe §3).
  - Còn lại render client component `HomeScreen`.
- [x] Header chung ngoài phòng: logo "LÔ TÔ" (1); avatar (2) lấy `photo_url`, rỗng thì hiện chữ cái đầu của `display_name`; menu avatar (3).
  - Mục "Đăng xuất": chỉ hiện khi `current_room_id = null`. `[ASSUMED]`
  - Mục "Hồ sơ cá nhân": ẩn tới T-011. `[ASSUMED]`
- [x] `HomeScreen` (SCR-02.A0) nghe realtime `users/{uid}`; khi `current_room_id ≠ null` thì nghe thêm `rooms/{current_room_id}` và `games/{current_game_id}`.
  - Loading: header + skeleton card cho tới khi listener `users` trả lần đầu.
  - Error: listener lỗi hoặc mất mạng → banner "Mất kết nối – đang thử lại…"; nút Tạo phòng vẫn bấm được.
  - Empty (chưa ở phòng):
    - (5) "Xin chào, {display_name}".
    - (6) Ô tên phòng: placeholder "Phòng của {display_name}", `maxLength = 50`, bộ đếm `x/50` đếm theo ký tự Unicode.
    - (7) Nút "Tạo phòng", khóa khi đang gửi.
    - (8) Gợi ý "Muốn vào phòng bạn bè? Mở link mời bạn nhận được…".
  - Đang ở phòng: card (9) thay (6)–(7). Card có tên phòng, "Ván {game_count} · {trạng thái ván} · {member_count} người", nút "Về phòng" → `/room` (SCR-02.A2).
- [x] SCR-02.A1, khi bấm "Tạo phòng":
  - Client trim tên; rỗng thì không gửi `name`.
  - Gọi `createRoomAction`. Thành công → `router.push('/room')`.
  - `ALREADY_IN_ROOM` → toast "Bạn đang ở phòng {tên}" (tên đọc từ listener phòng hiện tại) và chuyển sang card (9).
  - `VALIDATION_FAILED` / `ROOM_NAME_INVALID` → lỗi đỏ dưới ô (6) "Tên phòng từ 1 đến 50 ký tự".
  - Lỗi khác → toast "Không tạo được phòng, thử lại".
- [x] Banner lý do rời phòng (4), component `LeaveReasonBanner`: đọc `sessionStorage['loto:leaveReason'] = {reason, roomName}`, có nút ✕, tự ẩn khi tải lại trang.
  - Task này ghi lý do `expired` khi listener thấy `current_room_id` chuyển từ phòng X sang `null` mà snapshot cuối của X có `status = closed` hoặc `expires_at` đã qua → "Phòng "{tên}" đã hết hạn."
  - Không xác định được lý do → "Bạn không còn ở trong phòng."
  - Hai lý do `kicked` / `left` có sẵn chữ trong từ điển, task sau mới ghi (SCR-02 §5).
- [x] SCR-02.A3: menu → "Đăng xuất" → `deleteCurrentSessionAction()` → Firebase Auth `signOut()` (client) → `router.replace('/login')`. `UNAUTHENTICATED` cũng xử lý như thành công.
- [x] Route `/room` (trang phòng **tối thiểu**, thay bản giữ chỗ của T-002). T-006 thay bằng SCR-04 đầy đủ.
  - Server component: không có phiên → `/login`; `current_room_id = null` → `/`.
  - Client nghe `rooms/{id}` + `games/{current_game_id}`. Hiện tên phòng, "Ván {game_count} · {Chờ bắt đầu}", "{member_count} người", và link mời `{NEXT_PUBLIC_APP_URL}/join/{invite_code}` (chỉ host thấy) kèm nút "Copy link".
  - Nghe `users/{me}`: `current_room_id` thành `null` → ghi lý do (như banner 4) → `/`.
  - `[ASSUMED]` Hiện link mời dạng chữ để T-004 demo được. Nút Mời/Web Share thật thuộc T-006.

### API / Backend
- [x] `createRoomAction({name?})` (`auth: 'required'`).
  - Zod `RoomCreate`: `name` string optional, không có field lạ.
  - Sau trim: có gửi `name` mà rỗng hoặc > 50 ký tự → `ROOM_NAME_INVALID` (422). Không gửi `name` → "Phòng của {display_name}", cắt còn 50 ký tự nếu dài hơn. `[ASSUMED]`
  - Transaction:
    1. Đọc `users/{uid}`.
    2. `current_room_id ≠ null` → đọc phòng đó. Phòng `active` mà `now ≥ expires_at` → `applyLazyExpiry` rồi tiếp tục. Phòng `closed` (dữ liệu lệch) → coi như trống. Còn lại → `ALREADY_IN_ROOM` (409), `details: [{code: 'current_room', currentRoomId}]` (BR-02, FLOW-02 E1).
    3. Tạo `rooms/{roomId}` (auto-id) đúng mô tả của api-contract:
       - `name`, `host_uid = created_by = uid`, `status = 'active'`, `member_count = 1`, `blocked_uids = []`.
       - `invite_code = randomBase62(22)` dùng `crypto.randomInt`. `[ASSUMED]` Không kiểm trùng vì xác suất ~2⁻¹²⁸.
       - `expires_at = invite_expires_at = now + 8h`, `draw_interval_sec = 5`, `called_numbers = []`.
       - `current_game_id`, `game_count = 1`, `ticket_set_no = 1`, `last_event = null`, `created_at`, `updated_at`, `expire_at`.
    4. Tạo `rooms/{roomId}/games/{gameId}`: `seq_no = 1`, `status = 'waiting'`, `winners = []`, `player_count = 0`, `created_at`, `expire_at`. Các field còn lại `null`.
    5. Tạo 16 doc `tickets/{color}_{side}` từ `generateTicketSet(cryptoRng)`, mỗi doc có `set_no = 1`, `updated_at`, `expire_at`.
    6. `users.current_room_id = roomId`, `updated_at`, `last_active_at`.
  - Sau commit: RTDB `presence_access/{roomId}/{uid} = true`. Lỗi → log `severity: ERROR` và vẫn trả thành công. `[ASSUMED]` Presence chỉ dùng từ T-005, RTDB không nằm trong transaction Firestore.
  - Trả `RoomCreated {roomId, name, inviteCode, inviteUrl, currentGameId, drawIntervalSec, expiresAt}`, `inviteUrl = ${NEXT_PUBLIC_APP_URL}/join/${inviteCode}`.
- [x] `src/domain/tickets/generateTicketSet.ts` (ADR-14), hàm thuần `generateTicketSet(rng: () => number)`:
  - Trả 16 vé `{id: '{color}_{side}', color, side, grid: number[81]}`, màu theo thứ tự `red, orange, yellow, green, teal, blue, purple, pink`.
  - Mỗi cặp: chia số từng cột cho vé a/b (cột 1: 1–9, cột 2–8: 10 số, cột 9: 80–90). Sinh ma trận 0/1 9×9 với tổng hàng = 5, tổng cột = số được chia; bế tắc thì thử lại. Số trong cột tăng dần từ trên xuống.
  - Kèm `cryptoRng()` dùng `crypto.randomInt` và `seededRng(seed)` cho test/seed.
- [x] `src/server/rooms/applyLazyExpiry.ts` (BR-04, ADR-05 lazy expiry), dùng chung cho T-004, T-006, T-007.
  - Chạy trong transaction được truyền vào, chỉ khi `status = active` và `now ≥ expires_at`.
  - Ván hiện tại `waiting`: ván → `cancelled` (`result = cancelled`, `ended_at`); phòng → `closed`, `close_reason = expired`, `closed_at`, `member_count = 0`, `last_event = {type: room_closed}`; mọi `users where current_room_id == roomId` → `null`. Sau commit xóa RTDB `presence/{roomId}` và `presence_access/{roomId}`.
  - Ván đang diễn ra: phòng → `closing`, `last_event = room_closing`. T-006/T-007 bổ sung phần còn lại.
  - Trả trạng thái mới để action gọi xử lý tiếp.
- [x] `deleteCurrentSessionAction()` (`auth: 'required'`):
  - Nhánh không ở phòng: xóa cookie `__session` (`maxAge: 0`), `auth.revokeRefreshTokens(uid)`, trả `null` (204).
  - Nhánh `current_room_id ≠ null`: chưa hiện thực, ném `AppError('INTERNAL_ERROR')`, log `not_implemented_until_T-011`, không đổi dữ liệu. `[ASSUMED]` T-011 thay bằng logic Q-052.

### Data
- [x] `firestore.rules`: thêm `function isMember(roomId) { return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.current_room_id == roomId; }`.
  - `match /rooms/{roomId}`: `allow read: if isMember(roomId)`.
  - `match /rooms/{roomId}/{doc=**}`: `allow read: if isMember(roomId)`.
  - Mọi `write: if false`.
- [x] RTDB `database.rules.json`: `presence_access` cấm client đọc/ghi (giữ mặc định deny). Rules `presence` làm ở T-005.
- [x] Mọi doc trong `rooms/{roomId}/**` có `expire_at = created_at + 31 ngày`. TTL policy khai báo ở T-013.
- [x] Index: không cần composite mới; query `users where current_room_id ==` dùng index single tự có. Thêm `fieldOverrides` tắt index cho `rooms.called_numbers` và `rooms.last_event` vào `firestore.indexes.json` (TBL-02 Indexes).
- [x] Seed:
  - Scenario `t003`: `u_an` chưa ở phòng; `u_cuc` ở phòng `r_old` đang `active`, ván `waiting`, chưa quá hạn.
  - Helper `seedRoom({roomId, hostUid, members, expiresAt, gameStatus, rngSeed})` dùng `generateTicketSet(seededRng)` để T-004..T-007 dùng lại.

### Khác
- [x] Chữ mới thêm vào `vi.ts`. Nhãn trạng thái ván: `waiting` "Chờ bắt đầu", `running` "Đang quay", `paused` "Tạm dừng", `claim_window` / `awaiting_confirm` "Đang xác nhận KINH", `finished` "Đã kết thúc", `cancelled` "Đã hủy". `[ASSUMED]`

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | "An Nguyễn" đã đăng nhập, không ở phòng | Mở `/` | Thấy "Xin chào, An Nguyễn", ô tên phòng placeholder "Phòng của An Nguyễn", bộ đếm "0/50", nút "Tạo phòng", gợi ý vào phòng bằng link mời | SCR-02.A0, trạng thái Empty |
| AC-2 | Như AC-1 | Nhập "Lô tô Tết", bấm "Tạo phòng" | Nút bị khóa khi đang gửi; vào `/room` thấy "Lô tô Tết", "Ván 1 · Chờ bắt đầu", "1 người", link `http://localhost:3000/join/{22 ký tự}` | FLOW-02 bước 1, 7 |
| AC-3 | Sau AC-2 | Xem Emulator UI | Có `rooms/{id}` với `host_uid = created_by = uid`, `status = active`, `member_count = 1`, `blocked_uids = []`, `invite_code` khớp `^[0-9A-Za-z]{22}$`, `expires_at = invite_expires_at = created_at + 8h`, `draw_interval_sec = 5`, `called_numbers = []`, `game_count = 1`, `ticket_set_no = 1`. `current_game_id` trỏ tới `games/{gid}` có `seq_no = 1`, `status = waiting`. `users.current_room_id = id`. RTDB `presence_access/{id}/{uid} = true` | FLOW-02 bước 3–6; BR-04, BR-05, BR-07 |
| AC-4 | Phòng vừa tạo | Xem `rooms/{id}/tickets` | Có đúng 16 doc `red_a … pink_b`, `set_no = 1`; mỗi `grid` 81 phần tử, mỗi hàng đúng 5 số; số ở cột j nằm trong khoảng của cột; số trong cột tăng dần; vé a ∪ vé b cùng màu = {1..90} không trùng | BR-08, FLOW-02 bước 5 |
| AC-5 | Chạy `generateTicketSet` 10.000 lần với seed ngẫu nhiên | Kiểm mọi bất biến BR-08 như AC-4 | 10.000/10.000 bộ hợp lệ; mỗi vé có 45 số | BR-08, ADR-14 |
| AC-6 | Như AC-1 | Để trống ô tên (hoặc chỉ nhập dấu cách), bấm "Tạo phòng" | Phòng tên "Phòng của An Nguyễn" | FLOW-02 bước 1 |
| AC-7 | Gọi `createRoomAction` trực tiếp | `name` 51 ký tự, hoặc `"   "` | `ROOM_NAME_INVALID`, không tạo doc nào. Trên UI ô (6) không cho gõ quá 50 ký tự, bộ đếm dừng ở "50/50" | TBL-02 `name` 1–50, api-contract |
| AC-8 | `u_cuc` đang ở `r_old` còn hạn | Gọi `createRoomAction` | `ALREADY_IN_ROOM`, `details[0].currentRoomId = 'r_old'`; số doc `rooms` không đổi. UI hiện toast "Bạn đang ở phòng {tên r_old}" và card (9) | BR-02, FLOW-02 E1 |
| AC-9 | `u_dao` ở `r_expired` (đã quá `expires_at`, ván `waiting`, 2 thành viên) | `u_dao` gọi `createRoomAction` | Tạo phòng mới thành công. `r_expired`: `status = closed`, `close_reason = expired`, `member_count = 0`. Ván cũ `cancelled`. `users.current_room_id` của `u_em` = `null` | BR-04, ADR-05 lazy expiry |
| AC-10 | `u_cuc` đang ở phòng | Mở `/` | Bị chuyển `/room` (không dừng ở trang chủ) | FLOW-01 bước 6, wireframe §3 |
| AC-11 | Tab A ở `/` (chưa ở phòng); tab B cùng user tạo phòng | Quan sát tab A | Trong ≤ 1 giây tab A đổi sang card (9) có tên phòng, "Ván 1 · Chờ bắt đầu · 1 người"; bấm "Về phòng" → `/room` | SCR-02.A0, SCR-02.A2, NFR-02 |
| AC-12 | Tab A đang hiện card (9) của phòng X | Phòng X bị đóng do hết hạn (sửa `expires_at` về quá khứ, cho `status = closed`, rồi `users.current_room_id = null` trên Emulator UI) | Card (9) biến mất, hiện lại form tạo phòng và banner "Phòng "{X}" đã hết hạn."; bấm ✕ thì banner ẩn | SCR-02.A2 lỗi, SCR-02 trạng thái "Vừa rời phòng" |
| AC-13 | `/room` đang mở | `users.current_room_id` thành `null` | Trang tự chuyển về `/`, có banner lý do | SCR-04.A0 (tối thiểu) |
| AC-14 | User không ở phòng, ở `/` | Avatar → "Đăng xuất" | Về `/login`; cookie `__session` bị xóa; mở `/` lại bị chuyển `/login` | SCR-02.A3, FLOW-01 |
| AC-15 | Có bản sao cookie `__session` cũ trước khi đăng xuất | Gọi action cần phiên bằng cookie cũ | `UNAUTHENTICATED` (đã `revokeRefreshTokens`) | SUP-05, NFR-09 |
| AC-16 | User đang ở phòng, xem `/` qua card (9) | Mở menu avatar | Không có mục "Đăng xuất". `deleteCurrentSessionAction` gọi trực tiếp không đổi dữ liệu phòng/user | Phạm vi T-003 `[ASSUMED]` |
| AC-17 | User A ở phòng X; user B không ở phòng | Client SDK đọc `rooms/X`, `rooms/X/tickets/red_a`, `rooms/X/games/{gid}` và thử ghi | A đọc được cả 3; B và client chưa auth bị từ chối; mọi lệnh ghi bị từ chối | TBL-02 rules, NFR-09 |
| AC-18 | Phòng vừa tạo | Xem mọi doc `rooms/{id}`, `games/*`, `tickets/*` | Đều có `expire_at = created_at + 31 ngày` | NFR-11, ADR-10 |
| AC-19 | Sinh 10.000 mã mời | Kiểm định dạng và trùng | Mọi mã khớp `^[0-9A-Za-z]{22}$`, không trùng; sinh bằng `crypto` (không dùng `Math.random`) | NFR-09, ADR-09 |
| AC-20 | Mở `/` | Listener `users` chưa trả dữ liệu; sau đó listener lỗi | Lúc đầu thấy skeleton card; khi lỗi thấy banner "Mất kết nối – đang thử lại…" và nút "Tạo phòng" vẫn bấm được | SCR-02 trạng thái Loading, Error |
| AC-21 | Không có phiên | Gọi `createRoomAction`; mở `/` hoặc `/room` | Action trả `UNAUTHENTICATED`; trang chuyển `/login` | SCR-02 trạng thái "Không có quyền", NFR-09 |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| `generateTicketSet.test.ts`: 10.000 bộ, kiểm 16 id, 81 ô, 5 số/hàng, khoảng cột, tăng dần trong cột, cặp gộp = 1..90, 45 số/vé | AC-4, AC-5 |
| `generateTicketSet.test.ts`: `seededRng(42)` cho cùng kết quả 2 lần | AC-5 (hỗ trợ seed) |
| `randomBase62.test.ts`: 10.000 mã đúng định dạng, không trùng; spy `crypto.randomInt` được gọi | AC-19 |
| `createRoomAction` (emulator): đủ field room/game/ticket/user như AC-3; có `presence_access` trên RTDB | AC-2, AC-3, AC-4 |
| `createRoomAction`: không gửi `name` → tên mặc định; `name` 51 ký tự / chỉ dấu cách → `ROOM_NAME_INVALID`, không có doc mới | AC-6, AC-7 |
| `createRoomAction`: đang ở phòng còn hạn → `ALREADY_IN_ROOM` + `currentRoomId`, đếm số room không đổi | AC-8 |
| `createRoomAction`: phòng cũ quá hạn (đồng hồ giả) → phòng cũ `closed`/`expired`, ván `cancelled`, thành viên cũ `current_room_id = null`, phòng mới tạo được | AC-9 |
| `applyLazyExpiry.test.ts`: chưa tới hạn → không đổi; tới hạn + `waiting` → đóng; tới hạn + `running` → `closing` | AC-9 |
| `createRoomAction`: mọi doc có `expire_at` = `created_at` + 31 ngày | AC-18 |
| `deleteCurrentSessionAction`: không ở phòng → xóa cookie + thu hồi token (cookie cũ → `UNAUTHENTICATED`); ở phòng → lỗi, dữ liệu không đổi | AC-14, AC-15, AC-16 |
| `createRoomAction` không cookie → `UNAUTHENTICATED` | AC-21 |
| Rules `rooms/**`: thành viên đọc được; người ngoài / chưa auth bị từ chối; ghi bị từ chối | AC-17 |
| Component `HomeScreen`: skeleton khi chưa có dữ liệu; banner lỗi khi listener lỗi; card (9) khi có `current_room_id`; banner hết hạn khi `current_room_id` → null mà snapshot phòng đã quá hạn | AC-11, AC-12, AC-20 |

### Kịch bản test trên Chrome (AI chạy)
Tiền điều kiện: `npm run seed -- reset && npm run seed -- t003`. Viewport 375×812. Profile **P1** đăng nhập `an@example.com`, dùng 2 tab A1, A2. Profile **P2** đăng nhập `cuc@example.com` (đang ở `r_old`). Profile **P3** đăng nhập tài khoản mới `giang@example.com`.

| Bước | Profile / tab | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|---|
| 1 | P1 / A1 | Đăng nhập, ở `/` | Thấy "Xin chào, An Nguyễn", placeholder "Phòng của An Nguyễn", "0/50", nút "Tạo phòng", gợi ý link mời | AC-1 |
| 2 | P1 / A1 | Dán chuỗi 60 ký tự vào ô tên | Ô chỉ giữ 50 ký tự, bộ đếm "50/50" | AC-7 |
| 3 | P1 / A2 | Mở tab A2 tới `/` | Thấy form tạo phòng như bước 1 | AC-1 |
| 4 | P1 / A1 | Xóa ô, nhập "Lô tô Tết", bấm "Tạo phòng" | Nút khóa trong lúc gửi; tới `/room` thấy "Lô tô Tết", "Ván 1 · Chờ bắt đầu", "1 người", link `http://localhost:3000/join/…` (22 ký tự), nút "Copy link" | AC-2 |
| 5 | P1 / A2 | Quan sát, không tải lại trang | Trong ≤ 1 giây form đổi thành card "Bạn đang ở phòng" có "Lô tô Tết", "Ván 1 · Chờ bắt đầu · 1 người", nút "Về phòng" | AC-11 |
| 6 | P1 / A2 | Mở menu avatar | Không có mục "Đăng xuất" | AC-16 |
| 7 | P1 | Emulator UI → Firestore → phòng mới, `games`, `tickets`, `users/{uid}` | Field đúng AC-3; `tickets` có 16 doc `red_a … pink_b`; mọi doc trong phòng có `expire_at` = `created_at` + 31 ngày | AC-3, AC-4, AC-18 |
| 8 | P1 | Emulator UI → Realtime Database | Có `presence_access/{roomId}/{uid}: true` | AC-3 |
| 9 | P1 | Emulator UI: sửa `expires_at` của phòng về quá khứ, `status = closed`; sau đó sửa `users/{uid}.current_room_id = null` | Tab A2: card biến mất, form hiện lại kèm banner "Phòng "Lô tô Tết" đã hết hạn." Tab A1 (`/room`) tự chuyển về `/` và cũng có banner | AC-12, AC-13 |
| 10 | P1 / A2 | Bấm ✕ trên banner | Banner ẩn | AC-12 |
| 11 | P1 / A1 | Để trống ô tên, bấm "Tạo phòng" | Vào `/room` phòng "Phòng của An Nguyễn" | AC-6 |
| 12 | P1 / A2 | Quan sát card vừa hiện, bấm "Về phòng" | Tới `/room` phòng "Phòng của An Nguyễn" | AC-11 |
| 13 | P1 / A2 | Mở `http://localhost:3000/` | Bị chuyển ngay `/room` | AC-10 |
| 14 | P2 | Đăng nhập `cuc@example.com` | Vào thẳng `/room` của "Phòng của Cúc" | AC-10 |
| 15 | P3 | Đăng nhập tài khoản mới `giang@example.com` ("Giang"), ở `/` mở menu avatar | Có mục "Đăng xuất" | AC-14 |
| 16 | P3 | Bấm "Đăng xuất" | Về `/login`; DevTools không còn cookie `__session`; mở `/` bị chuyển `/login` | AC-14, AC-21 |

AC-5, AC-7 (phần server), AC-8, AC-9, AC-15, AC-17, AC-19, AC-20 được phủ bằng test tự động (AC-8 thêm component test cho toast + card). Hai tình huống AC-8 (đang ở phòng khác mà vẫn bấm Tạo phòng) và AC-9 (đang ở phòng quá hạn) không tái hiện được trên UI ở task này: `/` luôn chuyển `/room` khi đang ở phòng, và listener tự đổi sang card trước khi người dùng kịp bấm.

### Dữ liệu seed / tiền điều kiện
- Scenario `t003` (dùng `seedUser` + `seedRoom`, vé sinh bằng `seededRng` cố định):
  - `u_an` (`an@example.com`, "An Nguyễn"): không ở phòng.
  - `u_cuc` (`cuc@example.com`, "Cúc"): host phòng `r_old` "Phòng của Cúc", `active`, hết hạn sau 8 giờ, ván 1 `waiting`, `member_count = 1`.
- Test integration tự tạo dữ liệu riêng (phòng quá hạn có 2 thành viên cho AC-9, phòng khác cho AC-8), không phụ thuộc seed.

### Test tay
Đã gộp vào kịch bản Chrome. Dev review thêm thuật toán `generateTicketSet` (không có vòng lặp vô hạn, có giới hạn số lần thử lại).

## 6. Definition of Done
- [x] DoD chung (xem `backlog.md` mục 1)
- [x] Test bất biến BR-08 chạy 10.000 bộ và pass, thời gian test < 10 giây
- [x] Rules `rooms/**` có test allow (thành viên) và deny (người ngoài, chưa auth, ghi)
- [x] `applyLazyExpiry` có test riêng, được export để T-004/T-006/T-007 dùng lại
- [x] Helper seed `seedRoom` dùng được cho các task sau

## 7. Ghi chú
- `[ASSUMED]` Khi đang ở phòng, menu avatar ở SCR-02 ẩn "Đăng xuất". Server trả lỗi cho nhánh ở phòng, chưa đổi dữ liệu. T-011 làm nhánh ở phòng theo Q-052.
- `[ASSUMED]` Mục "Hồ sơ cá nhân" trong menu avatar ẩn tới T-011.
- `[ASSUMED]` Lệch giữa spec: SCR-02 ghi tên > 50 trả `VALIDATION_FAILED`; api-contract ghi `ROOM_NAME_INVALID` (rỗng sau trim hoặc > 50). Chọn: Zod chỉ kiểm kiểu, độ dài kiểm sau trim → `ROOM_NAME_INVALID`. UI xử lý cả 2 mã giống nhau. Không gửi `name` → tên mặc định.
- `[ASSUMED]` Trang `/room` tối thiểu hiện link mời dạng chữ + "Copy link" cho host, để T-004 demo được. Nút Mời/Web Share thật làm ở T-006.
- `[ASSUMED]` Ghi RTDB `presence_access` sau khi commit transaction Firestore. Lỗi chỉ log, không rollback.
- `[ASSUMED]` `applyLazyExpiry` dựng ở task này, vì `createRoom` cần nó khi `current_room_id` trỏ phòng quá hạn (ADR-05). Slices ghi T-004 "dùng chung". Nhánh ván đang chạy/chờ xác nhận chỉ dừng ở `closing`; T-006/T-007 làm đủ.
- `[ASSUMED]` `/` luôn chuyển `/room` khi đang ở phòng. Card (9) chỉ thấy khi `current_room_id` đổi lúc đang mở trang, hoặc sau lỗi `ALREADY_IN_ROOM` (SCR-02 §4).
- Kịch bản Chrome bước 9 sửa dữ liệu trên Emulator UI để giả lập phòng đóng. Trước T-006 chưa có `expireRoom`, nên đây là cách quan sát duy nhất.
- Point: giữ 8. Phần nặng nhất là `generateTicketSet` (bài toán ma trận 0/1 có ràng buộc) và `applyLazyExpiry`.

## 8. Kết quả chạy
- Test case QC: [testcases/T-003-home-create-room.md](../testcases/T-003-home-create-room.md) — 2026-11-21, P0 4/4, P1 6/6 (+3 automated), P2 1/2 (TC-11 skip: cửa sổ Chrome không thu nhỏ dưới 500px).
- Plan: [plan/T-003-home-create-room.md](../plan/T-003-home-create-room.md).
- Ghi chú ⚠ đầu file đã xử lý (dev chốt 2026-11-21):
  - `createRoom` sinh `join_code` 6 ký tự (BR-30), kiểm trùng với phòng `active`/`closing`; `RoomCreated.roomCode`; `/room` hiện "Mã phòng".
  - Nhãn trạng thái ván theo Q-055: bỏ `claim_window`, `awaiting_confirm` = "Chờ host duyệt".
  - SCR-02.A4 (nút "Vào phòng" + dialog nhập mã + `joinRoom({roomCode})`) chuyển sang **T-004**; card "Vào phòng" ở T-003 chỉ có gợi ý link mời.
- Lệch so với mô tả task:
  - Đường dẫn theo kiến trúc feature: `generateTicketSet` ở `src/features/room/shared/domain/generate-ticket-set.ts`, `applyLazyExpiry`/`planLazyExpiry` ở `src/features/room/server/services/room-expiry.service.ts`.
  - Seed T-003 đặt tên `u_cuc` là "Cúc" (T-002 là "Cúc Lê").
