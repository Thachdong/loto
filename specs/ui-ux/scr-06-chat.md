# SCR-06 Chat (sheet)

- **Actor:** ACT-03 (gồm host)
- **BIZ thể hiện:** BIZ-12 — chơi lô tô online thiếu không khí ngồi chung, nên thành viên cần trò chuyện ngay trong phòng, kể cả lúc ván đang chạy; người vào sau xem được toàn bộ tin cũ (BR-23).
- **FLOW:** FLOW-12 (1–4, A1, A2, E1–E3)
- **Đến từ:** SCR-04 (nút "Chat") · **Đi tới:** SCR-04 (đóng sheet)
- **Wireframe:** [drawio](./drawio/scr-06-chat.drawio) — 2 trang: *Đang chat*, *Gửi quá nhanh / quá dài*. Chưa export PNG.

## 1. Layout
Sheet trên nền SCR-04, từ dưới header tới trên thanh KINH (khi ván đang chạy) hoặc trên thanh nút dưới. Tiêu đề "Chat" + ✕ → danh sách tin cuộn (mới nhất ở dưới, mở sheet thì cuộn xuống cuối) → dòng lỗi (khi có) → ô nhập + nút Gửi dính đáy sheet.

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Tiêu đề "Chat" + ✕ | header sheet | — | — |
| 2 | Tin của người khác | bubble trái | `sender_photo_url`, `sender_name`, `created_at` (HH:mm GMT+7 – NFR-16), `text` | — |
| 3 | Tin của tôi | bubble phải | `created_at`, `text`; khi đang gửi: mờ + "Đang gửi…" | — |
| 4 | "Đang tải tin cũ hơn…" | indicator | Khi cuộn lên đầu và còn tin cũ hơn | BR-23: xem được toàn bộ tin |
| 5 | Ô nhập tin | textarea tự giãn (tối đa 4 dòng) | Placeholder "Nhập tin nhắn…"; bộ đếm "{n}/500" hiện khi ≥ 450 ký tự, đỏ khi > 500 | BR-23: 1–500 ký tự sau trim |
| 6 | Nút "Gửi" | button | Khóa khi rỗng (sau trim), > 500 ký tự hoặc đang gửi | BR-23 |
| 7 | Dòng lỗi gửi nhanh | inline alert | "Bạn gửi quá nhanh, thử lại sau vài giây." — giữ nguyên nội dung trong 5 (FLOW-12 E2) | SUP-07: ≤ 5 tin/10 giây |
| 8 | Thanh không gửi được | bar | Thay 5–6: "Không thể gửi tin trong phòng này" khi phòng đóng / mình không còn trong phòng (FLOW-12 E3) | — |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-06.A0 | Tải tin nhắn | realtime — Firestore listener `rooms/{roomId}/messages` orderBy `created_at` limitToLast 50; cuộn lên đầu → query trang cũ hơn (`created_at <` mốc, limit 50) `(Q-050)` kích thước trang | Hiện tin; tin mới tới ≤ 1 giây (NFR-02); cập nhật mốc "đã xem chat" (localStorage) để xóa badge ở SCR-04 | Lỗi đọc → thông báo "Không tải được tin nhắn" + "Thử lại" |
| SCR-06.A1 | Gửi tin (5 → 6) | `sendMessage` (`POST /rooms/{roomId}/messages`, body `{text}`) | Tin hiện ngay dạng "đang gửi" (optimistic), xác nhận qua listener; xóa ô nhập | `RATE_LIMITED` (SUP-07) → 7, giữ nội dung; `MESSAGE_EMPTY` / `MESSAGE_TOO_LONG` (422) (BR-23) → không gửi (6 đã khóa); `NOT_ROOM_MEMBER` / phòng đóng → 8; lỗi mạng → bubble "Gửi thất bại · Gửi lại" |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | 4–5 bubble skeleton |
| Empty | "Chưa có tin nhắn. Chào cả phòng một câu nhé!" |
| Error | Lỗi tải: thông báo + "Thử lại"; lỗi gửi: 7 hoặc bubble gửi lại |
| Không có quyền | Không còn trong phòng / phòng đóng → 8, sau đó SCR-04 đưa về SCR-02 |
| Ván đang chạy | Bình thường (FLOW-12 A2); thanh KINH hiện dưới sheet |

## 5. Ghi chú UX
- Không sửa/xóa tin (BR-23); không gửi ảnh (chỉ text/emoji – BIZ-12).
- Tên/ảnh người gửi là bản chép lúc gửi (`sender_name`, `sender_photo_url`), đổi hồ sơ sau đó không cập nhật tin cũ.
- Enter = xuống dòng trên điện thoại; trên máy tính Enter = gửi, Shift+Enter = xuống dòng `(Q-050)`.
- Bàn phím ảo mở: sheet co lại, giữ ô nhập ngay trên bàn phím; thanh KINH tạm ẩn sau bàn phím `(Q-050)` (đóng bàn phím là thấy lại).
