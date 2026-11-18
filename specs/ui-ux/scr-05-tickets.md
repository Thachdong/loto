# SCR-05 Chọn vé (sheet)

- **Actor:** ACT-03 (player, gồm host), ACT-02 (host – tạo bộ vé mới)
- **BIZ thể hiện:** BIZ-05, BIZ-04 — trước mỗi ván, mỗi người cần thấy toàn bộ 16 vé (8 màu × 2), ai đang giữ vé nào, để lấy tối đa 2 vé hoặc bỏ vé (BR-09, BR-10); host cần đổi sang bộ vé mới khi không còn ai giữ vé (BR-12) và xử lý người offline đang giữ vé (BR-13).
- **FLOW:** FLOW-05 (1–5, A1–A3, E1–E3), FLOW-04 (1–5, A1, E1, E2)
- **Đến từ:** SCR-04 (nút "Vé" hoặc nút "Chọn vé" ở trạng thái không có vé) · **Đi tới:** SCR-04 (đóng sheet)
- **Wireframe:** [drawio](./drawio/scr-05-tickets.drawio) — 4 trang: *Danh sách vé – ván chờ*, *Xem trước vé + Lấy vé*, *Host – tạo bộ vé mới bị chặn*, *Ván đang chạy – khóa*. Chưa export PNG.

## 1. Layout
Sheet trượt từ dưới lên trên nền SCR-04, chiếm vùng từ dưới header tới trên thanh nút dưới (thanh KINH vẫn hiện nếu ván đang chạy). Tiêu đề "Chọn vé" + dòng đếm → (host) nút "Tạo bộ vé mới" → banner khóa (khi ván không `waiting`) → lưới 16 thẻ vé 4 cột × 4 hàng, mỗi hàng 2 cặp màu (A, B cạnh nhau) → chạm thẻ mở màn xem trước (trong sheet, có nút ‹ quay lại) với lưới 9×9 đầy đủ và nút hành động.

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Tiêu đề + đếm | header | "Chọn vé" · "Bạn giữ {k}/2 vé · {x}/16 vé đã có chủ" (từ `games/{current}/players`) | BR-09 |
| 2 | Banner khóa | banner | "🔒 Ván đang chạy — chỉ lấy/bỏ vé khi ván chờ bắt đầu." khi `games.status ≠ waiting` | BR-10 |
| 3 | Thẻ vé (×16) | card grid | Màu (`tickets.color`), cạnh A/B (`side`), lưới thu nhỏ; người giữ = player có `ticket_ids ∋ ticketId` (ảnh + `display_name`), không có → "Trống"; vé của tôi viền đậm + nhãn "Bạn". Ván đang chạy, người giữ không còn trong `presence/{roomId}` → "Khóa tới hết ván" `(Q-050)` cách nhận biết người đã rời | BR-08, BR-22 |
| 4 | Xem trước vé | lưới 9×9 | Cùng kiểu vé giấy với SCR-04 (khung + tiêu đề màu vé, 3 khối 3 hàng, ô trống đặc màu vé đậm, ô số nền trắng chữ đen 17px, ô 38×32px). `tickets/{id}.grid` đầy đủ; dòng phụ "Trống · cặp với vé {màu} {cạnh khác} ({người giữ})" | BR-08 |
| 5 | Nút "Lấy vé này" | button chính | Vé trống + ván `waiting` + mình giữ < 2 → A1. Biến thể khóa: "Tối đa 2 vé" (đã giữ 2), "Đã có người lấy" (có chủ), "Ván đang chạy" | BR-09, BR-10 |
| 6 | Nút "Bỏ vé" | button phụ | Chỉ vé của tôi + ván `waiting` → A2 | BR-10 |
| 7 | Nút "Tạo bộ vé mới" | button phụ (host) | Hiện cho host khi ván `waiting`. Bấm: 0 người giữ → 9; còn người giữ → 8 | BR-12 |
| 8 | Dialog "Chưa tạo được bộ vé mới" | dialog | Danh sách người đang giữ vé: ảnh, tên, vé, online/offline (RTDB `presence`). Người offline có nút "Thu hồi" → `reclaimPlayerTickets` (như SCR-07.A2). Người online: nhắc họ bỏ vé | BR-12, BR-13 (FLOW-04 A1, E2) |
| 9 | Dialog xác nhận tạo bộ mới | dialog | "Tạo bộ vé mới? 16 vé sẽ được sinh lại cho cả phòng." Hủy / Tạo → A3 | BR-12 |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-05.A0 | Tải 16 vé và người giữ | realtime — Firestore listener `rooms/{roomId}/tickets` (16 doc), `games/{current_game_id}/players`; RTDB `presence/{roomId}` (online/offline của người giữ) | Hiện 3 theo thứ tự màu cố định; người khác lấy/bỏ → cập nhật ≤ 1 giây (NFR-02) | Lỗi đọc → thông báo trong sheet "Không tải được bộ vé" + "Thử lại" |
| SCR-05.A1 | Lấy vé (5) | `takeTicket` (`POST /rooms/{roomId}/tickets/{ticketId}/take`) | Tạo/sửa `players/{me}.ticket_ids`; thẻ đổi sang "Bạn"; vé hiện ở SCR-04; cả phòng thấy vé có chủ | `TICKET_TAKEN` (BR-09, FLOW-05 E3) → toast "Vé đã có người lấy"; `TICKET_LIMIT_REACHED` (BR-09) → toast "Tối đa 2 vé"; `GAME_NOT_WAITING` (BR-10) → toast "Ván đã bắt đầu, không đổi vé được" |
| SCR-05.A2 | Bỏ vé (6) | `releaseTicket` (`POST /rooms/{roomId}/tickets/{ticketId}/release`) | Bỏ khỏi `players/{me}.ticket_ids`; thẻ về "Trống" | `GAME_NOT_WAITING` → toast như A1; `TICKET_NOT_HELD` → làm mới theo listener |
| SCR-05.A3 | Tạo bộ vé mới (host) (7 → 9) | `renewTicketSet` (`POST /rooms/{roomId}/ticket-set/renew`) | Ghi đè `grid` 16 vé, `ticket_set_no + 1`; cả phòng thấy toast "Bộ vé mới đã được tạo" | `TICKETS_STILL_HELD` (BR-12) → mở 8 với danh sách server trả về; `GAME_NOT_WAITING` → toast "Chỉ tạo bộ vé mới khi ván chờ bắt đầu"; `NOT_ROOM_HOST` → ẩn 7 |

Thao tác phát sinh (chưa có mã trong wireframe.md mục 4): **Thu hồi vé từ dialog 8** — dùng lại `reclaimPlayerTickets` của SCR-07.A2 `(Q-050)`; đề xuất bổ sung mã `SCR-05.A4` vào wireframe.

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | 16 thẻ skeleton theo màu |
| Empty | — (luôn có đúng 16 vé). Hết vé trống: dòng 1 thêm "Hết vé trống — chờ người khác bỏ vé ở ván sau" (FLOW-05 A2) |
| Error | Lỗi tải: thông báo + "Thử lại"; lỗi thao tác: toast |
| Không có quyền | Không phải host: không thấy 7, 8, 9. Không còn trong phòng → SCR-04 đưa về SCR-02 |
| Ván `waiting` | Lấy/bỏ được (trang 1–2 drawio) |
| Ván không `waiting` | 2 hiện, 5/6 khóa, 7 ẩn; thẻ của người đã rời "Khóa tới hết ván" (trang 4) |

## 5. Ghi chú UX
- Cặp vé cùng màu đặt cạnh nhau để người chơi thích "ôm cặp" dễ chọn (không bắt buộc theo cặp – BR-09).
- Vé giữ từ ván trước vẫn hiện "Bạn", không cần lấy lại (BR-11).
- Người vừa vào lại phòng (BR-25) không được trả vé cũ: vé đã về "Trống".
- Sau khi lấy vé đầu tiên, sheet không tự đóng để người chơi lấy thêm vé thứ 2 `(Q-050)`.

- Thẻ vé trong danh sách (mục 3) có hình thu nhỏ của vé: 3 khối 3 hàng, ô trống màu vé đậm, ô có số màu trắng (không hiện số) — cùng ngôn ngữ hình ảnh với vé đầy đủ.
