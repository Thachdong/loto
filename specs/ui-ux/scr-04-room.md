# SCR-04 Phòng chơi

- **Actor:** ACT-03 (player, gồm người chưa có vé), ACT-02 (host)
- **BIZ thể hiện:** BIZ-06, BIZ-07, BIZ-08, BIZ-11, BIZ-14, BIZ-03 (mời) — đây là nơi diễn ra ván lô tô: host điều khiển ván (Bắt đầu/Tạm dừng/Tiếp tục), hệ thống rao số theo nhịp kèm tiếng rao, player dò vé và bấm KINH; đồng thời là nơi host lấy link mời, player rời phòng và cả phòng nhận cảnh báo phòng sắp hết hạn. Mọi sheet (Vé, Chat, Người, Lịch sử, Cài đặt) và overlay kết quả mở trên nền màn này.
- **FLOW:** FLOW-06 (1–5, A1–A5, E1–E3), FLOW-07 (5–8, A1, E2), FLOW-08 (1–4, 7, A1–A4, E1–E3, E5), FLOW-11 (1–5, A2, A3, E1), FLOW-14 (1, 4, 6, A2, A3), FLOW-03 (1–3, A4, A3)
- **Đến từ:** SCR-01, SCR-02, SCR-03, SCR-09 (Đóng), các sheet SCR-05/06/07/08/11 (đóng) · **Đi tới:** SCR-05, SCR-06, SCR-07, SCR-08, SCR-11, SCR-09 (tự mở), SCR-02 (rời / bị kick / phòng đóng)
- **Wireframe:** [drawio](./drawio/scr-04-room.drawio) — 8 trang: *Chờ bắt đầu – host*, *Đang quay – player (Auto, 2 vé)* (minh họa hiệu ứng Auto), *Đang quay – player 2 vé, Tự dò (bố cục chuẩn 2 vé)*, *Tạm dừng – host, chọn vé để Kinh*, *Người xem + Bật tiếng*, *Sheet Mời (host)*, *Bảng 90 số*, *Xác nhận rời phòng*. Chưa export PNG.

## 1. Layout
Theo wireframe mục 5, từ trên xuống (khung 375×812, máy tính cột giữa ≤ 480px):
1. **Header** (56px): tên phòng + phụ đề trạng thái ván; chip đếm ngược hết hạn (khi còn ≤ 15 phút); nút **Mời** (host) và nút **Rời** (mọi người; host rời = đóng phòng – Q-057).
2. **Panel số đã rao** (96px): số vừa rao cỡ lớn, "Số thứ n/90", đếm ngược số kế tiếp, 5 số gần nhất, link "Bảng 90".
3. **Thanh điều khiển host** (chỉ host thấy): Bắt đầu / Tạm dừng / Tiếp tục + dòng gợi ý. Player thấy dòng trạng thái thay thế.
4. **Vùng vé của tôi** (cuộn dọc): 0–2 vé thiết kế giống vé lô tô giấy: khung viền màu vé, dải tiêu đề "✦ VÉ {MÀU} {A/B} ✦"; 9 hàng × 9 cột chia **3 khối 3 hàng**, ngăn bằng dải hoa văn màu vé; ô trống tô **đặc màu vé (đậm)**, ô có số nền trắng, chữ số đen đậm cỡ lớn; ô đã đánh dấu nền tối chữ trắng (cập nhật theo mẫu vé user cung cấp).
5. **Thanh KINH** (56px, cố định ngay trên thanh nút dưới) — chỉ khi ván `running`/`paused`/`awaiting_confirm` và mình có vé tham gia ván (NFR-12, Q-055). Luôn nằm trên mọi sheet.
6. **Thanh nút dưới** (64px): Vé · Chat · Người · Lịch sử · Cài đặt — mở sheet (SCR-05/06/07/08/11) chiếm vùng giữa header và thanh KINH/thanh nút, nên KINH luôn bấm được.
7. **Toast** trên đầu màn (dưới header) khi `rooms.last_event` đổi (SUP-01).

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Tên phòng | header text | `rooms.name` | — |
| 2 | Phụ đề trạng thái + chip hết hạn | text + chip | "Ván {rooms.game_count} · {Chờ bắt đầu / Đang quay / Tạm dừng / Chờ host duyệt KINH}" từ `games/{current_game_id}.status`. Chip "⏱ Còn mm:ss" khi `expires_at − now ≤ 15 phút` (`expiry_warned`); `rooms.status = closing` → chip "Đóng sau ván này" | BR-04 |
| 3 | Nút "Mời" | button phụ | Chỉ host (`rooms.host_uid` = mình) → mở 19 | BR-05 |
| 4 | Nút "Rời" | button phụ | Mọi người. Player → mở 21; host → mở 23 (Q-057) | BR-21 |
| 5 | Số vừa rao | số lớn (76px) | Phần tử cuối `rooms.called_numbers`; chưa có → "–" + "Chưa rao số nào" + "Nhịp quay {draw_interval_sec} giây/số" | BR-15 |
| 6 | Chỉ số + đếm ngược | text | "Số thứ {len}/90"; "Số kế tiếp sau {n} giây" từ `games.next_call_at`; `paused` → "⏸ Host đã tạm dừng"; `awaiting_confirm` → "⏳ Chờ host duyệt KINH" | BR-16 |
| 7 | 5 số gần nhất | chip list | 5 phần tử cuối trước số vừa rao, mới nhất bên trái | BR-20: số đã rao luôn hiển thị |
| 8 | Link "Bảng 90" | link | → 20 (A9) | — |
| 9 | Thanh điều khiển host | button + hint | `waiting`: "▶ Bắt đầu" (A4) + "{x}/16 vé đã có chủ · {member_count} người trong phòng"; khóa + "Cần ít nhất 2 người lấy vé" khi < 2 người giữ vé (Q-059); ẩn nút khi `rooms.status = closing`. `running`: "⏸ Tạm dừng" (A5). `paused` (`pause_reason = host`): "▶ Tiếp tục" (A6). `awaiting_confirm`: ẩn (host duyệt trên SCR-09) | BR-14, BR-16 |
| 10 | Dòng trạng thái của tôi | text | Player `waiting`: "Chờ host bắt đầu · {x} vé đã có chủ"; `paused`: "Host đã tạm dừng ván"; khi đang chơi: "Bạn đang chơi {n} vé · mode {Tự dò/Auto}" | — |
| 11 | Vé của tôi | lưới 9×9 | `tickets/{id}.grid` (81 ô, 0 = trống) với `id` ∈ `games/{current}/players/{me}.ticket_ids`; nhãn "Vé {màu} {A/B}". Ô đã đánh dấu: localStorage `{gameId}:{ticketId}` (Tự dò) hoặc tính từ `called_numbers` (Auto). Chạm ô → A2 (chỉ khi mode Tự dò và ván không `waiting`). Ván `waiting`: mỗi vé có nút nhỏ "Bỏ vé" góc trên phải → `releaseTicket` (vé được giữ từ ván trước – BR-11 – bỏ ngay không cần mở SCR-05; Q-060) | BR-08, BR-20 |
| 12 | Hiệu ứng Auto | highlight | Chỉ mode Auto: số vừa rao có trên vé viền đỏ + rung (`navigator.vibrate`); hàng còn thiếu 1 số viền "chờ" (SUP-10) | BR-20: Tự dò không gợi ý |
| 13 | Trạng thái không có vé | empty card | `waiting`: "Bạn chưa có vé" + nút "Chọn vé" → SCR-05. Ván đang chạy và mình không có vé tham gia: "Bạn đang xem ván này. Lấy vé khi ván kết thúc." (FLOW-03 A3) | BR-10 |
| 14 | Nút KINH | button lớn cố định | Hiện khi ván `running`/`paused`/`awaiting_confirm` **và** mình còn trong phòng với doc player ≥ 1 vé (Q-055: vẫn KINH được trong lúc chờ host duyệt). 1 vé → bấm gửi A3 ngay; 2 vé → mở 15. Sau khi bấm: khóa 1 giây chống bấm đúp. Vé đã có trong `games.claims` → "Đã KINH vé này" (khóa vé đó) | BR-17, BR-28 |
| 15 | Popover chọn vé để Kinh | action sheet | "Kinh vé {màu} {A/B}" cho từng vé của mình (FLOW-08 A4: bấm từng vé) | — |
| 16 | Thanh nút dưới | tab bar | Vé (→ SCR-05), Chat (→ SCR-06, badge số tin chưa đọc), Người (→ SCR-07), Lịch sử (→ SCR-08), Cài đặt (→ SCR-11) | — |
| 17 | Toast thông báo | toast | Text sinh từ `rooms.last_event.type`: "{tên} đã vào phòng", "{tên} đã rời phòng", "{tên} bị mời ra khỏi phòng", "Bộ vé mới đã được tạo", "Host đã thu hồi vé của {tên}", "Ván {n} bắt đầu", "Ván đã tạm dừng", "Ván tiếp tục", "Nhịp quay: {n} giây/số", "{tên} kinh hụt" (`claims_rejected`), "{tên} KINH!" (`claim_submitted`), "Ván {n} kết thúc", "Host đã đóng phòng" (`room_closed`, `close_reason = host_left`), "Phòng sẽ hết hạn sau 15 phút", "Phòng sẽ đóng khi ván này kết thúc". Tự ẩn sau 3 giây; nhiều sự kiện liên tiếp xếp hàng | SUP-01 |
| 18 | Lớp "Chạm để bật tiếng" | overlay | Hiện lần đầu vào phòng trong phiên trình duyệt nếu tiếng rao đang Bật (localStorage) → A1 | NFR-14 |
| 19 | Sheet Mời | bottom sheet | Link `https://{host}/join/{rooms.invite_code}` + nút "Copy link"; **Mã phòng** `rooms.join_code` hiển thị chữ lớn cách quãng (vd `K7M 2QX`) + nút "Copy mã" + gợi ý "Người đã có tài khoản: Trang chủ → Vào phòng → nhập mã"; "Hết hạn lúc HH:mm (cùng lúc phòng đóng) · {member_count}/16 người"; nút "Chia sẻ…" (Web Share API; không hỗ trợ thì ẩn; nội dung chia sẻ gồm link + mã) | BR-05, BR-30: một link + một mã, mở lại luôn ra cái cũ (FLOW-03 A4, Q-056) |
| 20 | Sheet bảng 90 số | bottom sheet | Lưới 1–90 (10 cột), số đã rao tô đậm, số vừa rao viền đỏ; "Số đã rao ({n}/90)"; dòng thứ tự gần nhất | BR-20 |
| 21 | Dialog xác nhận rời (player) | dialog | Ván `waiting`/không có vé tham gia: "Rời phòng?" + vé trả về bộ; vào lại bằng link/mã nếu phòng chưa đầy. Ván `running`/`paused`/`awaiting_confirm` và mình có vé tham gia: **cảnh báo** "⚠ Bạn đang chơi ván {n}. Rời phòng thì vé của bạn bị hủy, không KINH được nữa." Nút "Ở lại" / "Rời phòng" | BR-22, BR-25, Q-057 |
| 23 | Dialog xác nhận rời (host) | dialog | "Rời phòng sẽ **đóng phòng** cho mọi người"; ván đang diễn ra thêm "Ván {n} sẽ bị hủy, không ai thắng." Nút "Ở lại" / "Đóng phòng" | BR-21, Q-057 |
| 22 | Banner mất kết nối | banner | "Mất kết nối – đang kết nối lại…" khi Firestore/RTDB mất kết nối | NFR-07 |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-04.A0 | Tải dữ liệu phòng | realtime — Firestore listener `rooms/{roomId}`, `rooms/{roomId}/games/{current_game_id}`, `games/{current}/players` (collection), `rooms/{roomId}/tickets` (lấy grid vé của mình); RTDB `presence/{roomId}` (đếm người) và ghi `presence/{roomId}/{me} = {online:true, display_name, photo_url, at}` + `onDisconnect → online:false` | Hiện header, panel, vé; listener `users/{me}` theo dõi `current_room_id`; `current_game_id` đổi → chuyển listener sang ván mới; Screen Wake Lock khi `running` (NFR-15) | `users.current_room_id` thành null / đọc phòng bị từ chối → về SCR-02 với lý do (bị kick / hết hạn / không rõ – xem SCR-02 #4); mất mạng → 22, tự kết nối lại |
| SCR-04.A1 | Bật tiếng (lần chạm đầu) (18) | client — tạo `AudioContext`, tải + giải mã `public/audio/manifest.json` theo thứ tự ưu tiên (ADR-08) | Rao tự động khi có số mới (≤ 0,5 giây – NFR-05); câu nối xen giữa; thiếu câu → chỉ hiện số (Q-029) | Tải audio lỗi → toast "Không tải được tiếng rao", vẫn chơi bằng hình |
| SCR-04.A2 | Đánh dấu / bỏ đánh dấu ô (11, mode Tự dò) | client — localStorage key `{gameId}:{ticketId}` = mảng số đã đánh dấu | Ô đổi màu ngay. Cho đánh dấu cả số chưa rao (người chơi tự chịu, hệ thống chỉ kiểm khi KINH) `(Q-050)` | localStorage không khả dụng → giữ trong bộ nhớ trang |
| SCR-04.A3 | Bấm KINH cho một vé (14 / 15) | `createClaim` (`POST /rooms/{roomId}/claims`, body `{ticketId}`) | Server so `tickets.grid` với `called_numbers` (BR-17). Kết quả là **gợi ý** đúng/hụt; lượt được thêm vào `games.claims`, ván chuyển/giữ `awaiting_confirm` (dừng quay), `last_event = claim_submitted` → cả phòng thấy toast "{tên} KINH!" và tự mở SCR-09 dạng thẻ (≤ 1 giây – NFR-03). Host duyệt ở SCR-09 (Q-055) | `NOT_TICKET_HOLDER` (vé không thuộc mình / đã bị hủy do rời – BR-22) → toast "Vé này không tham gia ván"; `TICKET_ALREADY_CLAIMED` → toast "Vé này đã báo KINH, chờ host duyệt"; `CLAIMS_CLOSED` (ván đã kết thúc – BR-28) → toast "Ván đã kết thúc"; lỗi mạng → toast "Chưa gửi được KINH, bấm lại" |
| SCR-04.A4 | Bắt đầu ván (host) (9) | `startGame` (`POST /rooms/{roomId}/games/{gameId}/start`) | Server xóa player không vé, `status = running`, làm rỗng `called_numbers`, hẹn tick; toast "Ván {n} bắt đầu"; SCR-05 khóa lấy/bỏ vé | `NO_TICKETS_HELD` (BR-14) → toast "Cần ít nhất 2 người lấy vé"; `ROOM_CLOSING` (BR-14) → toast "Phòng sắp hết hạn, không bắt đầu ván mới"; `GAME_NOT_WAITING` → bỏ qua (listener sẽ cập nhật); `NOT_ROOM_HOST` → ẩn 9 |
| SCR-04.A5 | Tạm dừng ván (host) (9) | `pauseGame` (`POST /rooms/{roomId}/games/{gameId}/pause`) | `status = paused`, `next_call_at = null` (Q-051)| `GAME_NOT_RUNNING` (vừa có KINH / vừa kết thúc) → bỏ qua, UI theo listener |
| SCR-04.A6 | Tiếp tục ván (host) (9) | `resumeGame` (`POST /rooms/{roomId}/games/{gameId}/resume`) | `status = running`, hẹn tick mới; toast "Ván tiếp tục" | `GAME_NOT_PAUSED` → bỏ qua |
| SCR-04.A7 | Mời: chia sẻ / copy link / copy mã (3 → 19) | client — đọc `rooms.invite_code`, `rooms.join_code` từ listener A0; `navigator.share` / Clipboard API | Mở bảng chia sẻ của máy; hoặc toast "Đã copy link" / "Đã copy mã phòng" (Q-056) | Share bị hủy → không làm gì; Clipboard lỗi → chọn sẵn text trong ô link |
| SCR-04.A8 | Rời phòng (4 → 21 / 23) | `leaveRoom` (`POST /rooms/{roomId}/leave`) | Player: `users.current_room_id = null`, `member_count − 1`; ván `waiting` → xóa player (vé trống), ván đang diễn ra → vé bị hủy tới hết ván (BR-22); cả phòng thấy toast "{tên} đã rời phòng" → SCR-02 với banner "Bạn đã rời phòng". Host: ván hiện tại `cancelled`, phòng `closed` (`close_reason = host_left`) → mọi người về SCR-02 với banner "Host đã đóng phòng" (Q-057) | Lỗi mạng → toast "Không rời được phòng, thử lại" |
| SCR-04.A9 | Xem bảng 90 số (8 → 20) | client (từ `rooms.called_numbers`) | Mở 20 | — |
| SCR-04.A10 | Tự động: báo tới nhịp rao số | `drawNumber` (`POST /rooms/{roomId}/games/{gameId}/draw`, body `{seq}`) | Số đầu tiên do `startGame` rao ngay. Chạy ngầm khi ván `running`: **host** gọi đúng `next_call_at`; **dự phòng** = player của ván (trừ host) xếp theo vé nhỏ nhất họ giữ (Đỏ A → Hồng B), người thứ k gọi ở `next_call_at + 5k s` nếu chưa thấy số mới (Q-052). `drawn:false` = đã có người rao, bỏ qua; `DRAW_TOO_EARLY` → chỉnh `serverTimeOffset` rồi hẹn lại. Giữ màn hình sáng (Wake Lock) để timer không bị hãm (ADR-05, Q-051) | BR-15, NFR-08 |
| SCR-04.A11 | Tự động: báo phòng hết hạn | `expireRoom` (`POST /rooms/{roomId}/expire`) | Đếm ngược từ `expires_at` (cảnh báo khi ≤ 15 phút, không cần API); về 0 hoặc mở app thấy đã quá hạn → gọi. Phòng `closing`: hiện "Phòng đóng khi ván này kết thúc"; `closed` → về SCR-02 (Q-051) | BR-04 |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | Header (tên phòng nếu có trong cache) + skeleton panel và 1 vé; thanh nút dưới hiện ngay |
| Empty | Không có vé: 13. Chưa rao số: 5 hiện "–", 7 trống |
| Error | 22 khi mất kết nối; lỗi thao tác → toast theo từng thao tác |
| Không có quyền | Không còn là thành viên (rời, bị kick, phòng đóng) → SCR-02 kèm banner lý do |
| Ván `waiting` | 9 (host) hoặc 10 (player); không có 14; vé chạm được để mở SCR-05; ô vé không đánh dấu |
| Ván `running` | 6 đếm ngược; 9 "Tạm dừng"; 14 hiện; Wake Lock |
| Ván `paused` | 6 "⏸ Host đã tạm dừng"; 9 "Tiếp tục"; 14 vẫn bấm được (Q-029) |
| Ván `awaiting_confirm` (Chờ host duyệt) | SCR-09 dạng thẻ phía trên, không che vé và 14 (vẫn KINH được – Q-055); 6 "⏳ Chờ host duyệt KINH"; không rao số |
| Ván vừa `finished` | SCR-09 dạng overlay; 14 ẩn |
| Phòng `closing` | Chip 2 "Đóng sau ván này"; 9 ẩn nút Bắt đầu khi ván mới `waiting`; phòng đóng → SCR-02 "Phòng đã hết hạn" |
| Host offline | Không thay đổi gì: ván vẫn chạy (Q-048); SCR-07 hiện host offline. Ván treo ở Chờ host duyệt → player rời bằng 4 (Q-057) |
| Quay lại sau mất kết nối | 22 biến mất; listener tải lại `called_numbers`, ván tiếp tục bình thường; số rao trong lúc mất kết nối **không** phát lại tiếng — player tự dò theo panel 5/7 và bảng 90 số (20). Nếu ván đã kết thúc trong lúc offline → vé đã được trả (BR-29), hiện 13 |

## 5. Ghi chú UX
- **Giữ 1 vé:** ô ≈ 38×32px (ô dọc như vé giấy), chữ 17px đậm; tiêu đề 24px; 3 khối 3 hàng cách nhau dải hoa văn 10px; vé cao ≈ 336px; panel số rao đầy đủ.
- **Giữ 2 vé — bố cục chuẩn (Q-049):** 2 vé xếp dọc, **thấy cùng lúc không cần cuộn** để dò song song:
  - Header gọn 52px; panel số rao rút thành **1 dòng 52px** (số vừa rao 44px + 5 số gần nhất + đếm ngược + "Bảng 90 ›").
  - Mỗi vé: ô 38×28px, chữ 15px, tiêu đề 16px, dải ngăn khối 5px → cao ≈ 282px; 2 vé + khoảng cách 6px ≈ 570px, vừa giữa thanh số (dưới 144px) và thanh KINH (trên 732px) ở màn 375×812.
  - KINH và thanh nút dưới cố định (NFR-12). Ô cao 28px < 44px nhưng rộng 38px; chấp nhận để thấy đủ 2 vé. Màu đậm của ô trống: Đỏ #e2574c, Cam #f08a3c, Vàng #e6b800, Lục #4caf50, Ngọc #1aa39a, Lam #3f7fd1, Tím #8e5cc7, Hồng #e0609e. Hai vé xếp dọc, cuộn trong vùng 4; KINH và thanh nút dưới không cuộn.
- Màu vé (8 màu: Đỏ, Cam, Vàng, Lục, Ngọc, Lam, Tím, Hồng – `red, orange, yellow, green, teal, blue, purple, pink`) là tông nhạt để chữ số đen đủ tương phản.
- Mode dò, bật/tắt tiếng, ô đánh dấu chỉ lưu localStorage (Q-047); đổi máy là mất — chấp nhận.
- Chuyển Auto → Tự dò: giữ các ô đã đánh dấu (FLOW-15 A1): client chép các số đã rao trên vé vào localStorage lúc chuyển `(Q-050)`.
- `(Q-050)` Nút "Rời" đặt ở header. Host có cả "Mời" và "Rời" (icon) — host rời = đóng phòng (Q-057, thay Q-048).
- `(Q-050)` Badge chat chưa đọc tính ở client: so `messages.created_at` với mốc "đã xem chat" lưu localStorage.
- Tiếng chúc mừng phát khi ván chuyển `finished` (FLOW-08 bước 8); tiếng kinh hụt khi `last_event.type = claims_rejected`; tiếng "KINH!" ngắn khi `claim_submitted`.
