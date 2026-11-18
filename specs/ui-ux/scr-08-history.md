# SCR-08 Lịch sử ván (sheet)

- **Actor:** ACT-03 (gồm host)
- **BIZ thể hiện:** BIZ-13 — chơi nhiều ván trong một buổi, nhóm muốn xem lại ai đã thắng ván nào (khoe, tính "vua lô tô" của buổi). Chỉ lưu kết quả, không lưu diễn biến (Q-031); chỉ xem khi phòng còn mở (Q-039).
- **FLOW:** FLOW-13 (1–3, A1, A2, E1)
- **Đến từ:** SCR-04 (nút "Lịch sử") · **Đi tới:** SCR-04 (đóng sheet)
- **Wireframe:** [drawio](./drawio/scr-08-history.drawio) — 2 trang: *Có dữ liệu*, *Trống*. Chưa export PNG.

## 1. Layout
Sheet trên nền SCR-04. Tiêu đề "Lịch sử ván" → danh sách thẻ ván, mới nhất trên cùng; mỗi thẻ: "Ván n" + giờ bắt đầu–kết thúc, rồi danh sách người thắng hoặc dòng kết quả.

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Tiêu đề "Lịch sử ván" + ✕ | header sheet | — | — |
| 2 | Thẻ ván | card | "Ván {seq_no}", "{started_at} – {ended_at}" (HH:mm GMT+7); ván hủy không có giờ bắt đầu → chỉ hiện giờ hủy | — |
| 3 | Kết quả | list / text | `result = won`: mỗi phần tử `winners[]` → 🏆 ảnh (nếu có) + `display_name` + chip "Vé {màu} {cạnh}" (từ `color`, `ticket_id`); `no_winner` → "Không ai thắng"; `cancelled` → "Đã hủy" | — |
| 4 | Trạng thái trống | empty state | "Chưa có ván nào kết thúc" + "Kết quả mỗi ván sẽ hiện ở đây." | — |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-08.A0 | Tải lịch sử ván | Không API — Firestore query `rooms/{roomId}/games` where `status in [finished, cancelled]` orderBy `seq_no desc` (đọc qua listener để tự cập nhật khi ván mới kết thúc – FLOW-13 A1) | Hiện danh sách 2–3 | Lỗi đọc → "Không tải được lịch sử" + "Thử lại"; bị từ chối (phòng đóng) → SCR-04 đưa về SCR-02 |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | 3 thẻ skeleton |
| Empty | 4 |
| Error | Thông báo + "Thử lại" |
| Không có quyền | Không còn trong phòng / phòng đóng → không xem được (Q-039) |

## 5. Ghi chú UX
- `winners` không lưu ảnh; ảnh lấy từ `players/{uid}.photo_url` của ván đó nếu có, không có thì dùng chữ cái đầu `(Q-050)`.
- Không có màn chi tiết ván: mọi thông tin đã nằm trên thẻ (Q-031) `(Q-050)`.
- Số ván ít (≤ vài chục mỗi phòng 8 giờ) → không phân trang.
