# SCR-10 Hồ sơ cá nhân

- **Actor:** ACT-01 (gồm người đang ở phòng – ACT-03)
- **BIZ thể hiện:** BIZ-16 — người chơi muốn hiện trong phòng bằng tên/ảnh mình chọn thay vì tên Google (biệt danh, ảnh vui), dùng cho mọi phòng; có thể khôi phục về Google (BR-27).
- **FLOW:** FLOW-16 (1–4, A1, E1)
- **Đến từ:** SCR-02 (menu avatar), SCR-11 (link "Hồ sơ cá nhân" – `(Q-050)`) · **Đi tới:** màn trước đó (←: SCR-02 hoặc SCR-04)
- **Wireframe:** [drawio](./drawio/scr-10-profile.drawio) — 3 trang: *Hồ sơ*, *Chọn ảnh*, *Tên không hợp lệ*. Chưa export PNG.

## 1. Layout
Header ngoài phòng với nút ← và tiêu đề. Thân: ảnh đại diện lớn (96px) + "Đổi ảnh" → ô tên hiển thị + bộ đếm → email (chỉ đọc) → nút "Lưu" full width → link "Khôi phục tên & ảnh từ Google". "Đổi ảnh" mở bottom sheet chọn nguồn ảnh.

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Header "← Hồ sơ cá nhân" | header | ← quay lại màn trước; có thay đổi chưa lưu → hỏi "Bỏ thay đổi?" `(Q-050)` | — |
| 2 | Ảnh đại diện + "Đổi ảnh" | avatar 96px + link | `users.photo_url` (rỗng → chữ cái đầu); bấm → 3 | — |
| 3 | Sheet đổi ảnh | bottom sheet | Nút "Tải ảnh lên (JPG/PNG, tối đa 5 MB)" (`accept="image/jpeg,image/png"`) + lưới avatar có sẵn (`public/avatars/`) | BR-27 |
| 4 | Tiến độ tải ảnh | progress bar | % upload lên Storage `avatars/{uid}/{uuid}.webp` (sau khi client thu nhỏ 256×256 WebP – ADR-12) | — |
| 5 | Ô tên hiển thị | input | `users.display_name`; bộ đếm "{n}/30"; trim khoảng trắng đầu/cuối | BR-27: 2–30 ký tự |
| 6 | Lỗi validation | inline error | "Tên hiển thị cần 2–30 ký tự." / "Ảnh phải là JPG/PNG và không quá 5 MB." | BR-27 |
| 7 | Email | text chỉ đọc | `users.email` + "Chỉ bạn thấy email này." | NFR-10 |
| 8 | Nút "Lưu" | button chính | Khóa khi tên không đổi hoặc không hợp lệ → A1 | BR-27 |
| 9 | Link "Khôi phục tên & ảnh từ Google" | link | Ẩn khi `profile_customized = false` → A3 | — |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-10.A0 | Tải hồ sơ | realtime — Firestore listener `users/{uid}` | Hiện 2, 5, 7 | Lỗi đọc → "Không tải được hồ sơ" + "Thử lại"; mất phiên → SCR-01 |
| SCR-10.A1 | Lưu tên hiển thị (5 → 8) | `updateProfile` (`PATCH /me/profile`, body `{displayName}`) | `display_name`, `profile_customized = true`; nếu đang ở phòng, server cập nhật tên ở `players` của ván hiện tại; toast "Đã lưu hồ sơ" | `DISPLAY_NAME_INVALID` (422) (BR-27) → 6, giữ giá trị cũ ở server; lỗi mạng → toast "Chưa lưu được, thử lại" |
| SCR-10.A2 | Tải ảnh lên / chọn avatar có sẵn (3) | Tải lên: client upload Cloud Storage `avatars/{uid}/…` rồi `updateProfile` (body `{photoUrl}`); avatar có sẵn: `updateProfile` (body `{photoUrl: "/avatars/xx.png"}`) | Ảnh mới hiện ngay, đóng sheet; lưu luôn không cần bấm 8 `(Q-050)`; ảnh cũ trong `avatars/` bị xóa (ADR-12) | File sai định dạng / > 5 MB → 6, không upload (kiểm ở client trước, Storage Rules chặn lần nữa); upload lỗi → 6 "Tải ảnh thất bại, thử lại"; `AVATAR_INVALID` → 6 |
| SCR-10.A3 | Khôi phục tên/ảnh Google (9) | `resetProfile` (`POST /me/profile/reset`) | `display_name = google_name`, `photo_url = google_photo_url`, `profile_customized = false`; toast "Đã khôi phục từ Google" | Lỗi → toast "Chưa khôi phục được, thử lại" |
| SCR-10.A4 | Đăng xuất | `deleteCurrentSession` (`DELETE /sessions/current`) + Firebase Auth `signOut` | Ván đang diễn ra: nút khóa + "Không đăng xuất được khi ván đang diễn ra" (`GAME_IN_PROGRESS`). Ván chờ: player → dialog "Đăng xuất sẽ rời phòng {tên}"; host → dialog "Đăng xuất sẽ **đóng phòng** cho mọi người" → SCR-01 (Q-052) | BR-21 |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | Avatar + ô tên skeleton |
| Empty | — |
| Error | 6 cho lỗi nhập; toast cho lỗi mạng |
| Không có quyền | Chưa đăng nhập → SCR-01 |
| Đang upload | 4 hiện trong sheet, khóa nút chọn ảnh khác |

## 5. Ghi chú UX
- Tên/ảnh mới dùng ở mọi phòng; tin chat cũ giữ tên lúc gửi.
- `(Q-050)` SCR-10 vào được từ trong phòng qua SCR-11 vì host không rời phòng được (Q-048) và người đang ở phòng mở app luôn vào SCR-04, nếu không sẽ không bao giờ sửa được hồ sơ trong 8 giờ. Cần bổ sung cạnh điều hướng SCR-11 → SCR-10 vào wireframe.md mục 2–3.
