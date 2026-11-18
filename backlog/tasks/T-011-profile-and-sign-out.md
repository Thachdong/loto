# T-011 · Hồ sơ cá nhân & đăng xuất khi ở phòng (SCR-10)

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-09 | M2 | 5 | T-010 | TODO |

## 1. Mục tiêu demo
Sau task này: **người dùng mở Hồ sơ (menu avatar ở SCR-02, hoặc `/profile` khi đang ở phòng) → đổi tên "An lô tô" → Lưu → người cùng phòng thấy tên mới trong danh sách Người và sheet Vé; tải ảnh JPG ≤ 5 MB hoặc chọn avatar có sẵn → ảnh đổi ngay; "Khôi phục tên & ảnh từ Google" → về tên/ảnh Google. Bấm "Đăng xuất": ván đang diễn ra → nút khóa kèm "Không đăng xuất được khi ván đang diễn ra"; ván chờ — player xác nhận "Đăng xuất sẽ rời phòng {tên}" → về SCR-01, cả phòng thấy "{tên} đã rời phòng"; host xác nhận "Đăng xuất sẽ đóng phòng cho mọi người" → về SCR-01, mọi người khác bị đưa về trang chủ.**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-10.A0 | Listener `users/{uid}` |
| Thao tác | SCR-10.A1 | Lưu tên hiển thị |
| Thao tác | SCR-10.A2 | Tải ảnh lên Storage / chọn avatar có sẵn |
| Thao tác | SCR-10.A3 | Khôi phục tên/ảnh Google |
| Thao tác | SCR-10.A4 | Đăng xuất (đủ nhánh ở phòng – Q-052) |
| API | `updateProfile` → `updateProfileAction({displayName?, avatar?})` | tạo mới |
| API | `resetProfile` → `resetProfileAction()` | tạo mới |
| API | `deleteCurrentSession` → `deleteCurrentSessionAction()` | mở rộng từ T-003 (nhánh không ở phòng) thêm nhánh ở phòng |
| Dữ liệu | TBL-01 `users` | ghi `display_name`, `photo_url`, `profile_customized`, `current_room_id` |
| Dữ liệu | TBL-06 `players` ván hiện tại (`waiting`) | ghi `display_name`, `photo_url`; xóa khi player đăng xuất |
| Dữ liệu | TBL-02, TBL-05 | host đăng xuất: phòng `closed`, `close_reason = host_left`; ván `waiting` → `cancelled` |
| Dữ liệu | Storage `avatars/{uid}/{uuid}.webp` | tạo mới + `storage.rules` |
| Dữ liệu | RTDB `presence`, `presence_access` | client ghi lại tên/ảnh; server xóa khi rời/đóng phòng |
| Rule | BR-27 | Tên 2–30 ký tự; ảnh JPG/PNG ≤ 5 MB hoặc avatar có sẵn |
| Rule | BR-21 | Host đăng xuất = đóng phòng; player = rời; ván đang diễn ra không ai đăng xuất được |
| Rule | BR-22 | Player rời khi ván chờ → vé trống ngay |
| Phụ trợ | SUP-08, SUP-05, SUP-01 | Ảnh đại diện; phiên; toast/thông báo phòng |
| NFR | NFR-10, NFR-02 | Email chỉ chủ thấy; tên mới tới người khác ≤ 1 giây |
| Flow | FLOW-16 bước 1–4, A1, E1; FLOW-01 A2; FLOW-11 bước 2–5 (qua đăng xuất) | |
| Quyết định | Q-052 (ghi đè Q-050 "đăng xuất không rời phòng" và Q-051 "host bị chặn đăng xuất") | |

**Ngoài phạm vi:** link "Hồ sơ cá nhân" trong SCR-11 (T-012); nút "Rời" trên SCR-04 và khóa khi ván chạy (T-006); đăng xuất khi không ở phòng (đã có ở T-003 — chỉ hồi quy); không ghi đè tên khi đăng nhập lại (T-002, FLOW-01 A3).

## 3. Việc cần làm
### UI
- [ ] Route `/profile` `[ASSUMED]` (SCR-10), cần đăng nhập (chưa → SCR-01). Mở từ menu avatar SCR-02 ("Hồ sơ cá nhân"); khi đang ở phòng vào bằng URL tới khi T-012 thêm link. Header "← Hồ sơ cá nhân": ← về màn trước (`router.back()`, không có lịch sử → `/` `[ASSUMED]`); có thay đổi chưa lưu → dialog "Bỏ thay đổi?" (Q-050).
- [ ] Avatar 96px (`photo_url`, rỗng → chữ cái đầu) + "Đổi ảnh"; ô tên với bộ đếm "{n}/30", trim đầu/cuối; email chỉ đọc + "Chỉ bạn thấy email này."; nút "Lưu" khóa khi tên không đổi hoặc không hợp lệ; link "Khôi phục tên & ảnh từ Google" chỉ hiện khi `profile_customized = true`.
- [ ] Lỗi inline: "Tên hiển thị cần 2–30 ký tự." / "Ảnh phải là JPG/PNG và không quá 5 MB." / "Tải ảnh thất bại, thử lại".
- [ ] Sheet "Đổi ảnh": nút "Tải ảnh lên (JPG/PNG, tối đa 5 MB)" (`accept="image/jpeg,image/png"`) + lưới avatar có sẵn từ `public/avatars/` (≥ 8 ảnh mẫu `[ASSUMED]`).
- [ ] Tải ảnh: kiểm client trước (MIME jpeg/png, ≤ 5 MB file gốc) → thu nhỏ 256×256 WebP bằng canvas → upload `avatars/{uid}/{uuid}.webp` (`contentType: image/webp`) với progress bar, khóa chọn ảnh khác khi đang upload → gọi `updateProfileAction({avatar: {kind: 'upload', storagePath}})` → đóng sheet, ảnh mới hiện ngay (lưu luôn, không cần bấm Lưu – Q-050).
- [ ] Chọn avatar có sẵn → `updateProfileAction({avatar: {kind: 'preset', presetId}})`.
- [ ] Sau khi lưu tên/ảnh/khôi phục thành công và đang ở phòng: client ghi lại `display_name`, `photo_url` vào RTDB `presence/{roomId}/{uid}` (ADR-06); toast "Đã lưu hồ sơ" / "Đã khôi phục từ Google"; lỗi mạng → toast "Chưa lưu được, thử lại" / "Chưa khôi phục được, thử lại".
- [ ] Nút "Đăng xuất" (cuối trang `[ASSUMED]` vị trí) với 3 trạng thái theo listener `users` + `rooms/{current}` + `games/{current}`:
  - Không ở phòng → đăng xuất ngay (như SCR-02.A3).
  - Ở phòng, ván `running`/`paused`/`claim_window`/`awaiting_confirm` → nút khóa + "Không đăng xuất được khi ván đang diễn ra".
  - Ván `waiting`: player → dialog "Đăng xuất sẽ rời phòng {tên phòng}"; host → dialog "Đăng xuất sẽ **đóng phòng** cho mọi người". Xác nhận → `deleteCurrentSessionAction()` → Firebase `signOut()` → SCR-01. Nhận `GAME_IN_PROGRESS` (ván vừa bắt đầu) → toast "Ván vừa bắt đầu, chưa đăng xuất được" và khóa nút `[ASSUMED]`.
- [ ] Người khác trong phòng khi host đóng phòng: listener `users` thấy `current_room_id = null` → SCR-02 với banner; `last_event` cuối là `room_closed` + phòng `close_reason = host_left` → "Host đã đóng phòng "{tên}"." `[ASSUMED]` (bổ sung câu cho banner SCR-02); không đọc được → "Bạn không còn ở trong phòng." (Q-050 1a).
- [ ] Trạng thái: loading skeleton avatar + ô tên; lỗi đọc "Không tải được hồ sơ" + "Thử lại".

### API / Backend
- [ ] `updateProfileAction` theo `updateProfile`: phiên → Zod (`ProfileUpdate`: `minProperties 1`, `additionalProperties false`, `AvatarInput` discriminated union theo `kind`; sai cấu trúc → `VALIDATION_FAILED`) → trim tên, ngoài 2–30 ký tự (code point) → `422 DISPLAY_NAME_INVALID` `[ASSUMED]` (Zod chỉ kiểm kiểu).
- [ ] Avatar upload: `storagePath` khớp `^avatars/{uid người gọi}/{uuid}.webp$`, file tồn tại (Admin Storage `exists`), `contentType` image/* và size ≤ 5 MB → ngược lại `422 AVATAR_INVALID`; `photo_url` = download URL; xóa các file khác trong `avatars/{uid}/` sau khi ghi DB (ADR-12).
- [ ] Avatar preset: `presetId` thuộc danh sách hằng `AVATAR_PRESETS` (sinh từ `public/avatars/`) → `photo_url = "/avatars/{presetId}.png"`, xóa ảnh upload cũ; không có → `AVATAR_INVALID`.
- [ ] Ghi `users`: `display_name`/`photo_url`, `profile_customized = true`, `updated_at`. Nếu `current_room_id` ≠ null và có doc player ở ván hiện tại đang `waiting` → cập nhật `display_name`, `photo_url` của doc player trong cùng transaction (ván đang chạy: không đổi player – TBL-06). Trả `Me`.
- [ ] `resetProfileAction`: `display_name = google_name`, `photo_url = google_photo_url`, `profile_customized = false`; xóa mọi file `avatars/{uid}/`; cập nhật player như trên. Trả `Me`.
- [ ] `deleteCurrentSessionAction` mở rộng (transaction, lazy expiry trước):
  - Ván hiện tại không `waiting` (và phòng chưa đóng) → `409 GAME_IN_PROGRESS`, không đổi gì, không hủy phiên.
  - Player, ván `waiting` → gọi chung hàm domain của `leaveRoom` (T-006): `current_room_id = null`, `member_count − 1`, `last_event = member_left`, xóa doc player, xóa RTDB `presence`/`presence_access` của mình.
  - Host, ván `waiting` → ván `cancelled` (`result = cancelled`, `ended_at`), phòng `status = closed`, `close_reason = host_left`, `closed_at`, `member_count = 0` `[ASSUMED]`, `last_event = room_closed`; query `users where current_room_id == roomId` → đặt null cho tất cả; sau commit xóa RTDB `presence/{roomId}` và `presence_access/{roomId}`.
  - Sau đó (mọi nhánh trừ `GAME_IN_PROGRESS`): xóa cookie `__session`, `revokeRefreshTokens(uid)`; trả `204`.
- [ ] Đảm bảo `invite_code` của phòng đã đóng trả `INVITE_EXPIRED` ở `getInvite`/`joinRoom` (hồi quy T-004).

### Data
- [ ] `storage.rules`: `avatars/{uid}/{file}` — ghi chỉ khi `request.auth.uid == uid`, `request.resource.size <= 5 * 1024 * 1024`, `request.resource.contentType.matches('image/.*')`; xóa chỉ chủ; đọc công khai (ADR-12).
- [ ] `firestore.rules`: không đổi (client cấm ghi `users`); test: user không đọc được `users/{uid khác}` (email – NFR-10).
- [ ] Index single `users.current_room_id` (database.md) — kiểm có trong `firestore.indexes.json` (mặc định single-field đã bật).
- [ ] `public/avatars/*.png` bộ avatar mẫu + `AVATAR_PRESETS`.
- [ ] Seed `room-waiting` (host An, Bình giữ vé, Chi giữ vé, ván `waiting`) và `room-running` (như trên, ván `running`).

### Khác
- [ ] Cấu hình Storage Emulator trong `firebase.json` (nếu T-001 chưa bật) và biến môi trường bucket local.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | An đăng nhập, không ở phòng | Mở menu avatar → "Hồ sơ cá nhân" | Thấy ảnh, tên Google, email + "Chỉ bạn thấy email này."; không có link khôi phục | SCR-10.A0, NFR-10 |
| AC-2 | Bình đang ở phòng `room-waiting`, giữ vé Đỏ A | Bình đổi tên " Bình lô tô " → Lưu | Toast "Đã lưu hồ sơ"; `users.display_name = "Bình lô tô"`, `profile_customized = true`; ≤ 1 giây An thấy tên mới ở sheet Người và người giữ Đỏ A ở sheet Vé; tin chat cũ của Bình giữ tên cũ | FLOW-16 bước 1–4, NFR-02 |
| AC-3 | Ô tên | Nhập "B" (1 ký tự) / 31 ký tự / chỉ khoảng trắng | Lỗi "Tên hiển thị cần 2–30 ký tự.", nút Lưu khóa; gọi action trực tiếp → `DISPLAY_NAME_INVALID`, dữ liệu không đổi. Nhập 2 và 30 ký tự → lưu được | FLOW-16 E1, BR-27 (biên) |
| AC-4 | Hồ sơ | Tải ảnh JPG 4,9 MB | Progress hiện, sau đó ảnh mới (256×256) hiện ngay, sheet đóng; Storage có `avatars/{uid}/{uuid}.webp`; `photo_url` trỏ ảnh mới; ảnh upload trước đó bị xóa | FLOW-16 bước 2–4, SUP-08, BR-27 |
| AC-5 | Hồ sơ | Chọn file 5,1 MB / file GIF | Lỗi "Ảnh phải là JPG/PNG và không quá 5 MB.", không upload | FLOW-16 E1, BR-27 (biên) |
| AC-6 | User A | Upload thẳng vào `avatars/{uid B}/x.webp`, hoặc file > 5 MB, hoặc `contentType` `text/plain` vào thư mục mình | Storage Rules từ chối | BR-27, ADR-12 |
| AC-7 | User A | Gọi `updateProfileAction` với `storagePath` của uid khác / file không tồn tại / `presetId` không có | `AVATAR_INVALID`, `photo_url` không đổi | BR-27, NFR-09 |
| AC-8 | Hồ sơ | Chọn một avatar có sẵn | Ảnh đổi ngay; `photo_url = "/avatars/{id}.png"`; ảnh upload cũ trong `avatars/{uid}/` bị xóa | BR-27, SUP-08 |
| AC-9 | `profile_customized = true` | Bấm "Khôi phục tên & ảnh từ Google" | Toast "Đã khôi phục từ Google"; tên/ảnh = Google; `profile_customized = false`; link khôi phục ẩn; `avatars/{uid}/` rỗng | FLOW-16 A1 |
| AC-10 | Bình ở phòng `room-running` (ván đang chạy) | Mở `/profile` | Nút "Đăng xuất" khóa + "Không đăng xuất được khi ván đang diễn ra"; gọi action trực tiếp → `GAME_IN_PROGRESS`, phiên và phòng không đổi. Áp dụng cả với host | BR-21, Q-052, FLOW-01 A2 |
| AC-11 | Bình (player) ở `room-waiting`, giữ Đỏ A | "Đăng xuất" → dialog "Đăng xuất sẽ rời phòng {tên}" → xác nhận | Bình về SCR-01; cả phòng thấy toast "Bình đã rời phòng"; Đỏ A "Trống"; `member_count` giảm 1; `users/Bình.current_room_id = null`; cookie `__session` bị xóa (vào `/` lại ra SCR-01) | FLOW-01 A2, FLOW-11 bước 2–5, BR-21, BR-22 |
| AC-12 | An (host) ở `room-waiting` có Bình, Chi | "Đăng xuất" → dialog "Đăng xuất sẽ đóng phòng cho mọi người" → xác nhận | An về SCR-01; Bình, Chi ≤ 1 giây bị đưa về SCR-02 với banner "Host đã đóng phòng …" (hoặc "Bạn không còn ở trong phòng."); Emulator: phòng `closed`, `close_reason = host_left`, ván `cancelled`, mọi `current_room_id` = null, RTDB không còn `presence/{roomId}`; mở link mời cũ → "Link không còn hiệu lực" | BR-21, Q-052, FLOW-01 A2 |
| AC-13 | Người chưa đăng nhập | Mở `/profile` | Chuyển về SCR-01 | SCR-10 "Không có quyền" |
| AC-14 | Ô tên đã sửa, chưa Lưu | Bấm ← | Dialog "Bỏ thay đổi?"; chọn bỏ → về màn trước, tên không đổi | SCR-10 component 1 |
| AC-15 | User A | Đọc `users/{uid B}` bằng client SDK | Bị Security Rules từ chối (email B không lộ) | NFR-10 |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| `validateDisplayName`: "B", 31 ký tự, "   " → lỗi; "Bì", 30 ký tự, " Bình lô tô " → "Bình lô tô" | AC-3 |
| `updateProfileAction` tên: ghi users + `profile_customized`; ở phòng ván `waiting` → doc player cập nhật; ván `running` → doc player không đổi | AC-2 |
| `updateProfileAction` avatar upload hợp lệ (file đặt sẵn trên Storage Emulator) → `photo_url`, file cũ bị xóa; path uid khác / không tồn tại → `AVATAR_INVALID` | AC-4, AC-7 |
| `updateProfileAction` preset hợp lệ / không tồn tại; body `{}` → `VALIDATION_FAILED` | AC-8, AC-7 |
| `resetProfileAction`: về giá trị Google, `profile_customized = false`, thư mục avatars rỗng | AC-9 |
| Storage rules: chủ ghi ≤ 5 MB image/* → allow; uid khác / 5 MB + 1 byte / text/plain → deny; đọc công khai → allow | AC-6 |
| `deleteCurrentSessionAction`: ván `running`/`paused`/`claim_window`/`awaiting_confirm` → `GAME_IN_PROGRESS`, không đổi gì (4 case) | AC-10 |
| `deleteCurrentSessionAction` player ván `waiting`: như `leaveRoom` (current_room_id, member_count, last_event member_left, xóa player, xóa RTDB), `revokeRefreshTokens` được gọi | AC-11 |
| `deleteCurrentSessionAction` host ván `waiting`: phòng closed/host_left, ván cancelled, mọi user trong phòng current_room_id null, RTDB phòng bị xóa; `joinRoomAction` bằng mã cũ → `INVITE_EXPIRED` | AC-12 |
| `deleteCurrentSessionAction` không ở phòng: chỉ hủy phiên (hồi quy T-003) | AC-1 |
| Rules: đọc `users/{khác}` → deny | AC-15 |

### Kịch bản test trên Chrome (AI chạy)
Môi trường: localhost + Firebase Emulator (Auth, Firestore, RTDB, Storage), viewport 375×812. **P1 = Host An**, **P2 = Bình**, **P3 = Chi**. Chuẩn bị file test: `avatar-4_9mb.jpg`, `big-5_1mb.jpg`, `anim.gif`.

| Bước | Profile | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|---|
| 1 | P1 | Seed `users-only`; mở `/`, menu avatar → "Hồ sơ cá nhân" | Tên + ảnh Google, email + "Chỉ bạn thấy email này."; không có link khôi phục | AC-1 |
| 2 | P1 | Xóa hết ô tên, nhập "A" | "Tên hiển thị cần 2–30 ký tự.", Lưu khóa; nhập 31 ký tự → bộ đếm vượt, Lưu khóa | AC-3 |
| 3 | P1 | Nhập "An" → Lưu | Toast "Đã lưu hồ sơ"; link "Khôi phục…" xuất hiện | AC-3, AC-9 |
| 4 | P1 | Sửa tên thành "An 2" chưa lưu, bấm ← | Dialog "Bỏ thay đổi?"; chọn bỏ → về SCR-02, lời chào "Xin chào, An" | AC-14 |
| 5 | P1 | "Đổi ảnh" → chọn `big-5_1mb.jpg`; sau đó `anim.gif` | Lỗi "Ảnh phải là JPG/PNG và không quá 5 MB.", không có progress | AC-5 |
| 6 | P1 | Chọn `avatar-4_9mb.jpg` | Progress chạy, ảnh mới hiện, sheet đóng; Emulator Storage có 1 file `.webp` trong `avatars/{uid}/` | AC-4 |
| 7 | P1 | Chọn avatar có sẵn thứ 2 | Ảnh đổi ngay; Storage `avatars/{uid}/` rỗng; `photo_url = /avatars/…png` | AC-8 |
| 8 | P1 | Bấm "Khôi phục tên & ảnh từ Google" | Toast "Đã khôi phục từ Google"; tên/ảnh Google; link khôi phục ẩn | AC-9 |
| 9 | — | Seed `room-waiting`; P1, P2, P3 mở `/room`; P1 mở sheet Người | 3 người | — |
| 10 | P2 | Mở `/profile`, đổi tên "Bình lô tô" → Lưu | P1 thấy tên "Bình lô tô" ở sheet Người ≤ 1 giây; mở sheet Vé, Đỏ A hiện người giữ "Bình lô tô"; tin chat cũ của Bình (gửi trước bước này) vẫn tên cũ | AC-2 |
| 11 | — | Seed `room-running`; P2 mở `/profile` | Nút "Đăng xuất" khóa + "Không đăng xuất được khi ván đang diễn ra" | AC-10 |
| 12 | P1 | Host mở `/profile` | Nút "Đăng xuất" cũng khóa | AC-10 |
| 13 | — | Seed `room-waiting`; P2 mở `/profile` → "Đăng xuất" | Dialog "Đăng xuất sẽ rời phòng {tên}" | AC-11 |
| 14 | P2 | Xác nhận | P2 về SCR-01; P1, P3 thấy toast "Bình đã rời phòng"; sheet Vé: Đỏ A "Trống"; P2 mở `/` → vẫn SCR-01 | AC-11 |
| 15 | P1 | Host mở `/profile` → "Đăng xuất" | Dialog "Đăng xuất sẽ đóng phòng cho mọi người" | AC-12 |
| 16 | P1 | Xác nhận | P1 về SCR-01; P3 ≤ 1 giây về SCR-02 kèm banner "Host đã đóng phòng …" hoặc "Bạn không còn ở trong phòng." | AC-12 |
| 17 | Emulator UI | Xem `rooms/{id}`, `games/{current}`, `users/*`, RTDB | `status = closed`, `close_reason = host_left`, ván `cancelled`, `current_room_id` null cho cả 3, không còn `presence/{roomId}` | AC-12 |
| 18 | P3 | Mở link mời cũ | "Link không còn hiệu lực" | AC-12 |
| 19 | P3 (cửa sổ ẩn danh) | Mở `/profile` khi chưa đăng nhập | Về SCR-01 | AC-13 |

AC-6, AC-7, AC-15 phủ bằng test rules/integration.

### Dữ liệu seed / tiền điều kiện
- Auth Emulator: An, Bình, Chi (có `google_name`, `google_photo_url`).
- Seed `users-only`, `room-waiting`, `room-running` (mục Data); Storage Emulator bật.
- File ảnh test trong `tests/fixtures/` `[ASSUMED]`.

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] `storage.rules` có test allow/deny (chủ, uid khác, > 5 MB, sai contentType)
- [ ] `deleteCurrentSession` có test đủ 4 nhánh: không ở phòng / ván đang diễn ra / player ván chờ / host ván chờ
- [ ] Smoke lại T-003 (đăng xuất ở SCR-02), T-004 (link mời), T-006 (rời phòng)

## 7. Ghi chú
- `[ASSUMED]` Route SCR-10 là `/profile`; khi đang ở phòng vào bằng URL tới khi T-012 thêm link "Hồ sơ cá nhân" ở SCR-11.
- `[ASSUMED]` Độ dài tên đếm theo code point; ngoài 2–30 trả `422 DISPLAY_NAME_INVALID` (bảng mã lỗi), SCR-10 ghi `VALIDATION_FAILED` — UI hiển thị giống nhau.
- `[ASSUMED]` Host đóng phòng: banner SCR-02 thêm câu "Host đã đóng phòng "{tên}"." khi client kịp đọc `last_event = room_closed`; không thì câu chung (Q-050 1a). `member_count` đặt 0.
- `[ASSUMED]` Nhận `GAME_IN_PROGRESS` khi ván vừa bắt đầu giữa lúc mở dialog → toast và khóa nút.
- Theo Q-052: đăng xuất = thoát phòng; ghi đè ghi chú cũ "đăng xuất không rời phòng" (Q-050) và "host bị chặn" (SCR-02.A3 – Q-051).
- Cập nhật tên ở doc player chỉ khi ván `waiting` (TBL-06 không đổi khi ván chạy) — người khác vẫn thấy tên mới ngay qua presence (sheet Người); tên ở vé/kết quả của ván đang chạy giữ tên cũ.
- Đề xuất point: upload + thu nhỏ ảnh + Storage rules + 2 action hồ sơ + 4 nhánh đăng xuất (host đóng phòng cho mọi người) → sát **8** hơn 5. Giữ 5 theo slices.md, đề xuất nâng lên 8.
