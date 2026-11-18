# Slices (draft) — waterfall theo màn

> Nguồn: `specs/ui-ux/wireframe.md` mục 4, `specs/api-contract.yml`, `specs/database.md`, `idea/business.md`, `idea/business-flows.md` · Quyết định: Q-053 · Cập nhật: 2026-11-19
>
> **Cách chia (Q-053):** 1 dev + AI, làm **tuần tự** (waterfall). **1 task = 1 màn**: task làm trọn UI + Server Action + dữ liệu/rules + test cho mọi thao tác của màn đó. Thêm 2 task không thuộc màn: T-001 nền, T-013 vận hành. Màn lớn (SCR-04) để nguyên 1 task, point > 8 (ngoại lệ được user chấp nhận). Mỗi task chỉ phụ thuộc task trước nó.
>
> **Thứ tự màn** theo hành trình chơi: Đăng nhập → Trang chủ/tạo phòng → Lời mời → Chọn vé → Phòng chơi → Kết quả ván → Chat → Người trong phòng → Lịch sử → Hồ sơ → Cài đặt.

## T-001 · Dựng nền dự án chạy được trên local + emulator
- **Epic / Milestone / Point:** EPIC-00 / M0 / 3
- **Demo:** Dev chạy `npm run dev` + Firebase Emulator → mở `localhost` trên Chrome viewport điện thoại thấy trang chào "Lô Tô Online"; `npm test` và lint/typecheck xanh.
- **Thao tác:** — (nền)
- **operationId:** — (khung `ActionResult<T>`, lớp service, Zod, mã lỗi chung từ api-contract)
- **TBL:** — (khởi tạo `firestore.rules` cấm ghi, `database.rules.json`, `storage.rules`, `firestore.indexes.json` rỗng)
- **BR / SUP / NFR:** NFR-12 (layout mobile-first, cột 480px), NFR-16 (từ điển tiếng Việt, GMT+7)
- **Khác:** Next.js 16 + React 19 + Tailwind + shadcn/ui; Firebase Emulator Suite (Auth, Firestore, RTDB, Storage, Functions); script seed; cấu hình test Vitest; hướng dẫn AI test bằng Chrome (Q-053)
- **Ngoài phạm vi:** đăng nhập (T-002), deploy (không cần – Q-053)
- **Phụ thuộc:** —

## T-002 · SCR-01 Đăng nhập Google
- **Epic / Milestone / Point:** EPIC-01 / M1 / 5
- **Demo:** Người dùng mở app chưa đăng nhập → SCR-01 → "Đăng nhập với Google" (emulator) → tạo `users/{uid}` → về SCR-02. Mở trong UA giả lập Zalo → thấy "Mở bằng trình duyệt" + copy link.
- **Thao tác:** SCR-01.A1, SCR-01.A2
- **operationId:** createSession
- **TBL:** TBL-01 `users` (tạo mới + rules chỉ chủ đọc)
- **BR / SUP / NFR:** BR-01, SUP-05 (session cookie `__session`, `returnTo`), NFR-09, NFR-10, NFR-13
- **FLOW:** FLOW-01 bước 1–8, A1, A3, E1, E2
- **Ngoài phạm vi:** đăng xuất (T-003, T-011); quay lại link mời (T-004 dùng `returnTo`)
- **Phụ thuộc:** T-001

## T-003 · SCR-02 Trang chủ & tạo phòng
- **Epic / Milestone / Point:** EPIC-02 / M1 / 8
- **Demo:** Người dùng đã đăng nhập ở SCR-02 → "Tạo phòng" → vào trang phòng (khung tối thiểu: tên phòng, mã mời) → Firestore có room + ván 1 `waiting` + 16 vé đúng BR-08. Đang ở phòng mở lại app → vào thẳng phòng. Đăng xuất khi không ở phòng → về SCR-01.
- **Thao tác:** SCR-02.A0, SCR-02.A1, SCR-02.A2, SCR-02.A3
- **operationId:** createRoom, deleteCurrentSession (nhánh không ở phòng)
- **TBL:** TBL-02 `rooms`, TBL-03 `tickets`, TBL-05 `games` (tạo mới + rules đọc theo `users.current_room_id`, TTL `expire_at`)
- **BR / SUP / NFR:** BR-02, BR-04 (`expires_at`), BR-05 (`invite_code`), BR-07, BR-08 (hàm `generateTicketSet` – ADR-14), NFR-08, NFR-11
- **FLOW:** FLOW-02 bước 1–7, E1; FLOW-01 bước 6–8
- **Ngoài phạm vi:** nội dung đầy đủ của phòng (T-006); đăng xuất khi ở phòng (T-011)
- **Phụ thuộc:** T-002

## T-004 · SCR-03 Lời mời & vào phòng
- **Epic / Milestone / Point:** EPIC-03 / M1 / 5
- **Demo:** Host copy link `/join/{code}` → người thứ 2 (profile Chrome khác) mở link chưa đăng nhập → thấy tên phòng, host, "Link hết hạn lúc HH:mm" → đăng nhập → quay lại link → "Vào phòng" → vào trang phòng; `member_count = 2`. Dán link vào trình xem Open Graph thấy thẻ xem trước.
- **Thao tác:** SCR-03.A0, SCR-03.A1
- **operationId:** getInvite, joinRoom
- **TBL:** TBL-01, TBL-02 (đọc qua server; ghi `member_count`, `last_event`); RTDB `presence_access`
- **BR / SUP / NFR:** BR-02, BR-03, BR-05, BR-06, BR-25, SUP-06 (Open Graph), NFR-04, NFR-09; lazy expiry (BR-04) dùng chung
- **FLOW:** FLOW-03 bước 4–13, A1, A2, E1–E5
- **Ngoài phạm vi:** nút Mời/chia sẻ trong phòng (T-006)
- **Phụ thuộc:** T-003

## T-005 · SCR-05 Chọn vé
- **Epic / Milestone / Point:** EPIC-04 / M1 / 8
- **Demo:** Trong phòng mở sheet "Vé" → thấy 16 vé thu nhỏ theo màu + người giữ → xem trước vé kiểu vé giấy → "Lấy vé này" (tối đa 2) → người kia thấy realtime; bỏ vé được khi ván chờ. Host "Tạo bộ vé mới" khi còn người giữ → dialog, thu hồi vé người offline → tạo bộ mới.
- **Thao tác:** SCR-05.A0, SCR-05.A1, SCR-05.A2, SCR-05.A3, SCR-05.A4
- **operationId:** takeTicket, releaseTicket, renewTicketSet, reclaimPlayerTickets
- **TBL:** TBL-06 `players` (tạo mới), TBL-03 (ghi đè khi tạo bộ mới), TBL-02 `ticket_set_no`; RTDB TBL-08 `presence` (client ghi online để biết offline)
- **BR / SUP / NFR:** BR-09, BR-10, BR-11, BR-12, BR-13, SUP-04, NFR-02
- **FLOW:** FLOW-05 toàn bộ; FLOW-04 toàn bộ
- **Ngoài phạm vi:** vẽ vé trong màn phòng (T-006)
- **Phụ thuộc:** T-004

## T-006 · SCR-04 Phòng chơi
- **Epic / Milestone / Point:** EPIC-05 / M1 / 21 (màn lớn, giữ 1 task – Q-053)
- **Demo:** Host + 2 player (3 profile Chrome) đã lấy vé → host "Bắt đầu" → server rao ngay số đầu, mọi người nghe rao (sau khi chạm "Bật tiếng") → mỗi N giây host gọi `drawNumber`; tắt tab host → player giữ vé nhỏ nhất rao thay sau 5 giây. Player giữ 2 vé thấy cả 2 vé cùng màn, tự dò chạm ô đánh dấu → bấm KINH → kinh hụt / kinh đúng (chuyển sang SCR-09). Host tạm dừng/tiếp tục; player rời phòng khi ván chờ; tới hạn 8 giờ (giả lập đồng hồ) phòng đóng.
- **Thao tác:** SCR-04.A0 → SCR-04.A11
- **operationId:** startGame, pauseGame, resumeGame, drawNumber, createClaim, leaveRoom, expireRoom
- **TBL:** TBL-02 (`called_numbers`, `last_event`, `status`), TBL-05 (`status`, `next_call_at`, `winners`, `claim_window_ends_at`), TBL-06; RTDB presence (thứ tự dự phòng)
- **BR / SUP / NFR:** BR-04, BR-10, BR-14, BR-15, BR-16, BR-17, BR-18 (mở cửa sổ), BR-19, BR-20, BR-21, BR-22, BR-26; SUP-01 (toast `last_event`), SUP-02 (tiếng rao, manifest), SUP-03 (client điều nhịp), SUP-06 (Web Share), SUP-10 (hiệu ứng Auto); NFR-01, NFR-03, NFR-05, NFR-07, NFR-08, NFR-12 (bố cục 1/2 vé – Q-049), NFR-14, NFR-15 (Wake Lock)
- **FLOW:** FLOW-06, FLOW-07, FLOW-08 bước 1–6 + A1–A4 + E1–E4, FLOW-11, FLOW-14
- **Ngoài phạm vi:** cửa sổ đồng kinh, host xác nhận, ván mới (T-007); đổi mode/tiếng/nhịp (T-012: tạm đọc mặc định Tự dò, bật tiếng, 5 giây); kho tiếng thật (BIZ-09 ngoài app — dùng bộ audio mẫu)
- **Phụ thuộc:** T-005

## T-007 · SCR-09 Kết quả ván
- **Epic / Milestone / Point:** EPIC-05 / M1 / 8
- **Demo:** Player kinh đúng → mọi người thấy thẻ "KINH!" đếm ngược 5 giây; player khác kinh đúng trong 5 giây → đồng thắng → hết giờ client gọi `closeClaimWindow` → host thấy vé thắng với hàng viền xanh → "Xác nhận kết thúc ván" → tiếng chúc mừng → ván mới `waiting`, vé vẫn của người giữ. Host offline lúc chờ xác nhận → player thấy "Đang chờ host xác nhận".
- **Thao tác:** SCR-09.A0, SCR-09.A1, SCR-09.A2
- **operationId:** closeClaimWindow, confirmGame; mở rộng `createClaim` (Kinh đúng trong `claim_window` → thêm người thắng; `awaiting_confirm` → `CLAIMS_CLOSED`)
- **TBL:** TBL-05 (`status`, `winners`, `result`, `confirmed_by`), TBL-06 (chép player sang ván mới), TBL-02 (`current_game_id`, `game_count`)
- **BR / SUP / NFR:** BR-07, BR-11, BR-18, BR-28, BR-04 (phòng `closing` → ván tự kết thúc); SUP-01, SUP-02
- **FLOW:** FLOW-08 bước 6–9, A2, A5, E5; FLOW-14 A1
- **Ngoài phạm vi:** —
- **Phụ thuộc:** T-006

## T-008 · SCR-06 Chat
- **Epic / Milestone / Point:** EPIC-06 / M2 / 3
- **Demo:** Mở sheet Chat → gửi tin → người khác thấy ngay kèm tên/ảnh; người vào sau thấy tin cũ; gửi 6 tin trong 10 giây → tin thứ 6 báo "Bạn gửi quá nhanh"; > 500 ký tự không gửi được.
- **Thao tác:** SCR-06.A0, SCR-06.A1
- **operationId:** sendMessage
- **TBL:** TBL-04 `messages` (tạo mới), TBL-01 `chat_recent_at`
- **BR / SUP / NFR:** BR-23, SUP-07, NFR-02
- **FLOW:** FLOW-12 toàn bộ
- **Phụ thuộc:** T-007

## T-009 · SCR-07 Người trong phòng
- **Epic / Milestone / Point:** EPIC-07 / M2 / 5
- **Demo:** Mở sheet Người → danh sách ai online/offline, ai giữ vé nào, host có nhãn → host kick một player → người đó bị đưa ra trang chủ, mở lại link bị chặn; host thu hồi vé người offline.
- **Thao tác:** SCR-07.A0, SCR-07.A1, SCR-07.A2
- **operationId:** kickPlayer, reclaimPlayerTickets (dùng lại từ T-005)
- **TBL:** TBL-02 `blocked_uids`, TBL-01, TBL-06; RTDB presence
- **BR / SUP / NFR:** BR-06, BR-13, BR-22, SUP-04; Q-050 (1a: báo câu chung khi bị kick lúc offline)
- **FLOW:** FLOW-10 toàn bộ
- **Phụ thuộc:** T-008

## T-010 · SCR-08 Lịch sử ván
- **Epic / Milestone / Point:** EPIC-08 / M2 / 2
- **Demo:** Sau 2 ván, mở sheet Lịch sử → thấy ván mới nhất trước: số ván, giờ, người thắng (tên, màu vé) / "Không ai thắng" / "Đã hủy".
- **Thao tác:** SCR-08.A0
- **operationId:** — (realtime đọc `games`)
- **TBL:** TBL-05, TBL-06 (chỉ đọc; index `seq_no desc`)
- **BR / SUP / NFR:** Q-031, Q-039
- **FLOW:** FLOW-13
- **Phụ thuộc:** T-009

## T-011 · SCR-10 Hồ sơ cá nhân & đăng xuất
- **Epic / Milestone / Point:** EPIC-09 / M2 / 5
- **Demo:** Mở Hồ sơ → đổi tên (2–30 ký tự), tải ảnh ≤ 5 MB hoặc chọn avatar có sẵn → người cùng phòng thấy tên/ảnh mới; khôi phục theo Google. Đăng xuất: ván đang chạy → nút khóa; ván chờ: player → rời phòng; host → đóng phòng cho mọi người.
- **Thao tác:** SCR-10.A0, SCR-10.A1, SCR-10.A2, SCR-10.A3, SCR-10.A4
- **operationId:** updateProfile, resetProfile, deleteCurrentSession (đủ nhánh ở phòng – Q-052)
- **TBL:** TBL-01, TBL-06 (tên/ảnh player ván hiện tại), Storage `avatars/{uid}` (rules ≤ 5 MB)
- **BR / SUP / NFR:** BR-21, BR-27, SUP-08
- **FLOW:** FLOW-16; FLOW-01 A2
- **Phụ thuộc:** T-010

## T-012 · SCR-11 Cài đặt
- **Epic / Milestone / Point:** EPIC-10 / M2 / 3
- **Demo:** Mở sheet Cài đặt → đổi mode Tự dò ⇄ Auto (vé tự đánh dấu, hiệu ứng chờ), tắt tiếng rao; host đổi nhịp quay 3–15 giây → số kế tiếp theo nhịp mới; link "Hồ sơ cá nhân" mở SCR-10.
- **Thao tác:** SCR-11.A1, SCR-11.A2, SCR-11.A3
- **operationId:** updateRoom
- **TBL:** TBL-02 `draw_interval_sec`; localStorage (mode, tiếng)
- **BR / SUP / NFR:** BR-15, BR-20, SUP-10
- **FLOW:** FLOW-15; FLOW-06 A3
- **Phụ thuộc:** T-011

## T-013 · Vận hành: thống kê ngày, TTL, theo dõi lỗi
- **Epic / Milestone / Point:** EPIC-11 / M2 / 3
- **Demo:** Chạy function `aggregateDailyStats` trên emulator → có doc `stats/{yyyy-mm-dd}` đúng số liệu seed; cấu hình TTL `expire_at` và index có trong repo; lỗi server ghi log có cấu trúc.
- **Thao tác:** — (không thuộc màn)
- **operationId:** — (`x-background-tasks.aggregateDailyStats`)
- **TBL:** TBL-07 `stats`; TTL policy TBL-02..TBL-06
- **BR / SUP / NFR:** SUP-09, NFR-11, NFR-17
- **Phụ thuộc:** T-012

## Kiểm độ phủ
- **Thao tác:** 42/42 mã `SCR-xx.Ay` thuộc đúng 1 task (SCR-02.A3 và SCR-10.A4 cùng `deleteCurrentSession`: T-003 nhánh không ở phòng, T-011 nhánh ở phòng).
- **operationId:** 23/23 thuộc task (reclaimPlayerTickets tạo ở T-005, dùng lại T-009).
- **Job nền:** `aggregateDailyStats` → T-013.
- **BR:** BR-01..BR-28 (trừ ~~BR-24~~) đều có task; BR-26 (kho tiếng) → T-006 dùng bộ audio mẫu, kho thật ngoài app (BIZ-09).
- **SUP MVP:** SUP-01..SUP-10 đều có task.
- **NFR Must:** NFR-01, 02, 03, 06, 07, 08, 09, 11, 12, 13, 14, 16 có task. NFR-06 (tải 800 người) không có task đo tải riêng — kiểm thiết kế; đo tải ngoài phạm vi MVP (Q-053: chỉ local + emulator).
- **Chưa phủ:** BIZ-09 kho tiếng rao thật (ngoài ứng dụng – Q-018).
