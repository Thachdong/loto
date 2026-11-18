# T-008 · Chat trong phòng (SCR-06)

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-06 | M2 | 3 | T-007 | TODO |

## 1. Mục tiêu demo
Sau task này: **thành viên phòng mở SCR-04 → bấm "Chat" → gõ tin và bấm Gửi → mọi người trong phòng thấy tin ngay (≤ 1 giây) kèm tên, ảnh, giờ; người vào sau thấy tin cũ; gửi tin thứ 6 trong 10 giây thấy "Bạn gửi quá nhanh, thử lại sau vài giây." và nội dung vẫn còn trong ô nhập; tin > 500 ký tự không gửi được.**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-06.A0 | Listener `rooms/{roomId}/messages` orderBy `created_at` limitToLast 50; cuộn lên đầu tải trang cũ hơn 50 tin (Q-050) |
| Thao tác | SCR-06.A1 | Gửi tin (optimistic) |
| API | `sendMessage` → `sendMessageAction({roomId, text})` | |
| Dữ liệu | TBL-04 `messages` | tạo mới |
| Dữ liệu | TBL-01 `users.chat_recent_at` | thêm ghi (≤ 5 mốc) |
| Rule | BR-23 | 1–500 ký tự sau trim, không sửa/xóa, người vào sau xem toàn bộ |
| Phụ trợ | SUP-07 | ≤ 5 tin / 10 giây / người |
| Phụ trợ | SUP-01 | Tin hiện cho cả phòng qua listener (không ghi `last_event`) |
| NFR | NFR-02 | Tin tới mọi người ≤ 1 giây |
| NFR | NFR-16 | Giờ HH:mm GMT+7 |
| Flow | FLOW-12 bước 1–4, A1, A2, E1, E2, E3 | |

**Ngoài phạm vi:** sửa/xóa tin, gửi ảnh (BR-23, BIZ-12 – không làm); cập nhật tên trên tin cũ khi đổi hồ sơ (không làm – tin chép tên lúc gửi); danh sách người trong phòng (T-009).

## 3. Việc cần làm
### UI
- [ ] Sheet SCR-06 mở từ nút "Chat" trên thanh nút dưới SCR-04 (component 16 đã có từ T-006): tiêu đề "Chat" + ✕; vùng sheet nằm giữa header và thanh KINH/thanh nút (KINH vẫn bấm được – FLOW-12 A2).
- [ ] Danh sách tin: bubble trái cho người khác (ảnh `sender_photo_url` — rỗng → chữ cái đầu, `sender_name`, giờ `created_at` HH:mm GMT+7, `text`), bubble phải cho mình; mới nhất ở dưới; mở sheet → cuộn xuống cuối; có tin mới khi đang ở cuối → tự cuộn, đang cuộn lên đọc tin cũ → không tự cuộn `[ASSUMED]`.
- [ ] Phân trang lên: cuộn tới đầu danh sách và còn tin cũ hơn → hiện "Đang tải tin cũ hơn…", query `created_at < mốc` limit 50, giữ vị trí cuộn sau khi chèn.
- [ ] Ô nhập textarea tự giãn tối đa 4 dòng, placeholder "Nhập tin nhắn…"; bộ đếm "{n}/500" hiện khi n ≥ 450, đỏ khi n > 500. Độ dài tính theo code point sau trim (`Array.from(text.trim()).length`) — dùng chung hàm với server `[ASSUMED]` (emoji tính 1 ký tự).
- [ ] Nút "Gửi" khóa khi rỗng sau trim, > 500 ký tự hoặc đang gửi.
- [ ] Bàn phím: thiết bị cảm ứng Enter = xuống dòng; máy tính Enter = gửi, Shift+Enter = xuống dòng (Q-050). Phát hiện bằng `matchMedia('(pointer: coarse)')` `[ASSUMED]`.
- [ ] Optimistic: bấm Gửi → bubble phải mờ + "Đang gửi…", xóa ô nhập; listener trả về tin thật → thay bubble tạm (khớp theo id trả về từ action).
- [ ] Lỗi gửi: `RATE_LIMITED` → bỏ bubble tạm, trả nội dung về ô nhập, hiện dòng lỗi 7 "Bạn gửi quá nhanh, thử lại sau vài giây." (ẩn khi gửi thành công lần sau); `NOT_ROOM_MEMBER` → thay ô nhập + nút bằng thanh 8 "Không thể gửi tin trong phòng này"; lỗi mạng/`INTERNAL_ERROR` → bubble "Gửi thất bại · Gửi lại" (bấm để gửi lại cùng nội dung).
- [ ] Trạng thái: loading 4–5 bubble skeleton; empty "Chưa có tin nhắn. Chào cả phòng một câu nhé!"; lỗi tải "Không tải được tin nhắn" + "Thử lại".
- [ ] Badge số tin chưa đọc trên nút "Chat" (SCR-04 component 16): đếm tin có `created_at` > mốc localStorage `loto.chatSeenAt.{roomId}` và `sender_uid ≠ mình`; mở sheet / nhận tin khi sheet đang mở → cập nhật mốc, badge về 0. localStorage lỗi → giữ mốc trong bộ nhớ trang `[ASSUMED]` (badge thuộc SCR-04 nhưng phụ thuộc chat nên làm ở đây).
- [ ] Bàn phím ảo mở: sheet co theo `visualViewport`, ô nhập nằm ngay trên bàn phím (Q-050).

### API / Backend
- [ ] `sendMessageAction({roomId, text})` theo api-contract `sendMessage`: xác thực phiên (`UNAUTHENTICATED`) → Zod (`roomId` string, `text` string; sai kiểu → `VALIDATION_FAILED`) → trim → rỗng → `422 MESSAGE_EMPTY`, > 500 code point → `422 MESSAGE_TOO_LONG` `[ASSUMED]` (độ dài kiểm sau trim ở lớp nghiệp vụ để trả đúng mã 422 trong bảng lỗi, Zod chỉ kiểm kiểu).
- [ ] Transaction Firestore: lazy expiry (BR-04, hàm chung từ T-006) → `users.current_room_id ≠ roomId` hoặc phòng `closed` → `403 NOT_ROOM_MEMBER`.
- [ ] Rate limit (SUP-07) trong cùng transaction: đọc `users.chat_recent_at`, lọc mốc trong 10 giây gần nhất (giờ server); đã đủ 5 → `429 RATE_LIMITED`, không ghi gì; ngược lại thêm `now`, giữ tối đa 5 mốc mới nhất.
- [ ] Tạo `messages/{autoId}`: `sender_uid`, `sender_name` = `users.display_name`, `sender_photo_url` = `users.photo_url` (chép lúc gửi), `text` (đã trim), `created_at` = server timestamp, `expire_at` = `rooms.created_at + 31 ngày` (NFR-11). Không ghi `rooms.last_event`.
- [ ] Trả `201 Message` (`id`, `senderUid`, `senderName`, `senderPhotoUrl`, `text`, `createdAt`) qua `ActionResult`.
- [ ] Hàm thuần `checkChatRate(recent: Date[], now: Date) → {allowed, nextRecent}` và `normalizeMessage(text) → {ok, text | code}` ở lớp domain, dùng chung client/server.

### Data
- [ ] `firestore.rules`: `rooms/{roomId}/messages/{id}` — đọc theo rule cây con phòng (`users/{auth.uid}.current_room_id == roomId`, có từ T-003); **cấm mọi ghi từ client** (create/update/delete).
- [ ] Index: `created_at` single-field (mặc định) đủ cho orderBy + range; không cần composite.
- [ ] Seed: kịch bản `chat-history` — phòng có host + 2 player và 120 tin cũ (để thử phân trang) `[ASSUMED]` tên kịch bản theo script seed của T-001.

### Khác
- [ ] Từ điển tiếng Việt: thêm các chuỗi của SCR-06 vào từ điển chung (NFR-16).

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | A (host) và B (player) cùng ở phòng, sheet Chat của B đang mở | A mở Chat, nhập "Chào cả nhà 😆", bấm Gửi | Bubble của A hiện ngay (mờ "Đang gửi…" rồi bình thường), ô nhập trống; trong ≤ 1 giây B thấy bubble trái có ảnh, tên A, giờ HH:mm GMT+7 và đúng nội dung; Emulator UI có doc `rooms/{roomId}/messages/{id}` với `sender_name`, `text` đã trim, `expire_at` | FLOW-12 bước 1–4, NFR-02, NFR-16 |
| AC-2 | Phòng đã có 120 tin | C vừa vào phòng (qua link mời) mở Chat | Thấy 50 tin mới nhất, cuộn xuống cuối; cuộn lên đầu → "Đang tải tin cũ hơn…" rồi thêm 50 tin; tiếp tục tới khi thấy tin đầu tiên của phòng | FLOW-12 A1, BR-23, SCR-06.A0 |
| AC-3 | Ván đang `running` | Player mở Chat và gửi tin | Gửi thành công như AC-1; thanh KINH vẫn hiện dưới sheet và bấm được | FLOW-12 A2 |
| AC-4 | Ô nhập chỉ có khoảng trắng / rỗng | — | Nút Gửi bị khóa; gọi action trực tiếp với `"   "` → `MESSAGE_EMPTY`, không có doc mới | FLOW-12 E1, BR-23 |
| AC-5 | Ô nhập có 500 ký tự (sau trim) | Bấm Gửi | Gửi thành công; bộ đếm "500/500" không đỏ | BR-23 (biên) |
| AC-6 | Ô nhập có 501 ký tự | — | Bộ đếm "501/500" màu đỏ, nút Gửi khóa; gọi action trực tiếp → `MESSAGE_TOO_LONG`, không có doc mới | FLOW-12 E1, BR-23 (biên) |
| AC-7 | B đã gửi 5 tin trong 10 giây gần nhất | B gửi tin thứ 6 | Hiện "Bạn gửi quá nhanh, thử lại sau vài giây.", nội dung tin thứ 6 vẫn trong ô nhập, không có doc thứ 6; sau khi mốc cũ nhất quá 10 giây, gửi lại thành công và dòng lỗi biến mất | FLOW-12 E2, SUP-07, BR-23 |
| AC-8 | B đã rời phòng / bị kick / phòng đóng nhưng sheet Chat còn mở (hoặc gọi action với `roomId` cũ) | B bấm Gửi | Action trả `NOT_ROOM_MEMBER`; thay ô nhập bằng "Không thể gửi tin trong phòng này"; không có doc mới | FLOW-12 E3, NFR-09 |
| AC-9 | Người không ở phòng (D đăng nhập, `current_room_id` khác) | D đọc `rooms/{roomId}/messages` bằng client SDK; bất kỳ ai ghi trực tiếp vào `messages` | Bị Security Rules từ chối (đọc và ghi) | NFR-09, ADR-03 |
| AC-10 | Phòng chưa có tin | Mở Chat | Hiện "Chưa có tin nhắn. Chào cả phòng một câu nhé!" | SCR-06 Empty |
| AC-11 | Mất mạng khi gửi | Bấm Gửi | Bubble "Gửi thất bại · Gửi lại"; bật mạng, bấm "Gửi lại" → tin gửi thành công (chỉ 1 doc) | SCR-06.A1 lỗi mạng |
| AC-12 | B đóng sheet Chat, A gửi 3 tin | B nhìn SCR-04 | Nút "Chat" của B có badge 3; B mở Chat → badge mất | SCR-06.A0, SCR-04 component 16 |
| AC-13 | A gửi tin, sau đó A đổi tên hiển thị (khi T-011 xong) | B xem lại tin | Tin cũ vẫn hiện tên lúc gửi | SCR-06 ghi chú UX |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| `normalizeMessage`: `""`, `"   "` → EMPTY; `"  hi  "` → `"hi"`; 500 ký tự → ok; 501 → TOO_LONG; 499 ký tự + 1 emoji → ok (đếm code point) | AC-4, AC-5, AC-6 |
| `checkChatRate`: 4 mốc trong 10 giây → allowed, giữ ≤ 5; 5 mốc trong 10 giây → denied; 5 mốc với mốc cũ nhất 10,001 giây trước → allowed | AC-7 |
| `sendMessageAction` (emulator): thành viên gửi → doc đúng field (`sender_*` chép từ users, `expire_at`), `chat_recent_at` thêm mốc, trả `Message` | AC-1 |
| `sendMessageAction`: gửi 6 lần liên tiếp → lần 6 `RATE_LIMITED`, chỉ 5 doc | AC-7 |
| `sendMessageAction`: không phải thành viên / phòng `closed` / chưa đăng nhập → `NOT_ROOM_MEMBER` / `NOT_ROOM_MEMBER` / `UNAUTHENTICATED` | AC-8 |
| `sendMessageAction`: text rỗng sau trim / 501 ký tự → `MESSAGE_EMPTY` / `MESSAGE_TOO_LONG`; `text` là số → `VALIDATION_FAILED` | AC-4, AC-6 |
| Rules (`@firebase/rules-unit-testing`): thành viên đọc được `messages`; người ngoài bị từ chối; mọi `create/update/delete` từ client bị từ chối | AC-9 |

### Kịch bản test trên Chrome (AI chạy)
Môi trường: `npm run dev` + Firebase Emulator, `http://localhost:3000`, viewport 375×812. Profile Chrome: **P1 = Host An**, **P2 = Bình**, **P3 = Chi** (tài khoản Google giả của Auth Emulator).

| Bước | Profile | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|---|
| 1 | P1 | Seed `room-basic` (host An, Bình đã ở phòng); mở `/room`, bấm "Chat" | Sheet Chat hiện "Chưa có tin nhắn. Chào cả phòng một câu nhé!" | AC-10 |
| 2 | P2 | Mở `/room`, bấm "Chat" | Cùng empty state | AC-10 |
| 3 | P1 | Nhập "  Chào cả nhà 😆  ", bấm Gửi | Bubble phải "Chào cả nhà 😆" (không còn khoảng trắng đầu/cuối), ô nhập trống | AC-1 |
| 4 | P2 | Quan sát | ≤ 1 giây thấy bubble trái: ảnh/chữ cái đầu, "Host An", giờ HH:mm đúng giờ VN | AC-1 |
| 5 | Emulator UI | Mở Firestore `rooms/{id}/messages` | Có 1 doc, `text` đã trim, `sender_name = Host An`, có `expire_at` | AC-1 |
| 6 | P2 | Đóng sheet; P1 gửi thêm 3 tin | Nút "Chat" của P2 có badge "3"; P2 mở Chat → badge mất | AC-12 |
| 7 | P1 | Host bấm "Bắt đầu" ván (đã có người lấy vé); P2 mở Chat và gửi "Sắp kinh rồi" | Gửi thành công; thanh KINH vẫn hiện dưới sheet | AC-3 |
| 8 | P2 | Ô nhập chỉ gõ 3 dấu cách | Nút Gửi bị khóa | AC-4 |
| 9 | P2 | Dán chuỗi 500 ký tự | Bộ đếm "500/500" (không đỏ), Gửi được; tin hiện cho P1 | AC-5 |
| 10 | P2 | Dán chuỗi 501 ký tự | Bộ đếm "501/500" màu đỏ, nút Gửi khóa | AC-6 |
| 11 | P2 | Gửi nhanh 6 tin ngắn "1".."6" trong < 10 giây | Tin 1–5 hiện; sau tin 6 hiện dòng đỏ "Bạn gửi quá nhanh, thử lại sau vài giây.", ô nhập vẫn chứa "6"; P1 chỉ thấy 5 tin | AC-7 |
| 12 | P2 | Chờ ~10 giây, bấm Gửi | "6" gửi được, dòng lỗi biến mất | AC-7 |
| 13 | P2 | DevTools → Network Offline, gửi "mất mạng" | Bubble "Gửi thất bại · Gửi lại"; bật lại mạng, bấm "Gửi lại" → tin gửi thành công, P1 thấy đúng 1 tin | AC-11 |
| 14 | — | Seed `chat-history` (120 tin); P3 vào phòng bằng link mời, mở Chat | Thấy 50 tin cuối; cuộn lên đầu → "Đang tải tin cũ hơn…", thêm tin cũ; cuộn tiếp tới tin số 1 | AC-2 |
| 15 | P2 | Ván chờ: P2 mở sheet Chat; ở P2 tab khác bấm "Rời" phòng (hoặc P1 kick P2 khi T-009 xong); quay lại tab cũ bấm Gửi | Hiện "Không thể gửi tin trong phòng này"; không có doc mới | AC-8 |
| 16 | P1 | Viewport 375×812, chạm ô nhập (bật giả lập bàn phím ảo nếu được) | Ô nhập + nút Gửi vẫn thấy, danh sách cuộn được | SCR-06 ghi chú UX |

AC-9 phủ bằng rules test; AC-13 kiểm lại trong kịch bản Chrome của T-011.

### Dữ liệu seed / tiền điều kiện
- Auth Emulator: 3 tài khoản Host An, Bình, Chi (từ seed T-001/T-002).
- Seed `room-basic`: phòng `active`, ván 1 `waiting`, Bình đã vào phòng và giữ 1 vé.
- Seed `chat-history`: như `room-basic` + 120 tin cách nhau 1 phút `[ASSUMED]`.

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] Rules test: client không ghi được `messages`, người ngoài phòng không đọc được
- [ ] Hàm `normalizeMessage`, `checkChatRate` dùng chung client/server, có unit test biên 500/501 và 5/6 tin
- [ ] Smoke lại kịch bản chính T-006/T-007 (KINH vẫn bấm được khi sheet Chat mở)

## 7. Ghi chú
- `[ASSUMED]` Độ dài tin đếm theo code point (emoji = 1 ký tự), cùng hàm ở client và server.
- `[ASSUMED]` Rỗng/quá dài trả `422 MESSAGE_EMPTY` / `MESSAGE_TOO_LONG` (bảng mã lỗi), Zod chỉ kiểm kiểu; SCR-06 ghi `VALIDATION_FAILED` — UI không phân biệt vì nút Gửi đã khóa.
- `[ASSUMED]` Badge chưa đọc trên nút "Chat" của SCR-04 làm trong task này (phụ thuộc dữ liệu chat).
- `[ASSUMED]` Tự cuộn xuống khi có tin mới chỉ khi đang ở cuối danh sách.
- Đề xuất point: checklist gồm listener + phân trang ngược + optimistic/gửi lại + rate limit transaction + badge + rules test → sát **5** hơn 3. Giữ 3 theo slices.md, đề xuất nâng lên 5.
