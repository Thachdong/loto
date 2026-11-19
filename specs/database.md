# Database Tables

> Thiết kế tổng thể & ERD: `specs/database-design.md` · Quyết định: Q-045, Q-046, Q-047 · Cập nhật: 2026-11-18

## Danh sách bảng
| ID | Bảng | Mô tả | ENT |
|---|---|---|---|
| TBL-01 | `users/{uid}` | Tài khoản, hồ sơ, phòng hiện tại | ENT-01 |
| TBL-02 | `rooms/{roomId}` | Phòng, số đã rao, mã mời | ENT-02, ENT-04, ENT-06 |
| TBL-03 | `rooms/{roomId}/tickets/{ticketId}` | 16 vé của bộ hiện hành | ENT-07 |
| TBL-04 | `rooms/{roomId}/messages/{messageId}` | Chat phòng | ENT-10 |
| TBL-05 | `rooms/{roomId}/games/{gameId}` | Ván, người thắng | ENT-05, ENT-11 |
| TBL-06 | `rooms/{roomId}/games/{gameId}/players/{uid}` | Người lấy vé ở ván; tạo khi lấy vé | ENT-03, ENT-07 |
| TBL-07 | `stats/{yyyy-mm-dd}` | Thống kê ngày | SUP-09 |
| TBL-08 | RTDB `presence/{roomId}/{uid}` | Online/offline | SUP-04 |

Quy ước chung cho TBL-02..TBL-06: có `expire_at` (timestamp) = `rooms.created_at + 31 ngày`, dùng cho TTL (NFR-11).

---

## TBL-01 `users/{uid}`
**Mô tả:** Tài khoản người dùng. · **ENT:** ENT-01 · **Dùng bởi BIZ:** BIZ-01, BIZ-02, BIZ-03, BIZ-11, BIZ-14, BIZ-16

| Cột | Kiểu | Null | Default | Ràng buộc | Mô tả / BR |
|---|---|---|---|---|---|
| (doc id) uid | string | NO | | PK, uid Firebase Auth | |
| email | string | NO | | từ Google | Không hiển thị cho người khác (NFR-10) |
| google_name | string | NO | | | Khôi phục (BIZ-16 A1) |
| google_photo_url | string | YES | | | |
| display_name | string | NO | = google_name | 2–30 ký tự khi user tự đặt | BR-27 |
| photo_url | string | YES | = google_photo_url | | BR-27 |
| profile_customized | bool | NO | false | | true → đăng nhập lại không ghi đè (FLOW-01 A3) |
| current_room_id | string | YES | null | → TBL-02 | Đang ở phòng nào (BR-02); là quyền đọc phòng trong Security Rules (Q-047). Index single để query khi đóng phòng |
| chat_recent_at | array<timestamp> | NO | [] | ≤ 5 phần tử | Chống spam 5 tin/10 giây (SUP-07) |
| last_active_at | timestamp | NO | now | | SUP-09 |
| created_at | timestamp | NO | now | | SUP-09 |
| updated_at | timestamp | NO | now | | |

**Rules đọc:** chỉ chính chủ.

---

## TBL-02 `rooms/{roomId}`
**Mô tả:** Phòng chơi; chứa số đã rao, mã mời. · **ENT:** ENT-02, ENT-04, ENT-06 · **Dùng bởi BIZ:** BIZ-02..BIZ-08, BIZ-10, BIZ-11, BIZ-14, BIZ-16

| Cột | Kiểu | Null | Default | Ràng buộc | Mô tả / BR |
|---|---|---|---|---|---|
| (doc id) id | string | NO | auto-id | PK | |
| name | string | NO | "Phòng của {display_name}" | 1–50 ký tự | |
| host_uid | string | NO | người tạo | không đổi suốt vòng đời phòng | BR-21 (Q-048) |
| status | string | NO | `active` | enum | Vòng đời ENT-02 |
| member_count | int | NO | 1 | 0–16 | Số người có `current_room_id` = phòng này (BR-03, Q-047) |
| blocked_uids | array<string> | NO | [] | | BR-06 |
| invite_code | string | NO | | 22 ký tự base62, duy nhất | Mã trong link mời; tạo cùng phòng (Q-046, ADR-09) |
| join_code | string | NO | | 6 ký tự trong `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (bỏ O/0/I/1), duy nhất trong các phòng `active`/`closing` | Mã phòng gõ tay ở Home (BR-30, Q-056); hết hiệu lực cùng `invite_expires_at` |
| invite_expires_at | timestamp | NO | = expires_at | | BR-05 |
| expires_at | timestamp | NO | created_at + 8h | | BR-04 |
| draw_interval_sec | int | NO | 5 | 3–15 | BR-15 |
| called_numbers | array<int> | NO | [] | phần tử 1–90, không trùng, theo thứ tự rao | Chỉ tick ghi; làm rỗng khi Bắt đầu ván mới (Q-046) |
| current_game_id | string | NO | | → TBL-05 | Ván chưa kết thúc (BR-07) |
| game_count | int | NO | 1 | | seq_no của ván hiện tại |
| ticket_set_no | int | NO | 1 | | Tăng khi tạo lại bộ vé |
| last_event | map | YES | | `{type, text, actor_uid, target_uid, at}` | Thông báo ngắn (SUP-01) |
| created_by | string | NO | | → TBL-01 | |
| created_at | timestamp | NO | now | | |
| updated_at | timestamp | NO | now | | |
| closed_at | timestamp | YES | | | |
| close_reason | string | YES | | enum | |

**Indexes**
| Tên | Cột | Loại | Lý do |
|---|---|---|---|
| — | invite_code | single (tự có) | `joinRoom({inviteCode})` |
| — | join_code | single (tự có) | `joinRoom({roomCode})`; kiểm trùng lúc tạo phòng (Q-056) |
| — | created_at | single | Thống kê |
| — | called_numbers, last_event | tắt index | Giảm chi phí ghi |

**Foreign keys**
| Cột | Tham chiếu | On delete |
|---|---|---|
| host_uid | TBL-01 | Không xóa user ở MVP |
| current_game_id | TBL-05 | Luôn trỏ ván chưa kết thúc |

**Enum / giá trị hợp lệ**
| Cột | Giá trị | Ý nghĩa |
|---|---|---|
| status | `active` / `closing` / `closed` | Hoạt động / chờ ván chạy xong rồi đóng / đã đóng |
| close_reason | `expired` / `host_left` | BIZ-14 hết hạn / host rời phòng hoặc đăng xuất, kể cả giữa ván (Q-052, Q-057) |
| last_event.type | `member_joined`, `member_left`, `member_kicked`, `ticket_set_renewed`, `tickets_reclaimed`, `game_started`, `game_paused`, `game_resumed`, `interval_changed`, `claim_submitted`, `claims_rejected`, `game_finished`, `game_cancelled`, `room_expiring`, `room_closing`, `room_closed` | |

**Rules đọc (cả cây con):** `get(/databases/$(db)/documents/users/$(request.auth.uid)).data.current_room_id == roomId`. Trang `/join/{code}` đọc qua server.

---

## TBL-03 `rooms/{roomId}/tickets/{ticketId}`
**Mô tả:** 16 vé của bộ hiện hành; chỉ chứa nội dung vé. · **ENT:** ENT-07 · **Dùng bởi BIZ:** BIZ-02, BIZ-04, BIZ-05, BIZ-08

| Cột | Kiểu | Null | Default | Ràng buộc | Mô tả / BR |
|---|---|---|---|---|---|
| (doc id) id | string | NO | | `{color}_{side}`, cố định | |
| color | string | NO | | enum 8 màu | BR-08 |
| side | string | NO | | `a` \| `b` | Hai vé cùng màu gộp đủ 1–90 (BR-08) |
| grid | array<int> | NO | | 81 phần tử theo hàng; 0 = trống; mỗi hàng 5 số; cột j trong khoảng của cột | BR-08, ADR-14 |
| set_no | int | NO | | = rooms.ticket_set_no | |
| updated_at | timestamp | NO | now | | |

Người giữ vé **không** lưu ở đây (A1): xem `games/{current}/players.*.ticket_ids`. Tạo lại bộ vé ghi đè `grid`, `set_no` của 16 doc.

**Enum:** color ∈ `red, orange, yellow, green, teal, blue, purple, pink`.

---

## TBL-04 `rooms/{roomId}/messages/{messageId}`
**Mô tả:** Chat trong phòng. · **ENT:** ENT-10 · **Dùng bởi BIZ:** BIZ-12

| Cột | Kiểu | Null | Default | Ràng buộc | Mô tả / BR |
|---|---|---|---|---|---|
| (doc id) id | string | NO | auto-id | PK | |
| sender_uid | string | NO | | → TBL-01 | |
| sender_name | string | NO | | | Chép lúc gửi |
| sender_photo_url | string | YES | | | Chép lúc gửi |
| text | string | NO | | 1–500 ký tự, đã trim | BR-23 |
| created_at | timestamp | NO | now | | Index single, sắp theo thời gian |

---

## TBL-05 `rooms/{roomId}/games/{gameId}`
**Mô tả:** Một ván. · **ENT:** ENT-05, ENT-11 · **Dùng bởi BIZ:** BIZ-06, BIZ-07, BIZ-08, BIZ-13, BIZ-14

| Cột | Kiểu | Null | Default | Ràng buộc | Mô tả / BR |
|---|---|---|---|---|---|
| (doc id) id | string | NO | auto-id | PK | |
| seq_no | int | NO | | ≥ 1 | Index desc cho lịch sử |
| status | string | NO | `waiting` | enum | Vòng đời ENT-05 |
| pause_reason | string | YES | | `host` | BR-16 (host offline không tạm dừng – Q-048) |
| next_call_at | timestamp | YES | | | Thời điểm được phép rao số kế: client host/dự phòng gọi `drawNumber`, server kiểm (ADR-05, Q-051); client hiện đếm ngược |
| ~~claim_window_ends_at~~ | | | | | (đã loại – Q-055: bỏ cửa sổ đồng kinh) |
| claims | array<{uid, display_name, ticket_id, color, result, row, claimed_at}> | NO | [] | `result` ∈ `win` \| `miss` (gợi ý của hệ thống); mỗi `ticket_id` tối đa 1 phần tử | Lượt Kinh đang chờ host duyệt (ENT-11, Q-055). Làm rỗng khi host bác bỏ |
| resume_status | string | YES | | `running` \| `paused` | Trạng thái trước khi có Kinh, để quay về khi host bác bỏ (FLOW-08 A1, A6) |
| winners | array<{uid, display_name, ticket_id, color, row, claimed_at}> | NO | [] | | = các `claims` có `result = win` lúc host xác nhận / ván tự kết thúc (Q-046, Q-055) |
| result | string | YES | | `won` \| `no_winner` \| `cancelled` | BIZ-13 |
| player_count | int | NO | 0 | | Ghi lúc Bắt đầu; thống kê |
| started_at | timestamp | YES | | | |
| ended_at | timestamp | YES | | | |
| confirmed_by | string | YES | | → TBL-01 | BR-28 |
| created_at | timestamp | NO | now | | |

**Enum status:** `waiting` (chờ bắt đầu, lấy/bỏ vé được) · `running` · `paused` · ~~`claim_window`~~ (đã loại – Q-055) · `awaiting_confirm` (**Chờ host duyệt**: có ≥ 1 lượt Kinh, dừng quay, vẫn nhận Kinh – BR-28) · `finished` · `cancelled` (phòng hết hạn khi chờ, hoặc host rời/đăng xuất – Q-057).

---

## TBL-06 `rooms/{roomId}/games/{gameId}/players/{uid}`
**Mô tả:** Người lấy vé ở ván. Tạo khi user lấy vé đầu tiên ở ván `waiting`; bỏ vé chỉ sửa `ticket_ids`. Host Bắt đầu → server xóa player có `ticket_ids` rỗng hoặc đã rời phòng (Q-047). Ván kết thúc → chép sang ván mới player **còn trong phòng và đang online** (RTDB `presence/{roomId}/{uid}.online = true`); người offline không được chép → vé trống (BR-29, Q-058). Không đổi khi ván đang chạy. · **ENT:** ENT-03, ENT-07 · **Dùng bởi BIZ:** BIZ-04, BIZ-05, BIZ-06, BIZ-08, BIZ-13

| Cột | Kiểu | Null | Default | Ràng buộc | Mô tả / BR |
|---|---|---|---|---|---|
| (doc id) uid | string | NO | | PK, → TBL-01 | |
| display_name | string | NO | | | Chép lúc Bắt đầu |
| photo_url | string | YES | | | |
| ticket_ids | array<string> | NO | | 0–2 phần tử (≥ 1 sau khi Bắt đầu); mỗi ticket thuộc tối đa 1 player của ván | BR-09; Kinh chỉ hợp lệ với vé này |
| joined_at | timestamp | NO | now | | Lúc lấy vé đầu tiên |

**Indexes:** `ticket_ids` array-contains (kiểm vé đã có chủ).

Kinh hợp lệ khi: `users.current_room_id = roomId` (chưa out) **và** có doc player **và** ticket ∈ `ticket_ids`.

---

## TBL-07 `stats/{yyyy-mm-dd}`
**Mô tả:** Thống kê ngày do `aggregateDailyStats` ghi. · **ENT:** SUP-09

| Cột | Kiểu | Null | Default | Ràng buộc | Mô tả |
|---|---|---|---|---|---|
| (doc id) date | string | NO | | `yyyy-mm-dd` GMT+7 | |
| new_users, active_users, rooms_created, games_played | int | NO | 0 | | |
| avg_members_per_room | number | NO | 0 | | |
| computed_at | timestamp | NO | now | | |

**Rules đọc:** không ai (xem qua console).

---

## TBL-08 RTDB `presence/{roomId}/{uid}`
**Mô tả:** Trạng thái kết nối. · **ENT:** SUP-04

| Cột | Kiểu | Null | Default | Ràng buộc | Mô tả |
|---|---|---|---|---|---|
| online | bool | NO | | | `true` khi kết nối; `onDisconnect` đặt `false` |
| display_name | string | NO | | | Client ghi; hiển thị danh sách người trong phòng (Q-047) |
| photo_url | string | YES | | | |
| at | number (ms) | NO | ServerValue.TIMESTAMP | | |

**Rules:** chính chủ ghi; được phép khi `presence_access/{roomId}/{uid} = true` (server đặt lúc vào phòng, xóa khi out). Server xóa node khi người đó out/bị kick. Không có trigger (Q-048).
