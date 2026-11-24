# T-009 · Người trong phòng: xem online/vé, kick, thu hồi vé (SCR-07)

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-07 | M2 | 5 | T-008 | REVIEW |

## 1. Mục tiêu demo
Sau task này: **thành viên mở SCR-04 → bấm "Người" → thấy danh sách người trong phòng (host có nhãn "Host", mình có "(Bạn)", chấm online/offline, chip màu vé đang giữ). Host bấm "Kick" một player → xác nhận → người đó bị đưa về trang chủ với banner "Bạn đã bị mời ra khỏi phòng …", mở lại link mời bị chặn "Bạn không thể vào phòng này"; host bấm "Thu hồi vé" của người offline khi ván chờ → vé đó thành "Trống".**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-07.A0 | Listener RTDB `presence/{roomId}`, Firestore `games/{current}/players`, `rooms/{roomId}` |
| Thao tác | SCR-07.A1 | Kick player (host) |
| Thao tác | SCR-07.A2 | Thu hồi vé người offline (host) |
| API | `kickPlayer` → `kickPlayerAction({roomId, uid})` | tạo mới |
| API | `reclaimPlayerTickets` → `reclaimPlayerTicketsAction({roomId, uid})` | dùng lại từ T-005, chỉ thêm điểm gọi từ SCR-07 |
| Dữ liệu | TBL-02 `blocked_uids`, `member_count`, `last_event` | ghi |
| Dữ liệu | TBL-01 `current_room_id` (người bị kick) | ghi null |
| Dữ liệu | TBL-06 `players` | xóa (ván `waiting`) / giữ (ván đang diễn ra) |
| Dữ liệu | TBL-08 RTDB `presence`, `presence_access` | đọc; server xóa node người bị kick |
| Rule | BR-06 | Bị kick → chặn vào lại |
| Rule | BR-13 | Thu hồi vé chỉ khi người đó offline và ván `waiting` |
| Rule | BR-21 | Chỉ host kick/thu hồi |
| Rule | BR-22 | Kick khi ván chạy: vé khóa tới hết ván |
| Phụ trợ | SUP-04, SUP-01 | Presence; toast "{tên} bị mời ra khỏi phòng", "Host đã thu hồi vé của {tên}" |
| NFR | NFR-02, NFR-09 | Danh sách cập nhật ≤ 1 giây; thao tác host bị từ chối với người không phải host |
| Flow | FLOW-10 bước 1–5, A1, E1; FLOW-04 A1, A2 | |
| Quyết định | Q-048, Q-050 (1a) | Chỉ kick người đã lấy vé; kick lúc offline → câu chung |

**Ngoài phạm vi:** chuyển quyền host (đã bỏ – Q-048); `joinRoom` chặn `BLOCKED_FROM_ROOM` (đã làm ở T-004, task này chỉ kiểm lại); dialog thu hồi trong "Tạo bộ vé mới" (T-005).

## 3. Việc cần làm
### UI
- [x] Sheet SCR-07 mở từ nút "Người": tiêu đề "Người trong phòng · {rooms.member_count}/16" + ✕.
- [x] Hàng 72px: ảnh + chấm xanh/xám theo `presence.online`, tên (`presence.display_name`), nhãn "Host" (`uid = rooms.host_uid`) / "(Bạn)"; trạng thái "Online" hoặc "Offline · {n} phút" (từ `presence.at`); chip màu vé từ `players/{uid}.ticket_ids` hoặc "Chưa lấy vé".
- [x] Sắp xếp: host → mình → online → offline, cùng nhóm theo tên (Q-050). Host offline vẫn hiện "Host · Offline".
- [x] Nguồn danh sách = node trong RTDB `presence/{roomId}`; hàng có player doc nhưng không có node presence (vd người bị kick lúc ván chạy) không hiện `[ASSUMED]`.
- [x] Nút "Kick" (chỉ host thấy): chỉ ở hàng có doc player có vé ở ván hiện tại và không phải host (Q-048, FLOW-10 E1); hiện cả khi ván đang chạy.
- [x] Nút "Thu hồi vé" (chỉ host thấy): hàng offline + có vé + ván `waiting`.
- [x] Dialog kick "Kick {tên}?" + hệ quả (bị đưa ra, không vào lại được; ván đang chạy → vé khóa tới hết ván). Hủy / Kick. Dialog thu hồi "Thu hồi vé của {tên}?" + "{tên} đang offline. Vé {màu} sẽ trả về bộ vé." Hủy / Thu hồi.
- [x] Lỗi → toast: `PLAYER_NOT_FOUND` "Chỉ kick được người đã lấy vé"; `TARGET_ONLINE` "{tên} đang online, không thu hồi được"; `GAME_NOT_WAITING` "Chỉ thu hồi khi ván chờ bắt đầu"; `NOT_ROOM_HOST` → ẩn nút.
- [x] Trạng thái: loading 4 hàng skeleton; chỉ có mình + là host → gợi ý "Bấm Mời để gọi bạn vào phòng" (Q-050); lỗi đọc "Không tải được danh sách" + "Thử lại".
- [x] Client người bị kick: listener `users/{uid}` thấy `current_room_id = null` khi mình không bấm Rời → về SCR-02; banner theo logic SCR-02 (Q-050): `last_event` cuối đã nhận là `member_kicked` với `target_uid` = mình → "Bạn đã bị mời ra khỏi phòng "{tên}"."; không có → "Bạn không còn ở trong phòng." (dùng lại xử lý từ T-006, bổ sung nhánh kick nếu chưa có).
- [x] Toast cả phòng (SCR-04 component 17) cho `member_kicked`, `tickets_reclaimed` — kiểm có trong bảng toast của T-006, thiếu thì bổ sung.

### API / Backend
- [x] `kickPlayerAction({roomId, uid})` theo `kickPlayer`: phiên → Zod → transaction: lazy expiry; người gọi không phải thành viên → `NOT_ROOM_MEMBER`; không phải host → `NOT_ROOM_HOST`; `uid` = host → `CANNOT_TARGET_SELF`; đích không có doc player ở ván hiện tại hoặc `users/{uid}.current_room_id ≠ roomId` → `PLAYER_NOT_FOUND`.
- [x] Ghi: `rooms.blocked_uids` arrayUnion `uid`, `member_count − 1`, `last_event = {type: member_kicked, actor_uid, target_uid, text, at}`; `users/{uid}.current_room_id = null`; ván `waiting` → xóa doc player; ván `running`/`paused`/`claim_window`/`awaiting_confirm` → giữ doc player (BR-22).
- [x] Sau commit: xóa RTDB `presence/{roomId}/{uid}` và `presence_access/{roomId}/{uid}` bằng Admin SDK (lỗi RTDB → log, không rollback `[ASSUMED]`).
- [x] Trả `KickResult {uid, ticketsFreedNow, gameStatus}`.
- [x] Kiểm lại nhánh BR-22 sẵn có: người bị kick khi ván chạy bấm KINH → `createClaim` trả `NOT_TICKET_HOLDER` (T-006); vé đó không được chép sang ván mới (T-007 chỉ chép player còn trong phòng).
- [x] `reclaimPlayerTicketsAction`: không đổi logic (T-005); thêm test cho đường gọi từ SCR-07 nếu T-005 chưa phủ `TARGET_ONLINE`, `CANNOT_TARGET_SELF`.

### Data
- [x] `firestore.rules`: không đổi (client vẫn cấm ghi `rooms`, `players`); thêm test người bị kick mất quyền đọc phòng.
- [x] `database.rules.json`: người bị kick (không còn `presence_access`) không ghi được `presence/{roomId}/{uid}`; thành viên đọc được `presence/{roomId}` `[ASSUMED]` (đọc cho mọi người có `presence_access/{roomId}/{auth.uid}`).
- [x] Seed `room-members`: host An + Bình (online, giữ Đỏ A) + Chi (offline, giữ Xanh B) + Dũng (online, chưa lấy vé), ván `waiting`.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | Seed `room-members`, Chi offline | Bình mở sheet "Người" | Tiêu đề "Người trong phòng · 4/16"; thứ tự An (Host) → Bình (Bạn) → Dũng → Chi; Bình/Dũng chấm xanh "Online", Chi chấm xám "Offline · n phút"; chip vé Bình "Đỏ A", Chi "Xanh B", Dũng "Chưa lấy vé"; Bình không thấy nút Kick/Thu hồi | SCR-07.A0, SUP-04, BR-21 |
| AC-2 | Sheet Người đang mở ở An | Dũng lấy vé / Chi mở lại app (online) / có người mới vào phòng | Hàng tương ứng cập nhật ≤ 1 giây, không cần tải lại | NFR-02, SUP-04 |
| AC-3 | Ván `waiting`, An là host | An bấm "Kick" ở hàng Bình → "Kick" | Hàng Bình biến mất; cả phòng thấy toast "Bình bị mời ra khỏi phòng"; vé Đỏ A thành "Trống" ở SCR-05; Bình (đang online) về SCR-02 ≤ 1 giây với banner "Bạn đã bị mời ra khỏi phòng "{tên}"." (hoặc "Bạn không còn ở trong phòng." nếu client chưa kịp nhận `last_event` – xem Ghi chú); Emulator: `blocked_uids` chứa uid Bình, `users/Bình.current_room_id = null`, không còn doc player, `member_count` giảm 1, RTDB không còn `presence/{roomId}/Bình` | FLOW-10 bước 1–5, BR-06, BR-22 |
| AC-4 | Ván đang `running`, Bình giữ Đỏ A | An kick Bình | `KickResult.ticketsFreedNow = false`; doc player Bình còn; vé Đỏ A không ai lấy được tới hết ván; sau khi ván kết thúc và ván mới `waiting`, Đỏ A là "Trống" | BR-22, FLOW-10 bước 4 |
| AC-5 | Bình đã bị kick | Bình mở lại link mời còn hạn và bấm "Vào phòng" | Thấy "Bạn không thể vào phòng này" (`BLOCKED_FROM_ROOM`), không vào được | BR-06 |
| AC-6 | Bình đóng app (offline) | An kick Bình; Bình mở lại app | Bình vào SCR-02 với banner "Bạn không còn ở trong phòng." | FLOW-10 A1, Q-050 (1a) |
| AC-7 | Sheet Người ở An | — | Không có nút Kick ở hàng An (host) và hàng Dũng (chưa lấy vé); gọi `kickPlayerAction` với uid An → `CANNOT_TARGET_SELF`, với uid Dũng → `PLAYER_NOT_FOUND` | FLOW-10 E1, Q-048 |
| AC-8 | Bình (không phải host) | Gọi `kickPlayerAction` / `reclaimPlayerTicketsAction` | `NOT_ROOM_HOST`, dữ liệu không đổi | NFR-09, BR-21 |
| AC-9 | Ván `waiting`, Chi offline giữ Xanh B | An bấm "Thu hồi vé" ở hàng Chi → "Thu hồi" | Toast cả phòng "Host đã thu hồi vé của Chi"; vé Xanh B "Trống"; Chi vẫn trong danh sách (Offline · Chưa lấy vé), `member_count` không đổi | BR-13, FLOW-04 A1/A2, SUP-04 |
| AC-10 | Chi vừa online lại nhưng UI host chưa cập nhật | An thu hồi vé Chi | Toast "Chi đang online, không thu hồi được"; vé vẫn của Chi | BR-13 |
| AC-11 | Ván `running` | An mở sheet Người | Không có nút "Thu hồi vé" ở hàng nào; nút "Kick" vẫn hiện với player có vé; gọi reclaim → `GAME_NOT_WAITING` | BR-13, SCR-07 trạng thái "Ván đang chạy" |
| AC-12 | Phòng chỉ có host | An mở sheet Người | Một hàng "An · Host · (Bạn)" + gợi ý "Bấm Mời để gọi bạn vào phòng" | SCR-07 Empty |
| AC-13 | Bình bị kick | Bình đọc `rooms/{roomId}` hoặc ghi `presence/{roomId}/Bình` bằng client SDK | Bị Security Rules / RTDB rules từ chối | NFR-09, BR-06 |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| `kickPlayerAction` ván `waiting`: blocked_uids, current_room_id null, xóa player, member_count − 1, last_event member_kicked, xóa 2 node RTDB, `ticketsFreedNow = true` | AC-3 |
| `kickPlayerAction` ván `running`: giữ player, `ticketsFreedNow = false`; sau đó `createClaim` của người bị kick → `NOT_TICKET_HOLDER` | AC-4 |
| `joinRoomAction` của người bị kick → `BLOCKED_FROM_ROOM` (hồi quy T-004) | AC-5 |
| `kickPlayerAction`: tự kick → `CANNOT_TARGET_SELF`; người chưa lấy vé → `PLAYER_NOT_FOUND`; người gọi không phải host → `NOT_ROOM_HOST`; người gọi ngoài phòng → `NOT_ROOM_MEMBER` | AC-7, AC-8 |
| `reclaimPlayerTicketsAction`: offline + waiting → xóa player, `releasedTicketIds`; online → `TARGET_ONLINE`; running → `GAME_NOT_WAITING`; không phải host → `NOT_ROOM_HOST` | AC-9, AC-10, AC-11, AC-8 |
| Rules: người bị kick không đọc được `rooms/{roomId}` và cây con; RTDB: không ghi được presence khi không còn `presence_access` | AC-13 |
| Hàm thuần `sortMembers(rows, hostUid, myUid)` đúng thứ tự host → mình → online → offline → theo tên | AC-1 |

### Kịch bản test trên Chrome (AI chạy)
Môi trường: localhost + Emulator, viewport 375×812. **P1 = Host An**, **P2 = Bình**, **P3 = Chi**, **P4 = Dũng** (4 profile Chrome).

| Bước | Profile | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|---|
| 1 | — | Seed `room-members`; mở `/room` ở P1, P2, P4; P3 mở rồi đóng cửa sổ | 3 cửa sổ đang ở phòng | — |
| 2 | P2 | Bấm "Người" | "Người trong phòng · 4/16"; thứ tự An (Host), Bình (Bạn), Dũng, Chi; Chi "Offline · n phút", chip vé đúng; không có nút Kick/Thu hồi | AC-1 |
| 3 | P1 | Mở "Người" | Hàng Bình có "Kick"; Chi có "Kick" + "Thu hồi vé"; An và Dũng không có nút | AC-1, AC-7 |
| 4 | P4 | Mở sheet Vé, lấy vé Vàng A | ≤ 1 giây hàng Dũng ở P1 hiện chip "Vàng A" và nút "Kick" | AC-2 |
| 5 | P1 | Bấm "Thu hồi vé" ở Chi → dialog → "Thu hồi" | Toast "Host đã thu hồi vé của Chi" ở P1, P2, P4; hàng Chi "Chưa lấy vé"; sheet Vé thấy Xanh B "Trống" | AC-9 |
| 6 | P3 | Mở lại `/room` (Chi online); seed lại để Chi giữ Xanh B; ở P1 không tải lại, bấm "Thu hồi vé" nếu nút còn | Toast "Chi đang online, không thu hồi được" hoặc nút đã biến mất khi Chi online | AC-10 |
| 7 | P1 | Bấm "Kick" ở Bình → "Kick" | Toast "Bình bị mời ra khỏi phòng" ở P1, P3, P4; hàng Bình biến mất; tiêu đề giảm 1 | AC-3 |
| 8 | P2 | Quan sát | Tự về trang chủ, banner "Bạn đã bị mời ra khỏi phòng "…"." | AC-3 |
| 9 | Emulator UI | Xem `rooms/{id}`, `users/{Bình}`, RTDB `presence` | `blocked_uids` có Bình; `current_room_id = null`; không còn node presence của Bình | AC-3 |
| 10 | P2 | Mở link mời (copy từ P1) → "Vào phòng" | "Bạn không thể vào phòng này" | AC-5 |
| 11 | P1 | Host bấm "Bắt đầu"; mở "Người" | Không có "Thu hồi vé"; "Kick" vẫn hiện ở Dũng | AC-11 |
| 12 | P1 | Kick Dũng khi ván đang chạy | Dũng về trang chủ; sheet Vé ở P1 vẫn thấy Vàng A thuộc ván (khóa); sau khi ván kết thúc và host xác nhận, Vàng A "Trống" ở ván mới | AC-4 |
| 13 | P4 | Seed lại; đóng cửa sổ P4 (Dũng offline), P1 kick Dũng; mở lại P4 `/` | SCR-02 banner "Bạn không còn ở trong phòng." | AC-6 |
| 14 | P1 | Seed `room-basic` chỉ có host; mở "Người" | 1 hàng "An · Host · (Bạn)" + "Bấm Mời để gọi bạn vào phòng" | AC-12 |

AC-8, AC-13 phủ bằng test integration/rules.

### Dữ liệu seed / tiền điều kiện
- Auth Emulator: An, Bình, Chi, Dũng.
- Seed `room-members` (mục Data); seed `room-basic` (T-008).

## 6. Definition of Done
- [x] DoD chung (xem `backlog.md` mục 1)
- [x] Test deny: người không phải host kick/thu hồi; người bị kick đọc phòng / ghi presence
- [x] Hồi quy `joinRoom` (BR-06), `createClaim` (BR-22) và `reclaimPlayerTickets` (T-005) pass

## 7. Ghi chú
- `[ASSUMED]` Danh sách lấy từ node RTDB presence; người còn doc player nhưng không còn node (bị kick khi ván chạy) không hiện.
- `[ASSUMED]` Xóa node RTDB sau khi commit transaction Firestore; lỗi RTDB chỉ log (presence không quyết định quyền).
- `[ASSUMED]` RTDB rules: thành viên có `presence_access/{roomId}/{auth.uid}` đọc được cả `presence/{roomId}`.
- Banner "Bạn đã bị mời ra khỏi phòng" chỉ hiện khi client kịp nhận `last_event` trước khi mất quyền đọc; nếu không, hiện câu chung (Q-050 1a) — AC-3 chấp nhận cả hai nếu race xảy ra `[ASSUMED]`.
- Point 5 khớp checklist.

> QC: chạy test case tay theo [T-009-room-members.md](../testcases/T-009-room-members.md).
