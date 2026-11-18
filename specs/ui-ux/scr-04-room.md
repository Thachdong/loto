# SCR-04 Phòng chơi

- **Actor:** ACT-03 (player, gồm người chưa có vé), ACT-02 (host)
- **BIZ thể hiện:** BIZ-06, BIZ-07, BIZ-08, BIZ-11, BIZ-14, BIZ-03 (mời) — đây là nơi diễn ra ván lô tô: host điều khiển ván (Bắt đầu/Tạm dừng/Tiếp tục), hệ thống rao số theo nhịp kèm tiếng rao, player dò vé và bấm KINH; đồng thời là nơi host lấy link mời, player rời phòng và cả phòng nhận cảnh báo phòng sắp hết hạn. Mọi sheet (Vé, Chat, Người, Lịch sử, Cài đặt) và overlay kết quả mở trên nền màn này.
- **FLOW:** FLOW-06 (1–5, A1–A5, E1–E3), FLOW-07 (5–8, A1, E2), FLOW-08 (1–4, A1, A3, A4, E1–E4), FLOW-11 (1–5, E1), FLOW-14 (1, 4, 6, A2), FLOW-03 (1–3, A4, A3)
- **Đến từ:** SCR-01, SCR-02, SCR-03, SCR-09 (Đóng), các sheet SCR-05/06/07/08/11 (đóng) · **Đi tới:** SCR-05, SCR-06, SCR-07, SCR-08, SCR-11, SCR-09 (tự mở), SCR-02 (rời / bị kick / phòng đóng)
- **Wireframe:** [drawio](./drawio/scr-04-room.drawio) — 8 trang: *Chờ bắt đầu – host*, *Đang quay – player (Auto, 2 vé)* (minh họa hiệu ứng Auto), *Đang quay – player 2 vé, Tự dò (bố cục chuẩn 2 vé)*, *Tạm dừng – host, chọn vé để Kinh*, *Người xem + Bật tiếng*, *Sheet Mời (host)*, *Bảng 90 số*, *Xác nhận rời phòng*. Chưa export PNG.

## 1. Layout
Theo wireframe mục 5, từ trên xuống (khung 375×812, máy tính cột giữa ≤ 480px):
1. **Header** (56px): tên phòng + phụ đề trạng thái ván; chip đếm ngược hết hạn (khi còn ≤ 15 phút); nút **Mời** (host) hoặc **Rời** (player không phải host).
2. **Panel số đã rao** (96px): số vừa rao cỡ lớn, "Số thứ n/90", đếm ngược số kế tiếp, 5 số gần nhất, link "Bảng 90".
3. **Thanh điều khiển host** (chỉ host thấy): Bắt đầu / Tạm dừng / Tiếp tục + dòng gợi ý. Player thấy dòng trạng thái thay thế.
4. **Vùng vé của tôi** (cuộn dọc): 0–2 vé thiết kế giống vé lô tô giấy: khung viền màu vé, dải tiêu đề "✦ VÉ {MÀU} {A/B} ✦"; 9 hàng × 9 cột chia **3 khối 3 hàng**, ngăn bằng dải hoa văn màu vé; ô trống tô **đặc màu vé (đậm)**, ô có số nền trắng, chữ số đen đậm cỡ lớn; ô đã đánh dấu nền tối chữ trắng (cập nhật theo mẫu vé user cung cấp).
5. **Thanh KINH** (56px, cố định ngay trên thanh nút dưới) — chỉ khi ván `running`/`paused`/`claim_window` và mình có vé tham gia ván (NFR-12). Luôn nằm trên mọi sheet.
6. **Thanh nút dưới** (64px): Vé · Chat · Người · Lịch sử · Cài đặt — mở sheet (SCR-05/06/07/08/11) chiếm vùng giữa header và thanh KINH/thanh nút, nên KINH luôn bấm được.
7. **Toast** trên đầu màn (dưới header) khi `rooms.last_event` đổi (SUP-01).

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Tên phòng | header text | `rooms.name` | — |
| 2 | Phụ đề trạng thái + chip hết hạn | text + chip | "Ván {rooms.game_count} · {Chờ bắt đầu / Đang quay / Tạm dừng / Chờ đồng kinh / Chờ host xác nhận}" từ `games/{current_game_id}.status`. Chip "⏱ Còn mm:ss" khi `expires_at − now ≤ 15 phút` (`expiry_warned`); `rooms.status = closing` → chip "Đóng sau ván này" | BR-04 |
| 3 | Nút "Mời" | button phụ | Chỉ host (`rooms.host_uid` = mình) → mở 19 | BR-05 |
| 4 | Nút "Rời" | button phụ | Chỉ người không phải host → mở 21 | BR-21: host không có nút rời |
| 5 | Số vừa rao | số lớn (76px) | Phần tử cuối `rooms.called_numbers`; chưa có → "–" + "Chưa rao số nào" + "Nhịp quay {draw_interval_sec} giây/số" | BR-15 |
| 6 | Chỉ số + đếm ngược | text | "Số thứ {len}/90"; "Số kế tiếp sau {n} giây" từ `games.next_call_at`; `paused` → "⏸ Host đã tạm dừng"; `claim_window`/`awaiting_confirm` → "Đang kiểm tra KINH" | BR-16 |
| 7 | 5 số gần nhất | chip list | 5 phần tử cuối trước số vừa rao, mới nhất bên trái | BR-20: số đã rao luôn hiển thị |
| 8 | Link "Bảng 90" | link | → 20 (A9) | — |
| 9 | Thanh điều khiển host | button + hint | `waiting`: "▶ Bắt đầu" (A4) + "{x}/16 vé đã có chủ · {member_count} người trong phòng"; khóa + "Cần ít nhất 1 người lấy vé" khi 0 vé có chủ; ẩn nút khi `rooms.status = closing`. `running`: "⏸ Tạm dừng" (A5). `paused` (`pause_reason = host`): "▶ Tiếp tục" (A6). `claim_window`/`awaiting_confirm`: ẩn | BR-14, BR-16 |
| 10 | Dòng trạng thái của tôi | text | Player `waiting`: "Chờ host bắt đầu · {x} vé đã có chủ"; `paused`: "Host đã tạm dừng ván"; khi đang chơi: "Bạn đang chơi {n} vé · mode {Tự dò/Auto}" | — |
| 11 | Vé của tôi | lưới 9×9 | `tickets/{id}.grid` (81 ô, 0 = trống) với `id` ∈ `games/{current}/players/{me}.ticket_ids`; nhãn "Vé {màu} {A/B}". Ô đã đánh dấu: localStorage `{gameId}:{ticketId}` (Tự dò) hoặc tính từ `called_numbers` (Auto). Chạm ô → A2 (chỉ khi mode Tự dò và ván không `waiting`) | BR-08, BR-20 |
| 12 | Hiệu ứng Auto | highlight | Chỉ mode Auto: số vừa rao có trên vé viền đỏ + rung (`navigator.vibrate`); hàng còn thiếu 1 số viền "chờ" (SUP-10) | BR-20: Tự dò không gợi ý |
| 13 | Trạng thái không có vé | empty card | `waiting`: "Bạn chưa có vé" + nút "Chọn vé" → SCR-05. Ván đang chạy và mình không có vé tham gia: "Bạn đang xem ván này. Lấy vé khi ván kết thúc." (FLOW-03 A3) | BR-10 |
| 14 | Nút KINH | button lớn cố định | Hiện khi ván `running`/`paused`/`claim_window` **và** mình có doc player với ≥ 1 vé. 1 vé → bấm gửi A3 ngay; 2 vé → mở 15. Sau khi bấm: khóa 1 giây chống bấm đúp. `awaiting_confirm` → khóa "KINH (đã đóng)" | BR-17, BR-28 |
| 15 | Popover chọn vé để Kinh | action sheet | "Kinh vé {màu} {A/B}" cho từng vé của mình (FLOW-08 A4: bấm từng vé) | — |
| 16 | Thanh nút dưới | tab bar | Vé (→ SCR-05), Chat (→ SCR-06, badge số tin chưa đọc), Người (→ SCR-07), Lịch sử (→ SCR-08), Cài đặt (→ SCR-11) | — |
| 17 | Toast thông báo | toast | Text sinh từ `rooms.last_event.type`: "{tên} đã vào phòng", "{tên} đã rời phòng", "{tên} bị mời ra khỏi phòng", "Bộ vé mới đã được tạo", "Host đã thu hồi vé của {tên}", "Ván {n} bắt đầu", "Ván đã tạm dừng", "Ván tiếp tục", "Nhịp quay: {n} giây/số", "{tên} kinh hụt", "{tên} KINH!", "Ván {n} kết thúc", "Phòng sẽ hết hạn sau 15 phút", "Phòng sẽ đóng khi ván này kết thúc". Tự ẩn sau 3 giây; nhiều sự kiện liên tiếp xếp hàng | SUP-01 |
| 18 | Lớp "Chạm để bật tiếng" | overlay | Hiện lần đầu vào phòng trong phiên trình duyệt nếu tiếng rao đang Bật (localStorage) → A1 | NFR-14 |
| 19 | Sheet Mời | bottom sheet | Link `https://{host}/join/{rooms.invite_code}`, "Link hết hạn lúc HH:mm (cùng lúc phòng đóng) · {member_count}/16 người", nút "Chia sẻ…" (Web Share API; không hỗ trợ thì ẩn), "Copy link" | BR-05: một link duy nhất, mở lại luôn ra link cũ (FLOW-03 A4) |
| 20 | Sheet bảng 90 số | bottom sheet | Lưới 1–90 (10 cột), số đã rao tô đậm, số vừa rao viền đỏ; "Số đã rao ({n}/90)"; dòng thứ tự gần nhất | BR-20 |
| 21 | Dialog xác nhận rời | dialog | "Rời phòng?" + hệ quả: vé trả về bộ; ván đang chạy thì vé khóa tới hết ván và không Kinh được; vào lại bằng link nếu phòng chưa đầy. Nút "Ở lại" / "Rời phòng" | BR-22, BR-25 |
| 22 | Banner mất kết nối | banner | "Mất kết nối – đang kết nối lại…" khi Firestore/RTDB mất kết nối | NFR-07 |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-04.A0 | Tải dữ liệu phòng | realtime — Firestore listener `rooms/{roomId}`, `rooms/{roomId}/games/{current_game_id}`, `games/{current}/players` (collection), `rooms/{roomId}/tickets` (lấy grid vé của mình); RTDB `presence/{roomId}` (đếm người) và ghi `presence/{roomId}/{me} = {online:true, display_name, photo_url, at}` + `onDisconnect → online:false` | Hiện header, panel, vé; listener `users/{me}` theo dõi `current_room_id`; `current_game_id` đổi → chuyển listener sang ván mới; Screen Wake Lock khi `running` (NFR-15) | `users.current_room_id` thành null / đọc phòng bị từ chối → về SCR-02 với lý do (bị kick / hết hạn / không rõ – xem SCR-02 #4); mất mạng → 22, tự kết nối lại |
| SCR-04.A1 | Bật tiếng (lần chạm đầu) (18) | client — tạo `AudioContext`, tải + giải mã `public/audio/manifest.json` theo thứ tự ưu tiên (ADR-08) | Rao tự động khi có số mới (≤ 0,5 giây – NFR-05); câu nối xen giữa; thiếu câu → chỉ hiện số (Q-029) | Tải audio lỗi → toast "Không tải được tiếng rao", vẫn chơi bằng hình |
| SCR-04.A2 | Đánh dấu / bỏ đánh dấu ô (11, mode Tự dò) | client — localStorage key `{gameId}:{ticketId}` = mảng số đã đánh dấu | Ô đổi màu ngay. Cho đánh dấu cả số chưa rao (người chơi tự chịu, hệ thống chỉ kiểm khi KINH) `(Q-050)` | localStorage không khả dụng → giữ trong bộ nhớ trang |
| SCR-04.A3 | Bấm KINH cho một vé (14 / 15) | `createClaim` (`POST /rooms/{roomId}/claims`, body `{ticketId}`) | Server so `tickets.grid` với `called_numbers` (BR-17). Hụt → `last_event = claim_miss`, cả phòng thấy toast "{tên} kinh hụt" + tiếng kinh hụt, ván quay tiếp (hoặc giữ tạm dừng nếu host đang tạm dừng – FLOW-08 A1). Đúng → `games.winners`, `status = claim_window` → mọi người tự mở SCR-09 (≤ 1 giây – NFR-03) | `NOT_TICKET_HOLDER` (vé không thuộc mình / người đã rời – BR-22) → toast "Vé này không tham gia ván"; `CLAIMS_CLOSED` (đang `awaiting_confirm`/ván đã kết thúc – BR-28) → toast "Đã hết lượt báo KINH"; lỗi mạng → toast "Chưa gửi được KINH, bấm lại" |
| SCR-04.A4 | Bắt đầu ván (host) (9) | `startGame` (`POST /rooms/{roomId}/games/{gameId}/start`) | Server xóa player không vé, `status = running`, làm rỗng `called_numbers`, hẹn tick; toast "Ván {n} bắt đầu"; SCR-05 khóa lấy/bỏ vé | `NO_TICKETS_HELD` (BR-14) → toast "Cần ít nhất 1 người lấy vé"; `ROOM_CLOSING` (BR-14) → toast "Phòng sắp hết hạn, không bắt đầu ván mới"; `GAME_NOT_WAITING` → bỏ qua (listener sẽ cập nhật); `NOT_ROOM_HOST` → ẩn 9 |
| SCR-04.A5 | Tạm dừng ván (host) (9) | `pauseGame` (`POST /rooms/{roomId}/games/{gameId}/pause`) | `status = paused`, `next_call_at = null` (Q-051)| `GAME_NOT_RUNNING` (vừa có KINH / vừa kết thúc) → bỏ qua, UI theo listener |
| SCR-04.A6 | Tiếp tục ván (host) (9) | `resumeGame` (`POST /rooms/{roomId}/games/{gameId}/resume`) | `status = running`, hẹn tick mới; toast "Ván tiếp tục" | `GAME_NOT_PAUSED` → bỏ qua |
| SCR-04.A7 | Mời: chia sẻ / copy link (3 → 19) | client — đọc `rooms.invite_code` từ listener A0; `navigator.share` / Clipboard API | Mở bảng chia sẻ của máy; hoặc toast "Đã copy link" | Share bị hủy → không làm gì; Clipboard lỗi → chọn sẵn text trong ô link |
| SCR-04.A8 | Rời phòng (không phải host) (4 → 21) | `leaveRoom` (`POST /rooms/{roomId}/leave`) | `users.current_room_id = null`, `member_count − 1`, xóa player nếu ván `waiting`; cả phòng thấy toast "{tên} đã rời phòng" → SCR-02 với banner "Bạn đã rời phòng" | `HOST_CANNOT_LEAVE` (BR-21) → không xảy ra vì host không có nút; lỗi mạng → toast "Không rời được phòng, thử lại" — Ván đang diễn ra: nút khóa (Q-052). |
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
| Ván `claim_window` | SCR-09 dạng thẻ phía trên, không che vé và 14 (vẫn KINH được – BR-18) |
| Ván `awaiting_confirm` / vừa `finished` | SCR-09 dạng overlay; 14 khóa |
| Phòng `closing` | Chip 2 "Đóng sau ván này"; 9 ẩn nút Bắt đầu khi ván mới `waiting`; phòng đóng → SCR-02 "Phòng đã hết hạn" |
| Host offline | Không thay đổi gì: ván vẫn chạy (Q-048); SCR-07 hiện host offline |

## 5. Ghi chú UX
- **Giữ 1 vé:** ô ≈ 38×32px (ô dọc như vé giấy), chữ 17px đậm; tiêu đề 24px; 3 khối 3 hàng cách nhau dải hoa văn 10px; vé cao ≈ 336px; panel số rao đầy đủ.
- **Giữ 2 vé — bố cục chuẩn (Q-049):** 2 vé xếp dọc, **thấy cùng lúc không cần cuộn** để dò song song:
  - Header gọn 52px; panel số rao rút thành **1 dòng 52px** (số vừa rao 44px + 5 số gần nhất + đếm ngược + "Bảng 90 ›").
  - Mỗi vé: ô 38×28px, chữ 15px, tiêu đề 16px, dải ngăn khối 5px → cao ≈ 282px; 2 vé + khoảng cách 6px ≈ 570px, vừa giữa thanh số (dưới 144px) và thanh KINH (trên 732px) ở màn 375×812.
  - KINH và thanh nút dưới cố định (NFR-12). Ô cao 28px < 44px nhưng rộng 38px; chấp nhận để thấy đủ 2 vé. Màu đậm của ô trống: Đỏ #e2574c, Cam #f08a3c, Vàng #e6b800, Lục #4caf50, Ngọc #1aa39a, Lam #3f7fd1, Tím #8e5cc7, Hồng #e0609e. Hai vé xếp dọc, cuộn trong vùng 4; KINH và thanh nút dưới không cuộn.
- Màu vé (8 màu: Đỏ, Cam, Vàng, Lục, Ngọc, Lam, Tím, Hồng – `red, orange, yellow, green, teal, blue, purple, pink`) là tông nhạt để chữ số đen đủ tương phản.
- Mode dò, bật/tắt tiếng, ô đánh dấu chỉ lưu localStorage (Q-047); đổi máy là mất — chấp nhận.
- Chuyển Auto → Tự dò: giữ các ô đã đánh dấu (FLOW-15 A1): client chép các số đã rao trên vé vào localStorage lúc chuyển `(Q-050)`.
- `(Q-050)` Nút "Rời" đặt ở header (vị trí nút Mời của host) vì wireframe mục 5 không nêu chỗ; host không có nút này (Q-048).
- `(Q-050)` Badge chat chưa đọc tính ở client: so `messages.created_at` với mốc "đã xem chat" lưu localStorage.
- Tiếng chúc mừng phát khi ván chuyển `finished` (FLOW-08 bước 8); tiếng kinh hụt khi `last_event.type = claim_miss`.
