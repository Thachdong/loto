# SCR-01 Đăng nhập

- **Actor:** ACT-04 (khách mở link mời), ACT-01 (người dùng mở app khi chưa có phiên)
- **BIZ thể hiện:** BIZ-01 — mọi người chơi cần một danh tính Google (BR-01) trước khi tạo hoặc vào phòng; màn còn gỡ rào cản lớn nhất của hành trình mời qua Zalo/Messenger: trình duyệt trong ứng dụng chat chặn đăng nhập Google (NFR-13).
- **FLOW:** FLOW-01 (bước 1–8, A1, E1, E2); FLOW-03 bước 6 (đăng nhập giữa hành trình mời)
- **Đến từ:** (mở app chưa đăng nhập), SCR-03 (bấm "Đăng nhập để vào phòng", giữ `returnTo`) · **Đi tới:** SCR-03 (có `returnTo`), SCR-04 (`users.current_room_id` ≠ null), SCR-02 (còn lại)
- **Wireframe:** [drawio](./drawio/scr-01-login.drawio) — 2 trang: *Đăng nhập (từ link mời, lỗi)*, *Trình duyệt trong ứng dụng chat*. Chưa export PNG.

## 1. Layout
Màn đơn, không header. Khối giữa: logo + tên app + câu giới thiệu → banner lời mời (chỉ khi có `returnTo`) → nút Google full width (343px, cao 48) → dòng lỗi (khi có). Chân màn: câu về dữ liệu được dùng. Khi phát hiện trình duyệt trong ứng dụng chat (user-agent Zalo, FBAN/FBAV/Messenger, Telegram, Instagram, Line – ADR-07), thay khối giữa bằng hướng dẫn "Mở bằng trình duyệt".

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Logo + "Lô Tô Online" + câu giới thiệu | image + text | Tĩnh | — |
| 2 | Banner lời mời | banner | "Bạn được mời vào một phòng lô tô. Đăng nhập để vào phòng." — chỉ hiện khi URL có `returnTo=/join/{code}`. Không gọi server nên không hiện tên phòng `(Q-050)` | — |
| 3 | Nút "Đăng nhập với Google" | button chính | Redirect Google trên điện thoại, popup trên máy tính (ADR-07). Trong lúc chờ redirect về: nút chuyển "Đang đăng nhập…" + spinner, khóa bấm | BR-01: cách đăng nhập duy nhất |
| 4 | Dòng lỗi | inline alert | "Đăng nhập không thành công, thử lại." (FLOW-01 E1) | — |
| 5 | Ghi chú dữ liệu | text nhỏ | "Chúng tôi chỉ dùng tên, ảnh đại diện và email Google của bạn." `(Q-050)` (NFR-10) | — |
| 6 | Hướng dẫn mở trình duyệt | panel | "Ứng dụng này không cho đăng nhập Google" + 2 bước: bấm ⋯ → "Mở bằng trình duyệt" | NFR-13 |
| 7 | Nút "Mở bằng Chrome" | button chính | Chỉ Android: mở `intent://…#Intent;scheme=https;package=com.android.chrome;end` với URL hiện tại (giữ `returnTo`) | — |
| 8 | Nút "Copy link" | button phụ | Copy URL hiện tại (giữ `returnTo`) → toast "Đã copy link" | — |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-01.A1 | Đăng nhập với Google, tạo phiên (3) | Firebase Auth `signInWithRedirect` / `signInWithPopup` (client) → `createSession` (`POST /sessions`, body `{idToken}`) | Server tạo/cập nhật `users/{uid}` (lần đầu lấy tên, ảnh, email Google; `profile_customized = true` thì không ghi đè – FLOW-01 A3), đặt cookie `__session`. Điều hướng: có `returnTo` → SCR-03; `current_room_id` ≠ null → SCR-04; còn lại → SCR-02 | Người dùng hủy / Google lỗi / `createSession` lỗi → hiện 4, ở lại màn (FLOW-01 E1) |
| SCR-01.A2 | Copy link / Mở bằng trình duyệt (7, 8) | client (Clipboard API, Android intent URL) | Toast "Đã copy link"; Android mở Chrome tại cùng URL | Clipboard bị chặn → hiện ô chứa link để người dùng tự chọn và copy `(Q-050)` |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | Đang xử lý kết quả redirect từ Google: nút 3 ở trạng thái "Đang đăng nhập…", khóa bấm |
| Empty | — (màn không có dữ liệu danh sách) |
| Error | 4 dưới nút; nút 3 bấm lại được |
| Không có quyền | — (màn công khai). Đã có phiên hợp lệ khi mở màn → bỏ qua màn, điều hướng như A1 (FLOW-01 A1) |
| Trình duyệt trong ứng dụng chat | Trang 2 của drawio: 6, 7 (chỉ Android), 8; nút 3 ẩn hoặc khóa |

## 5. Ghi chú UX
- `returnTo` chỉ chấp nhận đường dẫn nội bộ dạng `/join/{code}` để tránh open redirect `(Q-050)`.
- Người đang ở phòng mà mở lại app → điều hướng thẳng SCR-04, không dừng ở SCR-02 (wireframe mục 3).
- Đăng xuất ở SCR-02 (SCR-02.A3, khi không ở phòng) và SCR-10 (SCR-10.A4, khi đang ở phòng). Đăng xuất = thoát phòng: player rời phòng, host đóng phòng; khóa khi ván đang diễn ra (Q-052).
