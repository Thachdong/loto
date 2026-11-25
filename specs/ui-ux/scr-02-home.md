# SCR-02 Trang chủ

- **Actor:** ACT-01
- **BIZ thể hiện:** BIZ-02, BIZ-03, BIZ-01 — người đã đăng nhập mà chưa ở phòng nào cần một nơi để tạo phòng riêng (BIZ-02) hoặc vào phòng bạn bè bằng mã phòng 6 ký tự (BIZ-03, Q-056); đây cũng là điểm hạ cánh khi rời phòng, bị kick hoặc phòng hết hạn, nên màn phải nói rõ lý do. Người đang ở phòng được nhắc quay về phòng vì mỗi người chỉ ở 1 phòng (BR-02).
- **FLOW:** FLOW-01 (bước 8, A2), FLOW-02 (bước 1–7, E1), FLOW-03 (A5, E2–E4, E6), FLOW-10 bước 5, FLOW-11 bước 5, FLOW-14 bước 6
- **Đến từ:** SCR-01, SCR-03 (lỗi link → "Về trang chủ"), SCR-04 (rời / bị kick / phòng đóng), SCR-10 (←) · **Đi tới:** SCR-04, SCR-10, SCR-01 (đăng xuất)
- **Wireframe:** [drawio](./drawio/scr-02-home.drawio) — 2 trang: *Chưa ở phòng*, *Đang ở phòng + menu avatar*. Chưa export PNG.

## 1. Layout
Header chung ngoài phòng (logo trái, avatar phải — wireframe mục 5) → banner lý do vừa rời phòng (khi có) → lời chào → card "Tạo phòng mới" (ô tên + chọn giọng rao + nút) → card "Vào phòng" (nút mở ô nhập mã) — hoặc card "Bạn đang ở phòng" thay cả hai khi `current_room_id` ≠ null. Cột nội dung lề 16px; máy tính rộng tối đa 480px.

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Logo "LÔ TÔ" | header | Tĩnh | — |
| 2 | Avatar | icon button | `users.photo_url` (rỗng → chữ cái đầu `display_name`); bấm mở 3 | — |
| 3 | Menu avatar | dropdown | "Hồ sơ cá nhân" → SCR-10; "Đăng xuất" → A3 | — |
| 4 | Banner lý do rời phòng | dismissible banner | Một trong: "Bạn đã bị mời ra khỏi phòng "{tên}"." / "Phòng "{tên}" đã hết hạn." / "Host đã đóng phòng "{tên}"." (Q-057) / "Bạn đã rời phòng "{tên}"." / "Bạn không còn ở trong phòng." (không rõ lý do). Nguồn: trạng thái client lưu lúc rời SCR-04 (`sessionStorage`) `(Q-050)` | — |
| 5 | Lời chào | text | "Xin chào, {users.display_name}" | — |
| 6 | Ô tên phòng | input | Placeholder "Phòng của {display_name}"; bộ đếm x/50; để trống → server dùng tên mặc định | `rooms.name` 1–50 ký tự sau trim (TBL-02); mặc định theo Q-024 |
| 6b | Giọng rao | chip chọn một | Danh sách `VOICE_PACKS` (hiện: "Miền Tây"), mặc định bộ đầu; khóa khi đang gửi | `rooms.voice_pack` (ADR-08) |
| 7 | Nút "Tạo phòng" | button chính | → A1. Khóa khi đang gửi | BR-02 |
| 8 | Card "Vào phòng" | card + button | Nút "Vào phòng" → mở 10; dòng phụ "Có mã phòng 6 ký tự từ bạn bè? Hoặc mở link mời bạn nhận được." (Q-056, thay Q-022) | — |
| 10 | Dialog nhập mã phòng | dialog + input | Ô 6 ký tự (font to, cách quãng, tự in hoa, bỏ khoảng trắng, bàn phím chữ); nút "Vào" bật khi đủ 6 ký tự hợp lệ → A4; dòng lỗi dưới ô | BR-30: `^[A-HJ-NP-Z2-9]{6}$` |
| 9 | Card "Bạn đang ở phòng" | card | Tên phòng, "Ván n · trạng thái · m người" (đọc `rooms/{current_room_id}`), nút "Về phòng" → A2. Thay cho 6–8 | BR-02 |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-02.A0 | Tải hồ sơ + phòng hiện tại | realtime — Firestore listener `users/{uid}`; nếu `current_room_id` ≠ null thì listener `rooms/{current_room_id}` cho 9 | Hiện 5 và 6–7 hoặc 9. `current_room_id` đổi từ null sang có giá trị (vd vừa vào phòng ở tab khác) → hiện 9 | Mất phiên (cookie hết hạn) → SCR-01; lỗi mạng → banner "Mất kết nối – đang thử lại…" |
| SCR-02.A1 | Tạo phòng (6 → 7) | `createRoom` (`POST /rooms`, body `{name?, voicePack?}`) | Phòng `active`, ván 1 `waiting`, 16 vé, `invite_code`; `users.current_room_id` = phòng mới → điều hướng SCR-04 (FLOW-02 bước 7) | `ALREADY_IN_ROOM` (BR-02, FLOW-02 E1) → toast "Bạn đang ở phòng {tên}" + chuyển sang 9; `ROOM_NAME_INVALID` (422) (tên > 50) → lỗi dưới 6; lỗi khác → toast "Không tạo được phòng, thử lại" |
| SCR-02.A2 | Về phòng hiện tại (9) | client (điều hướng `/room`) | → SCR-04 | Phòng vừa đóng → listener `users` báo `current_room_id = null`, ẩn 9, hiện 4 "Phòng đã hết hạn" |
| SCR-02.A3 | Đăng xuất (3) | `deleteCurrentSession` (`DELETE /sessions/current`) + Firebase Auth `signOut` (client) | Ở SCR-02 người dùng không ở phòng nào → chỉ hủy phiên → SCR-01. (Người đang ở phòng đăng xuất từ SCR-10.A4: player = rời phòng, host = đóng phòng – Q-052, Q-057) | BR-21 |
| SCR-02.A4 | Vào phòng bằng mã (8 → 10) | `joinRoom` (`POST /rooms/join`, body `{roomCode}`) | Server kiểm BR-30, BR-06, BR-02, BR-03 trong transaction → `users.current_room_id`, `member_count + 1`, `last_event = member_joined` → điều hướng SCR-04 (cả phòng thấy toast "{tên} đã vào phòng"); đã là thành viên → sang SCR-04 | `ROOM_CODE_INVALID` → lỗi dưới ô "Mã phòng không đúng hoặc đã hết hạn", giữ dialog; `ROOM_FULL` → "Phòng đã đầy"; `BLOCKED_FROM_ROOM` → "Bạn không thể vào phòng này"; `ALREADY_IN_ROOM` → đóng dialog, chuyển sang 9; lỗi mạng → "Không vào được phòng, thử lại" |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | Header + skeleton card (chờ listener `users` lần đầu) |
| Empty | Trạng thái mặc định khi chưa ở phòng: 6–7 + 8 |
| Nhập mã | 10 mở trên nền mờ; đang gửi → nút "Vào" quay vòng, khóa ô |
| Error | Banner "Mất kết nối – đang thử lại…"; nút 7 vẫn bấm được (lỗi trả về theo A1) |
| Không có quyền | Chưa đăng nhập → SCR-01 |
| Đang ở phòng (`current_room_id` ≠ null) | 9 thay 6–8 (trang 2 drawio). Mở app bình thường sẽ vào thẳng SCR-04; trạng thái này chỉ gặp khi điều hướng tay hoặc sau lỗi `ALREADY_IN_ROOM` |
| Vừa rời phòng | 4 hiện trên cùng, đóng bằng ✕, tự ẩn khi tải lại trang |

## 5. Ghi chú UX
- `(Q-050)` Lý do ở banner 4 do client tự suy ra lúc listener `users/{uid}` báo `current_room_id` thành null: đọc `rooms.last_event` lần cuối (`member_kicked` với `target_uid` = mình → kick), `rooms.status = closed`/`expires_at` đã qua → hết hạn, chính mình bấm Rời → rời. Bị kick **khi đang offline** (FLOW-10 A1) hoặc phòng đóng khi offline (FLOW-14 E1): client không đọc được phòng nữa (Security Rules) nên chỉ hiện "Bạn không còn ở trong phòng". Muốn hiện đúng lý do cần thêm dữ liệu phía server (xem báo cáo – thiếu dữ liệu/API).
- Nút 7 không có bước xác nhận; tạo phòng xong vào thẳng SCR-04 để host mời bạn ngay.
