# SCR-11 Cài đặt (sheet)

- **Actor:** ACT-03 (mode dò, tiếng rao), ACT-02 (host – thêm nhịp quay)
- **BIZ thể hiện:** BIZ-15, BIZ-06 (nhịp quay) — mỗi người chơi chọn cách chơi hợp với mình: tự dò cho vui hay để Auto đánh dấu (BR-20), nghe hay tắt tiếng rao; host chỉnh nhịp quay 5 / 10 / 15 giây cho hợp nhịp của nhóm (BR-15).
- **FLOW:** FLOW-15 (1–3, A1, A2), FLOW-06 A3
- **Đến từ:** SCR-04 (nút "Cài đặt") · **Đi tới:** SCR-04 (đóng sheet)
- **Wireframe:** [drawio](./drawio/scr-11-settings.drawio) — 2 trang: *Host*, *Player*. Chưa export PNG.

## 1. Layout
Sheet thấp (nửa dưới) trên nền SCR-04, phía trên thanh KINH/thanh nút dưới. Các hàng cài đặt: Cách dò số (segmented) → Tiếng rao (switch) → Nhịp quay (stepper cho host, text cho player) → Giọng rao (chip cho host, text cho player) → đường kẻ → dòng giờ hết hạn phòng (bỏ "Hồ sơ cá nhân ›" – Q-069).

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Tiêu đề "Cài đặt" + ✕ | header sheet | — | — |
| 2 | Cách dò số | segmented control | "Tự dò" (mặc định) / "Auto" + mô tả "Auto tự đánh dấu số đã rao trên vé; bạn vẫn phải tự bấm KINH." — localStorage | BR-20 |
| 3 | Tiếng rao | switch | Bật (mặc định) / Tắt — localStorage; "Chỉ áp dụng trên máy của bạn" | SUP-02 |
| 4 | Nhịp quay | stepper (host) / text (player) | `rooms.draw_interval_sec`; host: nút −/+ chuyển giữa 5 → 10 → 15 giây (Q-070), hiển thị "{n} giây", "áp dụng từ số kế tiếp"; player: "{n} giây/số (host chỉnh)" | BR-15: 5 / 10 / 15, mặc định 5 |
| 4b | Giọng rao | chip chọn một (host) / text (player) | `rooms.voice_pack`; danh sách `VOICE_PACKS` (hiện: "Miền Tây"); host chạm chip → `updateRoom` `{voicePack}`; player thấy tên bộ đang dùng | ADR-08; áp dụng từ câu rao kế tiếp |
| 6 | Giờ hết hạn phòng | text | "Phòng hết hạn lúc HH:mm" (`rooms.expires_at`, GMT+7) `(Q-050)` | BR-04 |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-11.A1 | Đổi mode dò (2) | client — localStorage `loto.trackMode` | Áp dụng ngay cho vé ở SCR-04. Sang Auto giữa ván: mọi số đã rao trên vé được đánh dấu + bật hiệu ứng (SUP-10). Auto → Tự dò: giữ ô đã đánh dấu, tắt hiệu ứng (FLOW-15 A1) | localStorage không khả dụng → giữ trong bộ nhớ trang |
| SCR-11.A2 | Bật/tắt tiếng rao (3) | client — localStorage `loto.sound` | Tắt: dừng phát ngay, vẫn thấy số. Bật: nếu chưa có `AudioContext` → chạy SCR-04.A1 ngay trong lần chạm này | — |
| SCR-11.A3 | Đổi nhịp quay (host) (4) | `updateRoom` (`PATCH /rooms/{roomId}`, body `{drawIntervalSec}`) — gửi sau 600 ms kể từ lần bấm cuối (debounce) `(Q-050)` | `rooms.draw_interval_sec` cập nhật; cả phòng thấy toast "Nhịp quay: {n} giây/số"; áp dụng từ số kế tiếp | `DRAW_INTERVAL_INVALID` (422) (BR-15, không phải 5 / 10 / 15) → không xảy ra do stepper giới hạn; `NOT_ROOM_HOST` → chuyển 4 sang dạng chỉ đọc; lỗi mạng → trả stepper về giá trị server + toast "Chưa đổi được nhịp quay" |
| SCR-11.A4 | Đổi giọng rao (host) (4b) | `updateRoom` (`PATCH /rooms/{roomId}`, body `{voicePack}`) — gửi ngay khi chạm | `rooms.voice_pack` cập nhật (không toast); stream server dùng bộ mới từ câu rao kế tiếp | `VALIDATION_FAILED` (bộ lạ) → không xảy ra do chip giới hạn; lỗi → trả về giá trị server + toast "Chưa đổi được giọng rao" |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | Hiện ngay (dữ liệu localStorage và `rooms` đã có từ SCR-04) |
| Empty | — |
| Error | Toast khi đổi nhịp lỗi |
| Không có quyền | Player: 4 chỉ đọc |
| Đổi nhịp khi ván chưa chạy | Được; áp dụng cho ván tiếp theo `(Q-050)` |

## 5. Ghi chú UX
- Cài đặt cá nhân giữ nguyên qua các ván trong phòng và qua các phòng trên cùng máy (localStorage – Q-047).
- Không có mục "Rời phòng" ở đây; nút Rời nằm trên header SCR-04 (chỉ player).
