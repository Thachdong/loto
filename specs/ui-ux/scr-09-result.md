# SCR-09 Duyệt Kinh & kết quả ván (overlay)

> Cập nhật – Q-055: bỏ cửa sổ đồng kinh 5 giây. Mọi lượt Kinh đều dừng ván và chờ host duyệt; trong lúc chờ, player khác vẫn KINH được.

- **Actor:** ACT-03 (xem, KINH thêm), ACT-02 (host – xác nhận hoặc bác bỏ)
- **BIZ thể hiện:** BIZ-08 (báo Kinh, host duyệt, chúc mừng) — khoảnh khắc cao trào của lô tô: khi có người bấm KINH, cả phòng thấy ngay ai KINH và gợi ý đúng/hụt của hệ thống; ai cũng còn KINH được tới khi host bấm; host bác bỏ (mọi vé hụt → quay tiếp) hoặc xác nhận (có vé đúng → kết thúc ván) (BR-28); rồi cả phòng được chúc mừng và chuẩn bị ván mới.
- **FLOW:** FLOW-08 (4–11, A1, A2, A5, A6, E4), FLOW-07 E2 (rao hết 90 số), FLOW-14 A1
- **Đến từ:** SCR-04 (tự mở khi `games.status` sang `awaiting_confirm`, hoặc ván kết thúc không người thắng) · **Đi tới:** SCR-04 (host bác bỏ → ván quay tiếp; Đóng → ván mới `waiting`)
- **Wireframe:** [drawio](./drawio/scr-09-result.drawio) — 4 trang: *Chờ host duyệt – player*, *Chờ host duyệt – host*, *Chờ host duyệt – host offline*, *Kết thúc – chúc mừng*. Chưa export PNG.

## 1. Layout
Hai dạng theo trạng thái ván:
- **`awaiting_confirm` (Chờ host duyệt)** — thẻ nổi ở nửa trên SCR-04, **không** che vé và thanh KINH (người khác vẫn KINH được – Q-055): tiêu đề "KINH!", danh sách lượt Kinh chờ duyệt (mỗi lượt: ảnh, tên, chip vé, gợi ý ✅ Đúng / ❌ Hụt, hàng thắng + 5 số nếu đúng), vé thu nhỏ, khu nút host ở đáy thẻ.
- **`finished`** — overlay toàn màn (nền tối): tiêu đề chúc mừng, danh sách người thắng, vé thắng thu nhỏ với hàng thắng tô viền, nút Đóng. Thanh KINH bên dưới ẩn.

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Tiêu đề | title | `awaiting_confirm`: "KINH! · Chờ host duyệt ({k} lượt)"; `finished` + `result = won`: "🎊 Chúc mừng! 🎊" + "Ván {seq_no} kết thúc · {k} người thắng" | — |
| 2 | Danh sách lượt Kinh | list | `games.claims[]` theo `claimed_at`: ảnh, `display_name`, chip "Vé {màu} {cạnh}", gợi ý "✅ Đúng – Hàng {row+1}: a · b · c · d · e" hoặc "❌ Hụt"; lượt mới thêm vào cuối kèm hiệu ứng | BR-17, BR-28 |
| 3 | Danh sách người thắng | list | `finished`: `games.winners[]` (ảnh, tên, chip vé, hàng thắng + 5 số lấy từ `tickets/{ticket_id}.grid` hàng `row`) | BR-17 |
| 4 | Vé thu nhỏ | lưới 9×9 | `tickets/{ticket_id}.grid` của lượt đang chọn trong 2 / 3, ô đã rao tô đậm, hàng thắng viền xanh; mặc định mở lượt đầu tiên, lượt khác có "▸ Xem vé" | BR-28: host thấy vé/hàng |
| 5 | Nút "Xác nhận kết thúc ván" | button chính (host) | Chỉ host, chỉ `awaiting_confirm` **và** có ≥ 1 `claims[].result = win` → A1. Dòng phụ "Người thắng: mọi vé được hệ thống xác định đúng." | BR-28 (Q-055) |
| 10 | Nút "Bác bỏ – quay tiếp" | button phụ (host) | Chỉ host, chỉ `awaiting_confirm` **và** mọi `claims[].result = miss` → A3. Dòng phụ "Tất cả lượt KINH đều hụt." | BR-28 (Q-055) |
| 6 | Dòng chờ host | info box | Player: "⏳ Đang chờ host duyệt. Bạn vẫn có thể bấm KINH."; host offline (RTDB `presence/{roomId}/{host_uid}.online = false`) thêm "Host đang offline — ván chờ host quay lại. Bạn có thể rời phòng." | BR-28, Q-048, Q-057 |
| 7 | Nút "Đóng" | button chính | Chỉ khi `finished` → đóng overlay, về SCR-04 (ván mới `waiting`) | — |
| 8 | Kết quả không ai thắng | title + text | `result = no_winner` (rao hết 90 số, hoặc phòng quá hạn khi toàn lượt hụt): "Ván {n} kết thúc — không ai thắng", không có 3, nút 7 | BR-19 |
| 9 | Lời nhắc KINH | text | "Bạn cũng đủ hàng? Bấm KINH trước khi host duyệt!" — chỉ hiện cho người có vé tham gia ván, còn trong phòng, vé chưa có trong `claims` | Q-055 |
| 11 | Dòng vé được giữ | text | `finished`: online → "Vé của bạn vẫn được giữ cho ván {n+1}"; người vừa quay lại sau khi offline lúc ván kết thúc → "Bạn offline lúc ván kết thúc nên vé đã được trả lại. Hãy lấy vé mới." | BR-11, BR-29 |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-09.A0 | Xem lượt Kinh / người thắng | realtime — Firestore listener `games/{gameId}` (`claims`, `winners`, `status`, `result`) giữ trên **gameId của ván vừa có KINH**, kể cả sau khi `rooms.current_game_id` chuyển sang ván mới; `tickets/{ticket_id}` cho 4; RTDB `presence/{roomId}/{host_uid}` cho 6 | `awaiting_confirm` → dạng thẻ; lượt Kinh mới → thêm vào 2 ngay; status về `running`/`paused` (host bác bỏ) → đóng thẻ, toast "{tên} kinh hụt" + tiếng kinh hụt; `finished` → overlay "Chúc mừng" + tiếng chúc mừng (SUP-02) | Mất kết nối → giữ màn hiện tại + banner mất kết nối của SCR-04 |
| SCR-09.A1 | Xác nhận kết thúc ván (host) (5) | `confirmGame` (`POST /rooms/{roomId}/games/{gameId}/confirm`) | `games.status = finished`, `winners` = các lượt đúng, `confirmed_by`, tạo ván mới `waiting`, chép player còn trong phòng và đang online (BR-07, BR-11, BR-29); mọi người thấy `finished` | `NO_WINNING_CLAIM` → không xảy ra vì 5 chỉ hiện khi có lượt đúng; `GAME_NOT_AWAITING_CONFIRM` (đã tự kết thúc do phòng quá hạn – FLOW-14 A1) → bỏ qua, UI theo listener; `NOT_ROOM_HOST` → ẩn 5; lỗi mạng → toast "Chưa xác nhận được, thử lại" |
| SCR-09.A3 | Bác bỏ – quay tiếp (host) (10) | `rejectClaims` (`POST /rooms/{roomId}/games/{gameId}/claims/reject`) | `claims = []`, ván về `running` (đặt lại `next_call_at`) hoặc `paused`; cả phòng thấy "kinh hụt" (SUP-01, SUP-02) | `CLAIM_HAS_WIN` (vừa có người KINH đúng ngay trước khi bấm) → toast "Vừa có vé KINH đúng — hãy xác nhận", hiện 5; `GAME_NOT_AWAITING_CONFIRM` → bỏ qua; lỗi mạng → toast "Chưa bác bỏ được, thử lại" |
| ~~SCR-09.A2~~ | (đã loại – Q-055) Tự động đóng cửa sổ đồng kinh | ~~`closeClaimWindow`~~ | — | — |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | Mở ngay với dữ liệu ván đã có từ listener SCR-04; ảnh/vé tải sau (skeleton nhỏ) |
| Empty | — (chỉ mở khi có lượt Kinh hoặc ván kết thúc không người thắng → 8) |
| Error | Lỗi xác nhận/bác bỏ → toast, nút bấm lại được |
| Không có quyền | Player: không có 5, 10; thấy 6, 9 |
| `awaiting_confirm` – player | Trang 1: 1, 2, 4, 6, 9; thanh KINH bật |
| `awaiting_confirm` – host, có lượt đúng | Trang 2: 1, 2, 4, 5; thanh KINH bật (host có vé) |
| `awaiting_confirm` – host, toàn lượt hụt | Trang 2: 1, 2, 4, 10 |
| `awaiting_confirm` – host offline | Trang 3: 1, 2, 6 (dòng host offline + gợi ý rời phòng) |
| `finished` | Trang 4: 1, 3, 4, 7, 11 |
| `no_winner` | 8 + 7 + 11 |
| Phòng quá hạn khi đang chờ duyệt | Ván tự `finished` / `no_winner` (FLOW-14 A1) → hiện trang 4 ngắn rồi SCR-04 đưa về SCR-02 "Phòng đã hết hạn" |
| Host rời phòng / đăng xuất | Phòng đóng (Q-057) → SCR-04 đưa về SCR-02 "Host đã đóng phòng" |

## 5. Ghi chú UX
- Mỗi lượt KINH mới phát tiếng "KINH!" ngắn và rung nhẹ (nếu máy hỗ trợ) để cả phòng chú ý.
- Host offline lúc chờ duyệt: ván đứng chờ, chấp nhận theo Q-048; player vẫn chat được (sheet Chat mở trên thẻ) và rời phòng được (SCR-04.A8, Q-057).
- Host cũng là người KINH → vẫn tự bấm 5 hoặc 10 (FLOW-08 A5).
- Khi vừa có lượt đúng chen vào lúc host đang định bác bỏ, server từ chối (`CLAIM_HAS_WIN`) nên không thể bác bỏ nhầm vé đúng.
- `(Q-050)` Ván rao hết 90 số không ai thắng cũng mở overlay (8) để cả phòng biết ván đã kết thúc.
- Hiệu ứng pháo giấy khi `finished` (chỉ hình, tắt nếu người dùng bật "giảm chuyển động" của hệ điều hành) `(Q-050)`.
