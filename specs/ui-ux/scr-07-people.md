# SCR-07 Người trong phòng (sheet)

- **Actor:** ACT-03 (xem), ACT-02 (host – kick, thu hồi vé)
- **BIZ thể hiện:** BIZ-10, BIZ-04 (thu hồi vé), SUP-04 — thành viên cần biết ai đang trong phòng, ai online, ai đang giữ vé nào; host cần công cụ giữ trật tự (kick player – BR-06) và giải phóng vé của người offline (BR-13) để người khác chơi hoặc tạo bộ vé mới.
- **FLOW:** FLOW-10 (1–5, A1, E1), FLOW-04 (A1, A2), SUP-04
- **Đến từ:** SCR-04 (nút "Người") · **Đi tới:** SCR-04 (đóng sheet)
- **Wireframe:** [drawio](./drawio/scr-07-people.drawio) — 2 trang: *Góc nhìn host – ván chờ*, *Xác nhận kick / thu hồi*. Chưa export PNG.

## 1. Layout
Sheet trên nền SCR-04. Tiêu đề "Người trong phòng · {n}/16" → danh sách hàng 72px: ảnh + chấm online, tên + nhãn, trạng thái online/offline, chip vé đang giữ; host thấy nút hành động bên phải hàng. Sắp xếp: host → mình → online → offline, cùng nhóm theo tên `(Q-050)`.

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Tiêu đề + số người | header sheet | "Người trong phòng · {rooms.member_count}/16" | BR-03 |
| 2 | Hàng người | list item | Ảnh + tên từ RTDB `presence/{roomId}/{uid}` (`display_name`, `photo_url`); chấm xanh/xám theo `online` | SUP-04 |
| 3 | Nhãn vai trò | chip | "Host" (`uid = rooms.host_uid`), "(Bạn)" với chính mình | BR-21 |
| 4 | Trạng thái + vé | text + chip màu | "Online" / "Offline · {n} phút" (từ `presence.at`); chip màu vé từ `games/{current}/players/{uid}.ticket_ids`; không có → "Chưa lấy vé" | — |
| 5 | Nút "Kick" | button phụ (host) | Chỉ hiện với hàng là **player** (có doc player có vé ở ván hiện tại) và không phải host (Q-048, FLOW-10 E1) → 7 | BR-06, BR-22 |
| 6 | Nút "Thu hồi vé" | button phụ (host) | Chỉ hiện khi hàng đang offline, có vé, ván `waiting` → 8 | BR-13 |
| 7 | Dialog xác nhận kick | dialog | "Kick {tên}?" + hệ quả: bị đưa ra và không vào lại được; ván đang chạy → vé khóa tới hết ván. Hủy / Kick | BR-06, BR-22 |
| 8 | Dialog xác nhận thu hồi | dialog | "Thu hồi vé của {tên}?" + "{tên} đang offline. Vé {màu} sẽ trả về bộ vé." Hủy / Thu hồi `(Q-050)` có xác nhận | BR-13 |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-07.A0 | Tải người trong phòng | realtime — RTDB listener `presence/{roomId}`; Firestore listener `games/{current}/players`, `rooms/{roomId}` (`host_uid`, `member_count`) | Danh sách cập nhật ≤ 1 giây khi có người vào/rời/online/offline (NFR-02) | Lỗi đọc → "Không tải được danh sách" + "Thử lại" |
| SCR-07.A1 | Kick player (host) (5 → 7) | `kickPlayer` (`POST /rooms/{roomId}/players/{uid}/kick`) | `uid` vào `blocked_uids`, `current_room_id` của họ = null, xóa player nếu ván `waiting`; hàng biến mất; cả phòng thấy toast "{tên} bị mời ra khỏi phòng"; người bị kick về SCR-02 | `PLAYER_NOT_FOUND` (chưa lấy vé – Q-048) → toast "Chỉ kick được người đã lấy vé"; `CANNOT_TARGET_SELF` → không xảy ra (không có nút); `NOT_ROOM_HOST` → ẩn nút |
| SCR-07.A2 | Thu hồi vé người offline (host) (6 → 8) | `reclaimPlayerTickets` (`POST /rooms/{roomId}/players/{uid}/reclaim-tickets`) | Xóa player của họ ở ván `waiting` → vé "Trống"; toast "Host đã thu hồi vé của {tên}" | `TARGET_ONLINE` (BR-13: người đó vừa online lại) → toast "{tên} đang online, không thu hồi được"; `GAME_NOT_WAITING` → toast "Chỉ thu hồi khi ván chờ bắt đầu" |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | 4 hàng skeleton |
| Empty | Không xảy ra (luôn có ít nhất host). Chỉ có mình: thêm gợi ý "Bấm Mời để gọi bạn vào phòng" (host) `(Q-050)` |
| Error | Thông báo + "Thử lại"; lỗi thao tác → toast |
| Không có quyền | Player thường: không có nút 5, 6 |
| Ván đang chạy | 6 ẩn (chỉ thu hồi khi `waiting`); 5 vẫn hiện (kick trong ván được – BIZ-10) |

## 5. Ghi chú UX
- Danh sách lấy từ RTDB presence vì DB không lưu danh sách thành viên (Q-047); server xóa node presence khi người đó rời/bị kick.
- Host offline vẫn hiện "Host · Offline" — ván không tạm dừng (Q-048).
- Không có chuyển quyền host (Q-048 thay BR-24).
