# T-013 · Vận hành: thống kê ngày, TTL dữ liệu phòng, log lỗi có cấu trúc

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-11 | M2 | 3 | T-012 | TODO |

## 1. Mục tiêu demo
Sau task này: **dev seed dữ liệu 2 ngày → chạy `aggregateDailyStats` trên Emulator cho ngày D → mở Emulator UI thấy doc `stats/{D}` có `new_users`, `active_users`, `rooms_created`, `games_played`, `avg_members_per_room` đúng số liệu seed (chỉ tính trong ngày D theo GMT+7); `firestore.indexes.json` có TTL `expire_at` cho rooms/tickets/messages/games/players; khi một Server Action lỗi hệ thống, terminal in một dòng log JSON có `severity: ERROR`, `operationId`, mã lỗi, stack, còn người dùng chỉ thấy thông báo chung.**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | — | Không thuộc màn |
| API | — (`x-background-tasks.aggregateDailyStats`) | Cloud Functions 2nd gen `onSchedule('10 0 * * *', timeZone 'Asia/Ho_Chi_Minh')` |
| Dữ liệu | TBL-07 `stats/{yyyy-mm-dd}` | tạo mới; rules cấm đọc/ghi client |
| Dữ liệu | TBL-01 `last_active_at` | cập nhật để đếm người hoạt động |
| Dữ liệu | TTL policy TBL-02..TBL-06 trên `expire_at` | cấu hình + kiểm mọi doc phòng có `expire_at` |
| Phụ trợ | SUP-09 | Thống kê vận hành |
| NFR | NFR-11 | Dữ liệu phòng xóa sau 30 ngày (TTL 31 ngày từ tạo phòng) |
| NFR | NFR-17 | Ghi lỗi hệ thống; thống kê ngày |
| ADR | ADR-10, ADR-11, ADR-13 | |

**Ngoài phạm vi:** Cloud Monitoring alert (> 5% lỗi trong 5 phút), Firestore backup, bật TTL thật trên project — cần deploy, ngoài Q-053 (chỉ ghi cấu hình trong repo); dashboard Looker Studio; đo tải NFR-06.

## 3. Việc cần làm
### API / Backend
- [ ] `functions/src/aggregateDailyStats.ts`: `onSchedule({schedule: '10 0 * * *', timeZone: 'Asia/Ho_Chi_Minh'})` gọi `computeDailyStats(db, date = hôm qua GMT+7)`.
- [ ] `computeDailyStats(db, date)` (hàm thuần nhận Firestore Admin + ngày, tách để test): khoảng `[D 00:00, D+1 00:00)` GMT+7 đổi sang UTC; dùng aggregation query:
  - `new_users` = `count()` `users` có `created_at` trong khoảng.
  - `active_users` = `count()` `users` có `last_active_at` trong khoảng (ADR-11; giới hạn: người hoạt động D và D+1 chỉ được đếm ở D+1 nếu job chạy sau — job chạy 00:10 nên sai lệch chỉ trong 10 phút đầu ngày) `[ASSUMED]`.
  - `rooms_created` = `count()` `rooms` có `created_at` trong khoảng.
  - `games_played` = `count()` collection group `games` có `started_at` trong khoảng `[ASSUMED]` (ván đã bắt đầu; ván hủy trước khi bắt đầu không tính).
  - `avg_members_per_room` = `average('player_count')` collection group `games` có `started_at` trong khoảng, làm tròn 2 chữ số; không có ván → 0 `[ASSUMED]` (dùng số người chơi mỗi ván làm đại diện vì `member_count` chỉ là giá trị hiện tại).
  - Ghi `stats/{yyyy-mm-dd}` bằng `set` (chạy lại cùng ngày ghi đè — idempotent) + `computed_at`.
- [ ] Script `npm run stats:run -- --date=YYYY-MM-DD` chạy `computeDailyStats` với Emulator (vì Emulator không tự kích hoạt lịch) `[ASSUMED]`.
- [ ] `last_active_at`: trong lớp xác thực chung của Server Action, nếu `last_active_at` thuộc ngày (GMT+7) trước hôm nay → cập nhật `now` (tối đa 1 ghi/người/ngày) `[ASSUMED]`; `createSession` (T-002) luôn cập nhật.
- [ ] Log có cấu trúc (NFR-17, ADR-13): wrapper chung của Server Action (khung `ActionResult` từ T-001) — lỗi không lường trước → `console.error(JSON.stringify({severity: 'ERROR', message, operationId, uid, roomId?, errorCode: 'INTERNAL_ERROR', stack_trace, '@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent'}))` `[ASSUMED]` (định dạng Cloud Logging/Error Reporting); trả client `{ok: false, error: {code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống, thử lại sau'}}` không kèm stack. Lỗi nghiệp vụ (4xx) log `severity: INFO` một dòng ngắn `[ASSUMED]`.
- [ ] Không log email, ID token, cookie (NFR-10); `uid` được phép.
- [ ] Function `aggregateDailyStats` lỗi → log `severity: ERROR` cùng định dạng và ném lại để Cloud Scheduler retry.

### Data
- [ ] `firestore.indexes.json` `fieldOverrides` bật TTL (`"ttl": true`) trên field `expire_at` cho collection group `rooms`, `tickets`, `messages`, `games`, `players` (ADR-10).
- [ ] `fieldOverrides` collection group `games.started_at` (ASC, scope COLLECTION_GROUP) cho aggregation `games_played`/`avg_members_per_room`.
- [ ] `firestore.rules`: `stats/{date}` cấm đọc và ghi từ client.
- [ ] Rà mọi điểm ghi doc thuộc phòng (createRoom, joinRoom, takeTicket, renewTicketSet, startGame, drawNumber, createClaim, confirmGame, sendMessage, …) đều set `expire_at = rooms.created_at + 31 ngày`; viết test bao phủ (sửa chỗ thiếu nếu có).
- [ ] Seed `stats-2days`: 2 ngày D và D+1 (theo GMT+7), gồm user/room/game tạo lúc 23:59 D và 00:01 D+1 để kiểm biên ngày.

### Khác
- [ ] `firebase.json`: khai báo functions codebase và emulator Functions (nếu T-001 chưa có).
- [ ] README vận hành ngắn trong `docs/ops.md` `[ASSUMED]`: cách chạy stats, xem `stats` trên console, TTL bật khi deploy (`firebase deploy --only firestore:indexes`), alert/backup làm khi deploy.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | Seed `stats-2days`: ngày D có 3 user mới, 4 user hoạt động, 2 phòng, 3 ván đã bắt đầu với `player_count` 2, 3, 4 (+ 1 ván hủy chưa bắt đầu) | Chạy `npm run stats:run -- --date=D` | Emulator UI có `stats/{D}` = `{new_users: 3, active_users: 4, rooms_created: 2, games_played: 3, avg_members_per_room: 3, computed_at}` | SUP-09, ADR-11 |
| AC-2 | Seed có bản ghi tạo lúc 23:59 D và 00:01 D+1 (GMT+7) | Chạy cho D | Bản ghi 23:59 D được tính, 00:01 D+1 không được tính | SUP-09, NFR-16 |
| AC-3 | `stats/{D}` đã có | Chạy lại cho D | Doc bị ghi đè cùng giá trị (không nhân đôi), `computed_at` mới | ADR-11 |
| AC-4 | Ngày không có dữ liệu | Chạy cho ngày đó | `stats/{date}` tất cả = 0, `avg_members_per_room = 0`, không lỗi | SUP-09 |
| AC-5 | Function được deploy cấu hình | Đọc `functions/src` | Lịch `10 0 * * *`, `timeZone: Asia/Ho_Chi_Minh`, mặc định tính ngày hôm qua | ADR-11 |
| AC-6 | `firestore.indexes.json` | Đọc file | Có `fieldOverrides` với `ttl: true` trên `expire_at` cho 5 collection group rooms, tickets, messages, games, players | NFR-11, ADR-10 |
| AC-7 | Chơi trọn 1 ván (tạo phòng, vào phòng, lấy vé, chat, KINH, xác nhận) trên Emulator | Duyệt mọi doc dưới `rooms/{roomId}` | Mọi doc có `expire_at` = `rooms.created_at + 31 ngày` | NFR-11 |
| AC-8 | Client đăng nhập | Đọc hoặc ghi `stats/{D}` bằng client SDK | Bị Security Rules từ chối | TBL-07 |
| AC-9 | Một Server Action gặp lỗi không lường trước (vd Firestore Emulator tắt) | Người dùng thao tác | UI hiện thông báo chung (toast lỗi của thao tác), response `INTERNAL_ERROR` không chứa stack; terminal `npm run dev` có 1 dòng JSON `severity: "ERROR"` với `operationId`, `uid`, `stack_trace`, không có email/token | NFR-17, NFR-10 |
| AC-10 | User có `last_active_at` hôm qua | Gọi một Server Action bất kỳ hôm nay (lần 1, lần 2) | Lần 1 `last_active_at` cập nhật hôm nay; lần 2 trong cùng ngày không ghi thêm | SUP-09 |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| `dayRangeGmt7('2026-11-18')` → `[2026-11-17T17:00Z, 2026-11-18T17:00Z)` | AC-2 |
| `computeDailyStats` trên Emulator với seed `stats-2days` → đúng 5 chỉ số | AC-1, AC-2 |
| `computeDailyStats` chạy 2 lần → 1 doc, cùng số liệu | AC-3 |
| `computeDailyStats` ngày trống → toàn 0 | AC-4 |
| Kiểm cấu hình: import function, đọc `schedule`/`timeZone` từ trigger metadata; parse `firestore.indexes.json` có 5 TTL override | AC-5, AC-6 |
| Test "expire_at everywhere": chạy chuỗi action của một ván trên Emulator, duyệt cây `rooms/{roomId}` khẳng định `expire_at` đúng | AC-7 |
| Rules: `stats/*` read/write → deny | AC-8 |
| Wrapper action: service ném `Error` → trả `INTERNAL_ERROR` không stack; spy `console.error` nhận JSON có `severity`, `operationId`, `stack_trace`, không chứa email | AC-9 |
| Lớp xác thực: `last_active_at` hôm qua → cập nhật; đã là hôm nay → không ghi | AC-10 |

### Kịch bản test trên Chrome (AI chạy)
Môi trường: localhost + Emulator; Emulator UI `http://localhost:4000`; viewport 375×812 cho app.

| Bước | Profile / công cụ | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|---|
| 1 | Terminal | Seed `stats-2days`; chạy `npm run stats:run -- --date=D` | Lệnh kết thúc không lỗi, in số liệu | AC-1 |
| 2 | Chrome – Emulator UI | Mở Firestore → `stats/{D}` | Giá trị đúng như AC-1 | AC-1, AC-2 |
| 3 | Terminal + Emulator UI | Chạy lại lệnh bước 1 | Vẫn 1 doc `stats/{D}`, `computed_at` mới | AC-3 |
| 4 | Terminal + Emulator UI | Chạy cho một ngày trống | `stats/{ngày}` toàn 0 | AC-4 |
| 5 | Chrome P1 + P2 | Chơi trọn 1 ván như smoke T-007 (tạo phòng, vào, lấy vé, chat, KINH, xác nhận) | Ván kết thúc bình thường | AC-7 |
| 6 | Chrome – Emulator UI | Mở `rooms/{id}` và các subcollection tickets, messages, games, players | Mọi doc có `expire_at` = `created_at` của phòng + 31 ngày | AC-7 |
| 7 | Chrome P1 | Dừng riêng Firestore Emulator (hoặc đặt biến `FIRESTORE_EMULATOR_HOST` sai rồi khởi động lại dev) `[ASSUMED]`; ở SCR-02 bấm "Tạo phòng" | Toast "Không tạo được phòng, thử lại"; Network tab: response không có stack | AC-9 |
| 8 | Terminal `npm run dev` | Xem log | 1 dòng JSON `severity: "ERROR"`, `operationId: "createRoom"`, có `uid`, `stack_trace`; không có email | AC-9 |

AC-5, AC-6, AC-8, AC-10 phủ bằng test tự động.

### Dữ liệu seed / tiền điều kiện
- Seed `stats-2days` (mục Data); tài khoản An, Bình cho bước 5.
- Emulator Suite có Functions (T-001).

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] `firestore.indexes.json` có TTL override + index collection group `games.started_at`
- [ ] Test "expire_at everywhere" pass cho toàn bộ action đã có (T-002..T-012)
- [ ] `docs/ops.md` ghi các việc cần làm khi deploy (bật TTL, alert NFR-17, backup ADR-13)

## 7. Ghi chú
- `[ASSUMED]` `games_played` = số ván có `started_at` trong ngày; `avg_members_per_room` = trung bình `games.player_count` của các ván đó (DB không lưu sĩ số đỉnh của phòng). Cần user xác nhận định nghĩa.
- `[ASSUMED]` `last_active_at` cập nhật tối đa 1 lần/người/ngày ở lớp xác thực chung — trước đây chỉ `createSession` ghi nên đếm người hoạt động bị thiếu với phiên 14 ngày.
- `[ASSUMED]` Chạy thống kê trên Emulator bằng script `stats:run` (Emulator không tự chạy lịch).
- `[ASSUMED]` Định dạng log theo Cloud Logging structured JSON + `@type` Error Reporting; alert và backup chỉ ghi tài liệu, làm khi deploy.
- Point 3 khớp checklist; nếu phải sửa nhiều chỗ thiếu `expire_at` ở task trước có thể vượt — theo dõi.
