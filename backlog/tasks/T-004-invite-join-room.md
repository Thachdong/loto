# T-004 · Lời mời & vào phòng (SCR-03)

> ⚠ **Cần cập nhật (2026-11-19, Q-055..Q-058 – đối chiếu specs/actions.md):** `joinRoom` nhận `inviteCode` **hoặc** `roomCode` (lỗi mới `ROOM_CODE_INVALID`); Sheet Mời thêm mã phòng + "Copy mã" (Q-056).

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-03 | M1 | 5 | T-003 | TODO |

## 1. Mục tiêu demo
Sau task này: **host copy link `/join/{code}` ở trang phòng. Người thứ 2 (profile Chrome khác) mở link khi chưa đăng nhập → thấy ảnh/tên host, tên phòng, "Link hết hạn lúc HH:mm" → "Đăng nhập để vào phòng" → đăng nhập xong quay lại đúng link → "Vào phòng" → vào trang phòng. Cả 2 profile thấy "2 người"; Emulator có `member_count = 2`. Mã nguồn HTML của trang link mời có đủ thẻ Open Graph.**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-03.A0 | Tải thông tin lời mời (SSR, công khai) |
| Thao tác | SCR-03.A1 | Vào phòng bằng mã |
| API | `getInvite` | `GET /invites/{inviteCode}`, `x-transport: ssr`: hàm server dùng chung cho `page.tsx` và `generateMetadata`, không phải Server Action → `InvitePreview {status, room, viewer}` |
| API | `joinRoom` → `joinRoomAction` | `POST /rooms/join`, body `{inviteCode}` → `JoinRoomResult {roomId, alreadyMember}` |
| Dữ liệu | TBL-01 `users` | Ghi `current_room_id` |
| Dữ liệu | TBL-02 `rooms` | Server đọc theo `invite_code`; ghi `member_count`, `last_event`, `updated_at` |
| Dữ liệu | RTDB `presence_access/{roomId}/{uid}` | Server ghi `true` |
| Rule | BR-02 | 1 phòng/người |
| Rule | BR-03 | Tối đa 16 người |
| Rule | BR-05 | Link hết hạn cùng phòng |
| Rule | BR-06 | Người bị kick bị chặn |
| Rule | BR-25 | Người tự rời vào lại như mới, không trả vé cũ |
| Rule | BR-04 | Lazy expiry dùng `applyLazyExpiry` của T-003 |
| Phụ trợ | SUP-06 | Open Graph trên `/join/{code}` |
| Phụ trợ | SUP-05 | `returnTo` |
| Phụ trợ | SUP-01 | Ghi `last_event = member_joined`; toast hiển thị làm ở T-006 |
| NFR | NFR-04 | SSR, dùng được ≤ 3 giây |
| NFR | NFR-09 | Mã 22 ký tự base62; kiểm định dạng trước khi truy vấn |
| NFR | NFR-10 | Chỉ lộ tên/ảnh host, tên phòng |
| Flow | FLOW-03 bước 4–13 | Happy path |
| Flow | FLOW-03 A1, A2 | Đã là thành viên; từng tự rời |
| Flow | FLOW-03 E1–E5 | Link hết hạn/đóng; bị kick; ở phòng khác; phòng đầy; hủy đăng nhập |
| ADR | ADR-09, ADR-05 | |

**Ngoài phạm vi:**
- Nút "Mời" / Web Share trong phòng, toast "{tên} đã vào phòng" trên SCR-04 (T-006).
- Vào phòng khi ván đang chạy (FLOW-03 A3): ở task này mọi ván còn `waiting`; chế độ chỉ xem làm ở T-006.
- Kick, ghi `blocked_uids` (T-009). Task này chỉ đọc `blocked_uids` từ seed.
- Rời phòng (T-006). BR-25 kiểm bằng dữ liệu seed.
- RTDB rules cho node `presence` (T-005).

## 3. Việc cần làm
### UI
- [ ] Route `/join/[code]` (SCR-03), server component, không bắt buộc đăng nhập. Gọi `getInvite(code, viewerUid | null)`.
  - `viewer.inThisRoom = true` → `redirect('/room')` (FLOW-03 A1).
  - Hiện header chỉ có logo, ảnh host 80px (2), "{hostName} mời bạn chơi lô tô" (3), tên phòng (4), "Link hết hạn lúc HH:mm" (5) theo GMT+7. Không hiện số người (Q-049). `[ASSUMED]` Hạn rơi vào ngày khác ngày hiện tại (GMT+7) → "Link hết hạn lúc HH:mm dd/MM".
  - Nút chính (6): đã đăng nhập → "Vào phòng"; chưa đăng nhập → "Đăng nhập để vào phòng" dẫn tới `/login?returnTo=/join/{code}`.
- [ ] Khung lỗi (7), cùng bố cục với icon, tiêu đề, mô tả, nút "Về trang chủ" (đã đăng nhập → `/`, chưa → `/login`):
  - `INVITE_INVALID` / mã sai định dạng / `status ∈ {expired, closed}` → "Link không còn hiệu lực".
  - `status = full` → "Phòng đã đầy".
  - `viewer.blocked = true` → "Bạn không thể vào phòng này".
  - Lỗi đọc dữ liệu → "Không tải được lời mời" + nút "Thử lại" (tải lại trang).
- [ ] Dialog (8), hiện khi `viewer.currentRoomId` là phòng khác (FLOW-03 E3), hoặc khi `joinRoomAction` trả `ALREADY_IN_ROOM`:
  - Nội dung: "Bạn đang ở "{tên phòng hiện tại}". Mỗi người chỉ ở 1 phòng — hãy rời phòng đó trước."
  - Tên phòng hiện tại: client đọc `rooms/{currentRoomId}.name` bằng Firestore (rules cho phép vì đang là thành viên).
  - Nút "Đóng" và "Về phòng hiện tại" → `/room`.
- [ ] SCR-03.A1, khi bấm "Vào phòng":
  - Nút hiện "Đang vào phòng…" và bị khóa, gọi `joinRoomAction({inviteCode})`.
  - Thành công (kể cả `alreadyMember`) → `router.push('/room')`.
  - `INVITE_INVALID` / `INVITE_EXPIRED` / `ROOM_FULL` / `BLOCKED_FROM_ROOM` → khung (7) tương ứng.
  - `ALREADY_IN_ROOM` → dialog (8).
  - `UNAUTHENTICATED` → `/login?returnTo=/join/{code}`.
  - Lỗi khác → toast "Không vào được phòng, thử lại".
- [ ] `generateMetadata`:
  - `metadataBase = NEXT_PUBLIC_APP_URL`.
  - Mã hợp lệ: `og:title` / `<title>` "{hostName} mời bạn chơi lô tô", `og:description` = tên phòng, `og:image` = `/og/invite.png` (ảnh chung 1200×630 có sẵn trong `public/`), `og:url`, `og:type = website`, `og:locale = vi_VN`, `twitter:card = summary_large_image`.
  - Mã không tồn tại/hết hạn: title "Lô Tô Online", không có tên phòng. `[ASSUMED]`
- [ ] Trang phòng tối thiểu `/room` (của T-003) đã nghe `rooms/{id}` realtime nên tự hiện "2 người". Không cần sửa.

### API / Backend
- [ ] `src/server/invites/getInvite.ts`: `getInvite(code, viewerUid?) → InvitePreview`. Hàm đọc thuần, không ghi DB.
  - `code` không khớp `^[0-9A-Za-z]{22}$` → `INVITE_INVALID`, không truy vấn DB (NFR-09).
  - Query `rooms where invite_code == code limit 1`. Không có → `INVITE_INVALID` (404).
  - Tính `status`: `closed` nếu `rooms.status = closed`; `expired` nếu `status = closing` hoặc `now ≥ invite_expires_at`; `full` nếu `member_count ≥ 16`; còn lại `valid`.
  - `room`: `{name, hostName, hostPhotoUrl, memberCount, maxMembers: 16, expiresAt: invite_expires_at}`. Tên/ảnh host đọc từ `users/{host_uid}` (`display_name`, `photo_url`). Không trả `host_uid`, email, `invite_code`, `blocked_uids` (NFR-10).
  - Có `viewerUid`: `viewer = {inThisRoom: users.current_room_id == roomId, currentRoomId: users.current_room_id, blocked: viewerUid ∈ blocked_uids}`. Không có → `viewer = null`.
  - Dùng `React.cache` để `page.tsx` và `generateMetadata` chỉ truy vấn 1 lần mỗi request.
  - `[ASSUMED]` Không áp lazy expiry ở đây vì là thao tác đọc, chỉ tính `status` theo giờ server.
- [ ] `joinRoomAction({inviteCode})` (`auth: 'required'`). Zod `JoinRoomRequest`: `inviteCode` khớp regex 22 base62, không có field lạ → sai thì `VALIDATION_FAILED`.
  - Transaction, đúng thứ tự trong api-contract:
    1. Query phòng theo `invite_code`. Không có → `INVITE_INVALID` (404).
    2. `users.current_room_id == roomId` → trả `{roomId, alreadyMember: true}`, không ghi gì (FLOW-03 A1).
    3. `rooms.status = active` mà `now ≥ expires_at` → `applyLazyExpiry` (T-003). Sau đó, nếu `status ≠ active` hoặc `now ≥ invite_expires_at` → `INVITE_EXPIRED` (410) (BR-05, BR-04).
    4. `uid ∈ blocked_uids` → `BLOCKED_FROM_ROOM` (403) (BR-06).
    5. `users.current_room_id` là phòng khác: phòng đó `active` và đã quá `expires_at` → `applyLazyExpiry` cho phòng đó rồi tiếp tục; ngược lại → `ALREADY_IN_ROOM` (409), `details: [{code: 'current_room', currentRoomId}]` (BR-02).
    6. `member_count ≥ 16` → `ROOM_FULL` (409) (BR-03).
  - Hợp lệ:
    - `users.current_room_id = roomId`, `users.last_active_at`.
    - `rooms.member_count += 1`, `rooms.updated_at`.
    - `rooms.last_event = {type: 'member_joined', text: '{display_name} đã vào phòng', actor_uid: uid, target_uid: null, at: now}`.
    - **Không** tạo/khôi phục doc `players` (BR-25, Q-047).
  - Sau commit: RTDB `presence_access/{roomId}/{uid} = true`. Lỗi chỉ log, cách xử lý như T-003.
  - Trả `{roomId, alreadyMember: false}`.
  - Thứ tự đọc trước, ghi sau trong transaction. 2 người vào cùng lúc khi phòng còn 1 chỗ → chỉ 1 người thành công (BR-03).
  - `[ASSUMED]` Lỗi ở bước 3 và 5 ném ra sau khi `applyLazyExpiry` đã ghi, nên phải commit phần đóng phòng trước rồi mới trả lỗi. Cách làm: transaction trả về kết quả dạng `{error}` thay vì ném lỗi; action đổi thành `AppError` sau commit.

### Data
- [ ] Không thêm collection/field. Index `rooms.invite_code` là single tự có.
- [ ] `public/og/invite.png` (ảnh chung 1200×630, logo + chữ "Lô Tô Online").
- [ ] Seed scenario `t004`. Mọi phòng tạo bằng `seedRoom` của T-003, mã mời cố định, dễ đọc:
  - `u_host` (`host@example.com`, "An Nguyễn"): host phòng `r_ok` "Lô tô Tết nhà Ngoại", `member_count = 1`, mã `OKOKOKOKOKOKOKOKOKOKOK`.
  - `r_late`: `invite_expires_at = expires_at` = 1 phút trước, `status = active`, ván `waiting`, mã `LATELATELATELATELATE00`.
  - `r_closed`: `status = closed`, mã `CLOSEDCLOSEDCLOSED0000`.
  - `r_full`: `member_count = 16`, mã `FULLFULLFULLFULLFULL00`.
  - `r_block`: `blocked_uids = [u_khoa]`, mã `BLOCKBLOCKBLOCKBLOCK00`.
  - `u_khoa` (`khoa@example.com`): bị chặn ở `r_block`.
  - `u_lan` (`lan@example.com`): đang ở phòng `r_other` "Phòng của Lan", còn hạn.
  - `u_minh` (`minh@example.com`): từng tự rời `r_ok`. `current_room_id = null`, không có trong `blocked_uids`.
  - Người mới `binh@example.com`: không seed, dùng "Add new account".
  - Script in ra 5 URL `/join/…` để AI copy.

### Khác
- [ ] Chữ mới thêm vào `vi.ts`.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | Profile P2 chưa đăng nhập; mã `r_ok` hợp lệ | Mở `/join/{code r_ok}` | Thấy ảnh host, "An Nguyễn mời bạn chơi lô tô", "Lô tô Tết nhà Ngoại", "Link hết hạn lúc HH:mm" (đúng giờ GMT+7 của `invite_expires_at`), nút "Đăng nhập để vào phòng"; không có số người trong phòng | FLOW-03 bước 4–5, SCR-03 §2, Q-049, NFR-16 |
| AC-2 | Như AC-1 | Bấm "Đăng nhập để vào phòng", đăng nhập tài khoản mới "Bình" | Ở `/login` thấy banner lời mời; đăng nhập xong quay về đúng `/join/{code}`, giờ nút là "Vào phòng" | FLOW-03 bước 6, SUP-05 |
| AC-3 | P2 đã đăng nhập, không ở phòng nào, ở `/join/{code r_ok}` | Bấm "Vào phòng" | Nút hiện "Đang vào phòng…" và bị khóa → tới `/room` thấy "Lô tô Tết nhà Ngoại", "2 người" | FLOW-03 bước 7–12 |
| AC-4 | Sau AC-3 | Xem Emulator UI | `users/{Bình}.current_room_id = r_ok`; `rooms/r_ok.member_count = 2`; `last_event = {type: member_joined, text: "Bình đã vào phòng", actor_uid: uid Bình}`; RTDB `presence_access/r_ok/{uid} = true`; không có doc mới trong `games/*/players` | FLOW-03 bước 12, SUP-01, Q-047 |
| AC-5 | Host (P1) đang mở `/room` của `r_ok` | P2 vào phòng (AC-3) | Trang của host đổi từ "1 người" sang "2 người" trong ≤ 1 giây, không cần tải lại | NFR-02 |
| AC-6 | Bình đã ở `r_ok` | Mở lại `/join/{code r_ok}` | Tự chuyển `/room`, không thấy nút. Gọi `joinRoomAction` → `alreadyMember = true`, `member_count` vẫn là 2 | FLOW-03 A1 |
| AC-7 | `r_late` đã quá `invite_expires_at`/`expires_at`, ván `waiting`, `status = active` | Mở link `r_late`; sau đó (đã đăng nhập) gọi `joinRoomAction` | Trang hiện "Link không còn hiệu lực" + "Về trang chủ". Action trả `INVITE_EXPIRED`; `r_late` được đóng lười: `status = closed`, `close_reason = expired`, ván `cancelled` | FLOW-03 E1, BR-05, BR-04 |
| AC-8 | Phòng `r_closed` (`closed`), hoặc phòng đang `closing` | Mở link | "Link không còn hiệu lực"; `joinRoomAction` → `INVITE_EXPIRED` | FLOW-03 E1, BR-04 |
| AC-9 | Mã 22 ký tự không tồn tại; mã sai định dạng (`/join/abc`) | Mở link; gọi `joinRoomAction` | Cả 2 hiện "Link không còn hiệu lực". Action: không tồn tại → `INVITE_INVALID`, sai định dạng → `VALIDATION_FAILED` | NFR-09, api-contract |
| AC-10 | `u_khoa` nằm trong `r_block.blocked_uids` | Khoa mở link `r_block`; gọi `joinRoomAction` | Trang hiện "Bạn không thể vào phòng này", không có nút "Vào phòng". Action → `BLOCKED_FROM_ROOM`; `member_count` không đổi | FLOW-03 E2, BR-06 |
| AC-11 | `u_lan` đang ở `r_other` còn hạn | Lan mở link `r_ok` | Dialog "Bạn đang ở "Phòng của Lan". Mỗi người chỉ ở 1 phòng — hãy rời phòng đó trước." có nút "Đóng" và "Về phòng hiện tại"; bấm "Về phòng hiện tại" → `/room` của `r_other`. `joinRoomAction` → `ALREADY_IN_ROOM`, `details[0].currentRoomId = r_other` | FLOW-03 E3, BR-02 |
| AC-12 | User đang ở phòng X đã quá `expires_at` (ván `waiting`) | Gọi `joinRoomAction` với mã `r_ok` | Phòng X bị đóng lười (`closed`/`expired`); user vào `r_ok` thành công | BR-04, ADR-05 |
| AC-13 | `r_full` có `member_count = 16` | Mở link; gọi `joinRoomAction` | Trang hiện "Phòng đã đầy"; action → `ROOM_FULL` | FLOW-03 E4, BR-03 |
| AC-14 | Phòng có `member_count = 15`, 2 user khác nhau | Cùng lúc gọi `joinRoomAction` | Đúng 1 người thành công, người kia nhận `ROOM_FULL`; `member_count = 16` | BR-03 |
| AC-15 | `u_minh` từng tự rời `r_ok`, không bị chặn | Minh mở link, bấm "Vào phòng" | Vào thành công như người mới; không có doc `players` nào của Minh được tạo/khôi phục | FLOW-03 A2, BR-25 |
| AC-16 | Bất kỳ mã hợp lệ | Lấy HTML của `/join/{code}` không kèm cookie (`curl -A "facebookexternalhit/1.1"`, hoặc `view-source:` trên Chrome đã xóa cookie) | Có `<meta property="og:title" content="An Nguyễn mời bạn chơi lô tô">`, `og:description` = tên phòng, `og:image` là URL tuyệt đối tới `/og/invite.png`, `og:url`. HTML không chứa email, `host_uid`, `blocked_uids` | SUP-06, ADR-09, NFR-10 |
| AC-17 | Mã hợp lệ | Lấy HTML ban đầu của trang | HTML đã chứa sẵn tên phòng và tên host (SSR, không phải chờ JS). Bản `npm run build && npm start` trên local: `performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd` ≤ 3000 ms | NFR-04 (đo tham khảo trên local) |
| AC-18 | Hàm `getInvite` trả kết quả | So với schema `InvitePreview` | Đúng các key `status`, `room{name, hostName, hostPhotoUrl, memberCount, maxMembers, expiresAt}`, `viewer`; `viewer = null` khi không có cookie | api-contract › InvitePreview, NFR-10 |
| AC-19 | Cookie `__session` hết hạn hoặc bị thu hồi khi đang ở trang mời | Bấm "Vào phòng" | Chuyển `/login?returnTo=/join/{code}` | SCR-03.A1, SUP-05 |
| AC-20 | Ở `/login?returnTo=/join/{code}` từ trang mời | Đóng popup Google không chọn tài khoản | Hiện "Đăng nhập không thành công, thử lại."; banner lời mời vẫn còn; đăng nhập lại thì về đúng link | FLOW-03 E5 |
| AC-21 | Firestore lỗi khi render (mock) | Mở trang mời | Hiện "Không tải được lời mời" + nút "Thử lại" | SCR-03.A0 lỗi |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| `getInvite`: `r_ok` → `valid`, đủ field `room`, không có key nhạy cảm; không cookie → `viewer = null` | AC-1, AC-18 |
| `getInvite`: quá `invite_expires_at` → `expired`; `closing` → `expired`; `closed` → `closed`; 16 người → `full`; mã không tồn tại → `INVITE_INVALID`; mã sai định dạng → `INVITE_INVALID` và không truy vấn DB (spy) | AC-7, AC-8, AC-9, AC-13 |
| `getInvite` có viewer: thành viên → `inThisRoom`; bị chặn → `blocked`; ở phòng khác → `currentRoomId` | AC-6, AC-10, AC-11 |
| `getInvite` không ghi DB (đếm số lần ghi = 0) | AC-7 |
| `joinRoomAction` happy: `current_room_id`, `member_count + 1`, `last_event.member_joined`, `presence_access`, không có `players` | AC-3, AC-4 |
| `joinRoomAction`: đã là thành viên → `alreadyMember: true`, không ghi | AC-6 |
| `joinRoomAction`: phòng quá hạn + `waiting` → `INVITE_EXPIRED` và phòng đã `closed` sau lệnh gọi (kiểm commit) | AC-7 |
| `joinRoomAction`: `closed` / `closing` → `INVITE_EXPIRED` | AC-8 |
| `joinRoomAction`: mã không tồn tại → `INVITE_INVALID`; mã sai định dạng / field thừa → `VALIDATION_FAILED` | AC-9 |
| `joinRoomAction`: bị chặn → `BLOCKED_FROM_ROOM` (kiểm trước `ALREADY_IN_ROOM` theo đúng thứ tự contract) | AC-10 |
| `joinRoomAction`: ở phòng khác còn hạn → `ALREADY_IN_ROOM` + `currentRoomId`; phòng cũ quá hạn → đóng lười rồi vào được | AC-11, AC-12 |
| `joinRoomAction`: 16 người → `ROOM_FULL`; 2 lệnh song song khi còn 1 chỗ → đúng 1 thành công | AC-13, AC-14 |
| `joinRoomAction`: user từng có doc `players` ở ván cũ (đã xóa khi rời) → vào thành công, không tạo `players` | AC-15 |
| `joinRoomAction` không cookie → `UNAUTHENTICATED` | AC-19 |
| `generateMetadata` (gọi trực tiếp): đúng `og:title`, `og:description`, `og:image` tuyệt đối; mã lỗi → title "Lô Tô Online" | AC-16 |
| Component `JoinScreen`: map từng mã lỗi của `joinRoomAction` → khung (7) / dialog (8) / chuyển `/login`; trạng thái "Đang vào phòng…"; lỗi tải → "Không tải được lời mời" | AC-3, AC-10, AC-11, AC-13, AC-19, AC-21 |

### Kịch bản test trên Chrome (AI chạy)
Tiền điều kiện: `npm run seed -- reset && npm run seed -- t004`, ghi lại 5 URL script in ra. Viewport 375×812.

| Profile | Đăng nhập bằng | Vai trò |
|---|---|---|
| P1 | `host@example.com` | Host "An Nguyễn" của `r_ok` |
| P2 | (chưa đăng nhập) | Khách mới |
| P3 | Lần lượt `khoa@`, `lan@`, `minh@` | Trường hợp lỗi và BR-25; clear site data giữa các lượt |

| Bước | Profile | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|---|
| 1 | P1 | Đăng nhập → `/room` của `r_ok`, bấm "Copy link" | Thấy "1 người"; link có dạng `http://localhost:3000/join/OKOK…` | Demo |
| 2 | P2 | Mở link vừa copy | Thấy ảnh host, "An Nguyễn mời bạn chơi lô tô", "Lô tô Tết nhà Ngoại", "Link hết hạn lúc HH:mm" (so khớp với `invite_expires_at` trên Emulator UI, đổi sang GMT+7), nút "Đăng nhập để vào phòng"; không có số người | AC-1 |
| 3 | P2 | Mở `view-source:` của chính URL đó | Có `og:title` "An Nguyễn mời bạn chơi lô tô", `og:description` "Lô tô Tết nhà Ngoại", `og:image` `http://localhost:3000/og/invite.png`; tìm `host@example.com` trong mã nguồn không thấy | AC-16 |
| 4 | P2 | Bấm "Đăng nhập để vào phòng" | URL `/login?returnTo=/join/OKOK…`, có banner lời mời | AC-2 |
| 5 | P2 | Mở popup Google rồi đóng không chọn tài khoản | "Đăng nhập không thành công, thử lại."; banner vẫn còn | AC-20 |
| 6 | P2 | Đăng nhập, "Add new account" `binh@example.com` tên "Bình" | Quay về `/join/OKOK…`, nút "Vào phòng" | AC-2 |
| 7 | P2 | Bấm "Vào phòng" | Nút "Đang vào phòng…" bị khóa → `/room` thấy "Lô tô Tết nhà Ngoại", "2 người" | AC-3 |
| 8 | P1 | Nhìn trang `/room` của host (không tải lại) | Đổi sang "2 người" trong ≤ 1 giây | AC-5 |
| 9 | P1 | Emulator UI: `rooms/r_ok`, `users/{Bình}`, RTDB `presence_access/r_ok`, `games/*/players` | `member_count = 2`; `last_event.type = member_joined`, text "Bình đã vào phòng"; `current_room_id = r_ok`; `presence_access/r_ok/{uid Bình} = true`; không có doc `players` | AC-4 |
| 10 | P2 | Mở lại link `r_ok` | Tự chuyển `/room`, không thấy trang mời | AC-6 |
| 11 | P2 | Mở link `r_late` | "Link không còn hiệu lực" + "Về trang chủ" | AC-7 |
| 12 | P2 | Mở link `r_closed`; mở `/join/abc`; mở `/join/` + 22 ký tự `Z` | Cả 3 hiện "Link không còn hiệu lực" | AC-8, AC-9 |
| 13 | P2 | Bấm "Về trang chủ" | Về `/`, bị chuyển `/room` vì Bình đang ở `r_ok` | AC-7 |
| 14 | P3 | Đăng nhập `khoa@example.com`, mở link `r_block` | "Bạn không thể vào phòng này", không có nút "Vào phòng" | AC-10 |
| 15 | P3 | Clear site data, đăng nhập `lan@example.com`, mở link `r_ok` | Dialog "Bạn đang ở "Phòng của Lan". Mỗi người chỉ ở 1 phòng — hãy rời phòng đó trước." | AC-11 |
| 16 | P3 | Bấm "Về phòng hiện tại" | `/room` hiện "Phòng của Lan" | AC-11 |
| 17 | P3 | Clear site data, mở link `r_full` khi chưa đăng nhập | "Phòng đã đầy" | AC-13 |
| 18 | P3 | Đăng nhập `minh@example.com`, mở link `r_ok`, bấm "Vào phòng" | Vào `/room`, "3 người"; Emulator không có doc `players` của Minh | AC-15 |
| 19 | P3 | Ở terminal: `curl -s -A "facebookexternalhit/1.1" http://localhost:3000/join/OKOK… \| grep og:` | In ra đủ thẻ `og:title`, `og:description`, `og:image`, `og:url` | AC-16 |
| 20 | P1 | Chạy `npm run build && npm start` (cổng 3000, emulator vẫn chạy), mở link `r_ok` ở P2, chạy trong console: `performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd` | Giá trị ≤ 3000; tên phòng có trong HTML ban đầu (`view-source`) | AC-17 |

AC-12, AC-14, AC-18, AC-19, AC-21 được phủ bằng test tự động. AC-7 (đóng lười khi gọi `joinRoom`) được phủ bằng integration test, vì trang mời hiện lỗi ngay mà không cho bấm "Vào phòng".

### Dữ liệu seed / tiền điều kiện
- Scenario `t004` như mục 3 › Data. Mã mời cố định dễ đọc để kịch bản lặp lại được.
- `NEXT_PUBLIC_APP_URL=http://localhost:3000` để URL `og:image` tuyệt đối đúng.

### Test tay
Đã gộp vào kịch bản Chrome. Không kiểm được thẻ xem trước trên Zalo/Messenger thật vì chỉ chạy local (Q-053). Bước 3 và 19 kiểm thẻ meta thay cho việc đó.

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] Test song song `ROOM_FULL` pass ổn định (chạy 5 lần liên tiếp)
- [ ] `getInvite` không trả dữ liệu ngoài schema `InvitePreview` (test so key)
- [ ] Thứ tự kiểm lỗi của `joinRoom` đúng 6 bước trong api-contract

## 7. Ghi chú
- `[ASSUMED]` `getInvite` không ghi DB (không đóng lười), chỉ tính `status` theo giờ server. Đóng lười xảy ra khi gọi `joinRoom` hoặc các action sau.
- `[ASSUMED]` Khi `joinRoom` phải đóng lười phòng rồi mới trả `INVITE_EXPIRED`, transaction trả kết quả có lỗi thay vì ném, để phần đóng phòng vẫn được commit.
- `[ASSUMED]` Mã sai định dạng: trang mời hiện "Link không còn hiệu lực" (không truy vấn DB); `joinRoomAction` trả `VALIDATION_FAILED` theo Zod của `JoinRoomRequest`.
- `[ASSUMED]` Hạn link khác ngày → thêm "dd/MM" sau giờ.
- `[ASSUMED]` Metadata khi mã lỗi: title "Lô Tô Online", không lộ tên phòng.
- Lệch spec, đã theo api-contract (nguồn chuẩn):
  - `scr-03-join.md` mô tả `viewer ∈ none/member/blocked/in_other_room` + `currentRoomName` và `status not_found`. Api-contract dùng `viewer {inThisRoom, currentRoomId, blocked}` và 404 `INVITE_INVALID`.
  - Tên phòng hiện tại trong dialog (8) do client đọc qua Firestore.
- `scr-03` ghi `INVITE_EXPIRED` hai lần ở cột lỗi của A1. Hiểu là `INVITE_INVALID` / `INVITE_EXPIRED`.
- Toast "{tên} đã vào phòng" (SUP-01) chỉ hiển thị khi T-006 dựng SCR-04. Task này chỉ ghi `last_event`.
- NFR-04 đo trên local nên chỉ để tham khảo. Đo thật trên 4G cần môi trường deploy, ngoài phạm vi (Q-053).
- Point: giữ 5.
