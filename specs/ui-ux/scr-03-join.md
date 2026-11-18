# SCR-03 Lời mời vào phòng (`/join/{code}`)

- **Actor:** ACT-04 (khách chưa đăng nhập), ACT-01 (người dùng đã đăng nhập)
- **BIZ thể hiện:** BIZ-03 — phòng chỉ vào được bằng link mời (Q-022). Màn là đích của link host chia sẻ qua Zalo/Messenger/Telegram: cho khách biết ai mời, phòng nào, còn chỗ không, rồi đưa khách vào phòng sau khi kiểm tra mã còn hạn, chưa đầy, không bị chặn, không ở phòng khác (BR-02, BR-03, BR-05, BR-06). Trang render ở server với Open Graph để có thẻ xem trước khi dán link (SUP-06).
- **FLOW:** FLOW-03 (bước 4–13, A1, A2, A3, E1–E5); FLOW-01 bước 7
- **Đến từ:** link mời (ngoài app), SCR-01 (đăng nhập xong, `returnTo`) · **Đi tới:** SCR-04, SCR-01, SCR-02
- **Wireframe:** [drawio](./drawio/scr-03-join.drawio) — 4 trang: *Lời mời hợp lệ (đã đăng nhập)*, *Chưa đăng nhập*, *Link lỗi*, *Đang ở phòng khác*. Chưa export PNG.

## 1. Layout
Header tối giản (chỉ logo, không avatar). Thân căn giữa: ảnh host lớn (80px) → "{host} mời bạn chơi lô tô" → tên phòng → số người + giờ hết hạn → nút chính full width. Lỗi dùng cùng khung: icon, tiêu đề, mô tả, nút "Về trang chủ". Trang SSR có `og:title` "{host} mời bạn chơi lô tô", `og:description` tên phòng, `og:image` ảnh chung (ADR-09).

## 2. Thành phần
| # | Component | Loại | Dữ liệu hiển thị / nhập | Validation (BR) |
|---|---|---|---|---|
| 1 | Logo | header | Tĩnh | — |
| 2 | Ảnh host | avatar 80px | `hostPhotoUrl` từ `getInvite` | — |
| 3 | Lời mời | title | "{hostName} mời bạn chơi lô tô" | — |
| 4 | Tên phòng | text | `rooms.name` | — |
| 5 | Hạn link | text | "Link hết hạn lúc HH:mm" (`invite_expires_at`, GMT+7 – NFR-16). Không hiện số người trong phòng (yêu cầu user) | BR-05 |
| 6 | Nút chính | button chính | Đã đăng nhập: "Vào phòng" → A1. Chưa đăng nhập: "Đăng nhập để vào phòng" → SCR-01 với `returnTo=/join/{code}` | — |
| 7 | Khung lỗi link | error state | Theo `status` của `getInvite` hoặc mã lỗi của `joinRoom`: `INVITE_EXPIRED`/không tồn tại → "Link không còn hiệu lực"; `ROOM_FULL` → "Phòng đã đầy"; `BLOCKED_FROM_ROOM` → "Bạn không thể vào phòng này". Nút "Về trang chủ" (đã đăng nhập → SCR-02; chưa → SCR-01) | BR-05, BR-03, BR-06 |
| 8 | Dialog đang ở phòng khác | dialog | "Bạn đang ở "{tên phòng hiện tại}". Mỗi người chỉ ở 1 phòng — hãy rời phòng đó trước." Nút "Đóng" / "Về phòng hiện tại" → SCR-04 | BR-02 (FLOW-03 E3) |

## 3. Thao tác
| Mã | Thao tác | API (operationId) | Kết quả thành công | Khi lỗi |
|---|---|---|---|---|
| SCR-03.A0 | Tải thông tin lời mời (SSR, công khai) | `getInvite` (`GET /invites/{code}`, không bắt buộc đăng nhập; có cookie `__session` thì trả thêm `viewer {inThisRoom, currentRoomId, blocked}` theo api-contract) | Trả `{roomName, hostName, hostPhotoUrl, memberCount, expiresAt, status}` với `status ∈ valid / expired / closed / full / not_found`; có phiên thì thêm `viewer ∈ none / member / blocked / in_other_room` + `currentRoomName` `(Q-050)`. `viewer = member` → tự chuyển SCR-04 (FLOW-03 A1) | `status ≠ valid` hoặc `viewer = blocked` → 7; `viewer = in_other_room` → 8; lỗi mạng → khung lỗi "Không tải được lời mời" + "Thử lại" |
| SCR-03.A1 | Vào phòng bằng mã (6) | `joinRoom` (`POST /rooms/join`, body `{code}`) | Server kiểm BR-05, BR-06, BR-02, BR-03 trong transaction → `users.current_room_id`, `rooms.member_count + 1`, `last_event = member_joined` → điều hướng SCR-04 (cả phòng thấy toast "{tên} đã vào phòng") | `INVITE_EXPIRED` / `ROOM_FULL` / `BLOCKED_FROM_ROOM` → 7 tương ứng; `ALREADY_IN_ROOM` → 8; đã là thành viên → coi như thành công, sang SCR-04; 401 → SCR-01 với `returnTo` |

## 4. Trạng thái màn
| Trạng thái | Hiển thị |
|---|---|
| Loading | Trang SSR trả HTML có sẵn dữ liệu (NFR-04 ≤ 3 giây); khi bấm 6: nút "Đang vào phòng…", khóa bấm |
| Empty | — |
| Error | 7 (link hỏng / đầy / bị chặn), 8 (đang ở phòng khác) |
| Không có quyền | Chưa đăng nhập: vẫn xem được 2–5, nút 6 chuyển sang "Đăng nhập để vào phòng" (trang 2 drawio). Bị kick: 7 "Bạn không thể vào phòng này" |
| Đã là thành viên | Tự chuyển SCR-04, không hiện nút |
| Ván đang chạy | Như hợp lệ; vào phòng xong ở chế độ xem tới hết ván (FLOW-03 A3) — xử lý ở SCR-04 |

## 5. Ghi chú UX
- Mở link trong trình duyệt của ứng dụng chat khi chưa đăng nhập: nút 6 đưa tới SCR-01, nơi hiện hướng dẫn "Mở bằng trình duyệt" (NFR-13). Không chặn xem lời mời.
- Người đã tự rời phòng vào lại như thành viên mới, không được trả vé cũ (BR-25) — không cần UI riêng.
- Không lộ dữ liệu cá nhân ngoài tên/ảnh host và tên phòng (ADR-09, NFR-10).
- Thẻ xem trước (Open Graph) dùng ảnh chung, không dùng ảnh host `(Q-050)` theo ADR-09.
