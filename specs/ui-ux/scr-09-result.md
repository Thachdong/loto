# SCR-09 Kết quả ván (overlay)

- **Actor:** ACT-03 (xem), ACT-02 (host – xác nhận kết thúc ván)
- **BIZ thể hiện:** BIZ-08 (đồng kinh, host xác nhận, chúc mừng) — khoảnh khắc cao trào của lô tô: khi có KINH đúng, cả phòng phải thấy ngay ai thắng; người khác còn 5 giây để đồng kinh (BR-18); host xem vé/hàng thắng và chốt kết thúc ván (BR-28); rồi cả phòng được chúc mừng và chuẩn bị ván mới.
- **FLOW:** FLOW-08 (6–9, A2, A5, E5), FLOW-07 E2 (rao hết 90 số), FLOW-14 A1
- **Đến từ:** SCR-04 (tự mở khi `games.status` sang `claim_window`, hoặc ván kết thúc không người thắng) · **Đi tới:** SCR-04 (Đóng, ván mới `waiting`)
- **Wireframe:** [drawio](./drawio/scr-09-result.drawio) — 4 trang: *Đang chờ đồng kinh*, *Chờ host xác nhận – host*, *Chờ host xác nhận – player, host offline*, *Kết thúc – chúc mừng*. Chưa export PNG.

## 1. Layout
Hai dạng theo trạng thái ván:
- **`claim_window`** — thẻ nổi ở nửa trên SCR-04, **không** che vé và thanh KINH (người khác vẫn đồng kinh được – BR-18): tiêu đề "KINH! 🎉", vòng đếm ngược 5 giây, danh sách người thắng tạm thời, lời nhắc bấm KINH.
- **`awaiting_confirm` / `finished`** — overlay toàn màn (nền tối): tiêu đề, danh sách người thắng (mỗi người: ảnh, tên, chip vé, hàng thắng + 5 số), vé thắng thu nhỏ với hàng thắng tô viền, nút hành động ở đáy. Thanh KINH bên dưới khóa.

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Tiêu đề | title | `claim_window`: "KINH! 🎉"; `awaiting_confirm`: "Có người KINH đúng"; `finished` + `result = won`: "🎊 Chúc mừng! 🎊" + "Ván {seq_no} kết thúc · {k} người thắng" | — |
| 2 | Đếm ngược đồng kinh | vòng số | Giây còn lại = `claim_window_ends_at − now` (5 → 0) + "Đang chờ đồng kinh…" | BR-18 |
| 3 | Danh sách người thắng | list | `games.winners[]`: ảnh, `display_name`, chip "Vé {màu} {cạnh}", "Hàng {row+1}: a · b · c · d · e" (số lấy từ `tickets/{ticket_id}.grid` hàng `row`) | BR-17 |
| 4 | Vé thắng thu nhỏ | lưới 9×9 | `tickets/{ticket_id}.grid`, ô đã rao tô đậm, hàng thắng viền xanh; nhiều người thắng → người đầu mở sẵn, người sau có "▸ Xem vé" | BR-28: host thấy vé/hàng thắng |
| 5 | Nút "Xác nhận kết thúc ván" | button chính (host) | Chỉ host, chỉ `awaiting_confirm` → A1. Dòng phụ "Host không bác bỏ được kết quả đã kiểm tra." | BR-28 (Q-036) |
| 6 | Dòng chờ host | info box | Player: "⏳ Đang chờ host xác nhận kết thúc ván."; host offline (RTDB `presence/{roomId}/{host_uid}.online = false`) thêm "Host đang offline — ván chờ host quay lại." | BR-28, Q-048 |
| 7 | Nút "Đóng" | button chính | Chỉ khi `finished` → đóng overlay, về SCR-04 (ván mới `waiting`) | — |
| 8 | Kết quả không ai thắng | title + text | `result = no_winner` (rao hết 90 số): "Ván {n} kết thúc — không ai thắng", không có 3, nút 7 | BR-19 |
| 9 | Lời nhắc đồng kinh | text | "Bạn cũng đủ hàng? Bấm KINH ngay trong {n} giây!" — chỉ hiện cho người có vé tham gia ván và chưa thắng | BR-18 |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-09.A0 | Xem người thắng / đếm ngược đồng kinh | realtime — Firestore listener `games/{gameId}` (`winners`, `claim_window_ends_at`, `status`, `result`) giữ trên **gameId của ván vừa có KINH**, kể cả sau khi `rooms.current_game_id` chuyển sang ván mới; `tickets/{ticket_id}` cho 4; RTDB `presence/{roomId}/{host_uid}` cho 6 | `claim_window` → dạng thẻ; người đồng kinh mới → thêm vào 3 ngay; `awaiting_confirm` → overlay; `finished` → 1 "Chúc mừng" + tiếng chúc mừng (SUP-02) | Mất kết nối → giữ màn hiện tại + banner mất kết nối của SCR-04 |
| SCR-09.A1 | Xác nhận kết thúc ván (host) (5) | `confirmGame` (`POST /rooms/{roomId}/games/{gameId}/confirm`) | `games.status = finished`, `confirmed_by`, tạo ván mới `waiting` và chép player còn trong phòng (BR-07, BR-11); mọi người thấy trạng thái `finished` | `GAME_NOT_AWAITING_CONFIRM` (đã tự kết thúc do phòng quá hạn – FLOW-14 A1) → bỏ qua, UI theo listener; `NOT_ROOM_HOST` → ẩn 5; lỗi mạng → toast "Chưa xác nhận được, thử lại" |
| SCR-09.A2 | Tự động: đóng cửa sổ đồng kinh | `closeClaimWindow` (`POST /rooms/{roomId}/games/{gameId}/claim-window/close`) | Mọi client đang thấy `claim_window` gọi khi đồng hồ tới `claim_window_ends_at` (idempotent; `CLAIM_WINDOW_OPEN` → hẹn lại 300ms) → ván `awaiting_confirm` (Q-051) | BR-18, BR-28 |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | Mở ngay với dữ liệu ván đã có từ listener SCR-04; ảnh/vé tải sau (skeleton nhỏ) |
| Empty | — (chỉ mở khi có người thắng hoặc ván kết thúc không người thắng → 8) |
| Error | Lỗi xác nhận → toast, nút 5 bấm lại được |
| Không có quyền | Player: không có 5, thấy 6 |
| `claim_window` | Trang 1: 1, 2, 3, 9; thanh KINH bật |
| `awaiting_confirm` – host | Trang 2: 1, 3, 4, 5 |
| `awaiting_confirm` – player | Trang 3: 1, 3, 6 |
| `finished` | Trang 4: 1, 3, 7 (+ dòng "Vé của bạn vẫn được giữ cho ván {n+1}") |
| `no_winner` | 8 + 7 |
| Phòng quá hạn khi đang chờ xác nhận | Ván tự `finished` (FLOW-14 A1) → hiện trang 4 ngắn rồi SCR-04 đưa về SCR-02 "Phòng đã hết hạn" |

## 5. Ghi chú UX
- Host offline lúc chờ xác nhận: ván đứng chờ, chấp nhận theo Q-048; player vẫn chat được (sheet Chat mở trên overlay).
- Host cũng là người thắng → vẫn tự bấm 5 (FLOW-08 A5).
- `(Q-050)` Ván rao hết 90 số không ai thắng cũng mở overlay (8) để cả phòng biết ván đã kết thúc, dù wireframe chỉ nêu trường hợp có KINH đúng.
- Hiệu ứng pháo giấy khi `finished` (chỉ hình, tắt nếu người dùng bật "giảm chuyển động" của hệ điều hành) `(Q-050)`.
