# T-002 · Đăng nhập Google (SCR-01)

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-01 | M1 | 5 | T-001 | TODO |

## 1. Mục tiêu demo
Sau task này: **người dùng chưa đăng nhập mở `localhost:3000` thì được đưa tới SCR-01. Bấm "Đăng nhập với Google" và chọn tài khoản trên màn Google giả lập của emulator → server tạo `users/{uid}`, đặt cookie `__session` → người dùng về trang chủ, thấy "Xin chào, {tên}". Mở `/login` với user-agent giả lập Zalo thì thấy hướng dẫn "Mở bằng trình duyệt" và nút "Copy link".**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-01.A1 | Đăng nhập Google, tạo phiên |
| Thao tác | SCR-01.A2 | Copy link / Mở bằng Chrome (trình duyệt trong ứng dụng chat) |
| API | `createSession` → `createSessionAction` | `POST /sessions`, body `{idToken}` → `SessionResult {me, isNewUser}` |
| Dữ liệu | TBL-01 `users` | Tạo mới collection. Rules: chỉ chính chủ đọc, cấm client ghi |
| Rule | BR-01 | Chỉ đăng nhập bằng Google |
| Phụ trợ | SUP-05 | Session cookie `__session` 14 ngày, `returnTo` |
| Phụ trợ | SUP-09 | Ghi `created_at`, `last_active_at` (thống kê đọc ở T-013) |
| NFR | NFR-09 | Chỉ Google; action cần phiên bị từ chối khi không có phiên hợp lệ |
| NFR | NFR-10 | Chỉ thu tên, ảnh, email; email chỉ trả cho chính chủ; có câu ghi chú dữ liệu |
| NFR | NFR-13 | Nhận diện trình duyệt trong ứng dụng chat |
| Flow | FLOW-01 bước 1–8 | Happy path |
| Flow | FLOW-01 A1, A3, E1, E2 | Đã có phiên; không ghi đè hồ sơ tự sửa; hủy/lỗi; trình duyệt trong ứng dụng chat |
| ADR | ADR-07 | Firebase Auth Google + session cookie |

**Ngoài phạm vi:**
- Đăng xuất (T-003 khi không ở phòng; T-011 khi ở phòng). FLOW-01 A2 không làm ở đây.
- Trang chủ đầy đủ SCR-02 (T-003). Task này chỉ dựng khung tối thiểu "Xin chào, {tên}".
- Trang `/join/{code}` (T-004). Task này chỉ kiểm điều hướng tới `returnTo`.
- Trang phòng (T-003/T-006). Task này chỉ có route `/room` giữ chỗ.

## 3. Việc cần làm
### UI
- [ ] Route `/login` (SCR-01), bố cục theo `scr-01-login.md` §1–2: logo + "Lô Tô Online" + câu giới thiệu (1), banner lời mời (2), nút "Đăng nhập với Google" full width cao 48px (3), dòng lỗi (4), ghi chú dữ liệu (5).
- [ ] Banner lời mời (2) "Bạn được mời vào một phòng lô tô. Đăng nhập để vào phòng." chỉ hiện khi `returnTo` hợp lệ. Hàm `parseReturnTo(raw)` chỉ nhận `^/join/[0-9A-Za-z]{22}$`, mọi giá trị khác bỏ qua để tránh open redirect (`scr-01` §5).
- [ ] Nút (3): UA điện thoại dùng `signInWithRedirect`, máy tính dùng `signInWithPopup` (ADR-07). Lấy `idToken` rồi gọi `createSessionAction`.
- [ ] Trạng thái loading: khi đang xử lý `getRedirectResult` hoặc chờ `createSessionAction`, nút hiện "Đang đăng nhập…" + spinner và bị khóa (`scr-01` §4).
- [ ] Trạng thái error (FLOW-01 E1): popup bị đóng, người dùng hủy, Google lỗi, hoặc `createSessionAction` trả lỗi → hiện (4) "Đăng nhập không thành công, thử lại.", nút bấm lại được, `returnTo` giữ nguyên.
- [ ] Đăng nhập xong thì điều hướng theo thứ tự: `returnTo` hợp lệ → `returnTo`; `me.currentRoomId ≠ null` → `/room`; còn lại → `/` (FLOW-01 bước 6–8).
- [ ] `detectInAppBrowser(ua)` (hàm thuần): nhận diện Zalo, FBAN/FBAV/Messenger, Telegram, Instagram, Line, và trả `{inApp, android}`.
  - Khi `inApp`: thay khối giữa bằng panel (6) "Ứng dụng này không cho đăng nhập Google" + 2 bước (bấm ⋯ → "Mở bằng trình duyệt"). Ẩn nút (3).
  - Nút (7) "Mở bằng Chrome" chỉ hiện trên Android, mở `intent://<host><path+query>#Intent;scheme=https;package=com.android.chrome;end`.
  - Nút (8) "Copy link" copy URL hiện tại (giữ `returnTo`) → toast "Đã copy link". Clipboard bị chặn → hiện ô input readonly chứa link, tự chọn sẵn chữ (SCR-01.A2).
  - `[ASSUMED]` Ngoài production, query `?__ua=<chuỗi UA>` ghi đè user-agent khi nhận diện, để AI giả lập Zalo/Android trên Chrome.
- [ ] Route `/` (khung tối thiểu SCR-02): server component kiểm phiên. Không có phiên → redirect `/login`. Có phiên thì hiện "Xin chào, {display_name}". T-003 hoàn thiện route này.
- [ ] Route `/room` (giữ chỗ): kiểm phiên, hiện "Phòng" và `current_room_id`. T-003 thay bằng trang phòng tối thiểu. `[ASSUMED]`
- [ ] FLOW-01 A1: server component của `/login` kiểm phiên; phiên còn hiệu lực → redirect như bước điều hướng ở trên, không hiện màn.
- [ ] Đồng bộ phiên server và client: giữ Firebase Auth client đã đăng nhập (`browserLocalPersistence`) vì listener Firestore ở các màn sau cần `request.auth`. Nếu server có phiên nhưng client không có `currentUser` sau khi khởi tạo → chuyển `/login?reauth=1`; `/login` có `reauth=1` thì bỏ qua A1 và hiện màn đăng nhập. `[ASSUMED]`
- [ ] Mọi chữ thêm vào `src/i18n/vi.ts`.

### API / Backend
- [ ] `createSessionAction({idToken})` (`auth: 'none'`). Zod: `idToken` string min 1, `additionalProperties: false` (`SessionCreate`). Các bước:
  1. `verifyIdToken(idToken, true)`. Token sai, hết hạn hoặc bị thu hồi → `GOOGLE_TOKEN_INVALID` (401).
  2. `decoded.firebase.sign_in_provider !== 'google.com'` → `GOOGLE_TOKEN_INVALID` (BR-01).
  3. `auth_time` cũ hơn 5 phút → `GOOGLE_TOKEN_INVALID` (khuyến nghị của Firebase cho session cookie). `[ASSUMED]`
  4. Upsert `users/{uid}` trong transaction (`api-contract` › createSession):
     - Lần đầu: tạo đủ field của TBL-01: `email`, `google_name`, `google_photo_url`, `display_name = google_name`, `photo_url = google_photo_url`, `profile_customized = false`, `current_room_id = null`, `chat_recent_at = []`, `last_active_at`, `created_at`, `updated_at`.
     - Đã có: cập nhật `google_name`, `google_photo_url`, `last_active_at`, `updated_at`. Nếu `profile_customized = false` thì đồng bộ thêm `display_name`, `photo_url` (FLOW-01 A3).
  5. `createSessionCookie(idToken, {expiresIn: 14 ngày})` → `cookies().set('__session', …, {httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'lax', maxAge: 1209600, path: '/'})`. `[ASSUMED]` Bỏ `secure` khi chạy dev trên http.
  6. Trả `{me: Me, isNewUser}`. `Me` gồm `email` của chính mình, không có `chat_recent_at`, `last_active_at`.
- [ ] `src/server/session.ts`: `getSessionUid()` đọc cookie `__session` → `verifySessionCookie(cookie, true)` → `uid | null`.
- [ ] Hoàn thiện điểm móc trong `defineAction` (T-001): `auth: 'required'` mà `getSessionUid()` null → `UNAUTHENTICATED` (401), có phiên thì truyền `uid` vào handler.
- [ ] Helper `requireUser()` cho server component: không có phiên → `redirect('/login')`. Có phiên → trả doc `users/{uid}`.

### Data
- [ ] `firestore.rules` thêm `match /users/{uid} { allow read: if request.auth != null && request.auth.uid == uid; allow write: if false; }`.
- [ ] Mapper `toMe(userDoc)` chuyển `snake_case` → `camelCase` theo schema `Me`.
- [ ] Seed scenario `t002`:
  - `u_an`: lần đầu, chưa có doc `users`.
  - `u_binh`: đã có doc, `profile_customized = true`, `display_name = "Bình lô tô"`.
  - `u_cuc`: có doc, `current_room_id = "r_seed"`.
  - Cả 3 tạo bằng `seedUser` trong Auth emulator, provider `google.com`.

### Khác
- [ ] Biến môi trường: không thêm. Dùng cấu hình emulator của T-001.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | Chưa đăng nhập | Mở `/` | Bị chuyển sang `/login`. Thấy logo, "Lô Tô Online", nút "Đăng nhập với Google", câu "Chúng tôi chỉ dùng tên, ảnh đại diện và email Google của bạn." | FLOW-01 bước 1, NFR-10 |
| AC-2 | Ở `/login`, tài khoản Google giả lập "An Nguyễn" chưa từng đăng nhập | Bấm "Đăng nhập với Google", chọn "An Nguyễn" | Về `/`, thấy "Xin chào, An Nguyễn". Emulator có `users/{uid}` với `display_name = google_name = "An Nguyễn"`, `profile_customized = false`, `current_room_id = null`, `chat_recent_at = []`, có `created_at`, `last_active_at`. Trình duyệt có cookie `__session` HttpOnly, Max-Age 1209600 | FLOW-01 bước 2–5, 8; SUP-05; SUP-09 |
| AC-3 | Đang chờ kết quả đăng nhập (redirect quay về hoặc đang gọi `createSession`) | Quan sát nút (3) | Nút hiện "Đang đăng nhập…" + spinner và không bấm được | SCR-01 trạng thái Loading |
| AC-4 | User đã có doc, `profile_customized = false`, tên Google đổi thành "An N." | Đăng nhập lại | `google_name` và `display_name` đều là "An N."; `created_at` giữ nguyên; `last_active_at` mới hơn; response `isNewUser = false` | FLOW-01 bước 3 |
| AC-5 | `u_binh` có `profile_customized = true`, `display_name = "Bình lô tô"` | Đăng nhập | `display_name` vẫn là "Bình lô tô"; `google_name` cập nhật theo Google; trang chủ hiện "Xin chào, Bình lô tô" | FLOW-01 A3 |
| AC-6 | Đã có phiên `__session` hợp lệ | Mở `/login` | Không thấy màn đăng nhập, bị chuyển thẳng `/` (hoặc `/room` nếu đang ở phòng) | FLOW-01 A1 |
| AC-7 | `u_cuc` có `current_room_id = "r_seed"` | Đăng nhập | Bị chuyển `/room` | FLOW-01 bước 6, BR-02 |
| AC-8 | Mở `/login?returnTo=/join/AAAAAAAAAAAAAAAAAAAAAA` | Quan sát màn, rồi đăng nhập | Thấy banner "Bạn được mời vào một phòng lô tô…"; đăng nhập xong URL là `/join/AAAAAAAAAAAAAAAAAAAAAA` (trang này 404 tới khi làm T-004) | FLOW-01 bước 7, SUP-05 |
| AC-9 | Mở `/login?returnTo=https://evil.com`, `//evil.com`, `/room`, hoặc `/join/abc` | Đăng nhập | Không hiện banner; đăng nhập xong về `/`, không đi tới URL ngoài | SCR-01 §5 (Q-050) |
| AC-10 | Ở `/login` trên cửa sổ máy tính (popup) | Mở popup Google rồi đóng popup không chọn tài khoản | Hiện "Đăng nhập không thành công, thử lại."; vẫn ở `/login`; nút bấm lại được; nếu có `returnTo` thì banner vẫn còn | FLOW-01 E1, FLOW-03 E5 |
| AC-11 | `createSessionAction` nhận token sai/hết hạn | Gọi action | `{ok:false, error.code:'GOOGLE_TOKEN_INVALID'}`, không tạo/sửa `users`, không đặt cookie; UI hiện dòng lỗi (4) | FLOW-01 E1, api-contract |
| AC-12 | ID token hợp lệ nhưng đăng nhập bằng provider khác Google (anonymous/password trên emulator) | Gọi `createSessionAction` | `GOOGLE_TOKEN_INVALID`, không có doc `users` | BR-01, NFR-09 |
| AC-13 | Body `{idToken: ""}` hoặc có field lạ | Gọi `createSessionAction` | `VALIDATION_FAILED` | api-contract › SessionCreate |
| AC-14 | Mở `/login?__ua=<UA Zalo Android>` | Quan sát màn | Thấy panel "Ứng dụng này không cho đăng nhập Google" + 2 bước, nút "Mở bằng Chrome", nút "Copy link"; không thấy nút Google. Với `__ua=<UA Messenger iOS>`: không có nút "Mở bằng Chrome" | FLOW-01 E2, NFR-13 |
| AC-15 | Panel trình duyệt trong ứng dụng chat đang hiện, URL có `returnTo` | Bấm "Copy link" | Toast "Đã copy link"; clipboard chứa đúng URL hiện tại kèm `returnTo` | SCR-01.A2 |
| AC-16 | Clipboard API bị từ chối | Bấm "Copy link" | Hiện ô chứa link, chữ đã được chọn sẵn | SCR-01.A2 (Q-050) |
| AC-17 | Danh sách UA: Zalo, FBAN, FBAV, Messenger, Telegram, Instagram, Line, Chrome Android, Safari iOS | Gọi `detectInAppBrowser` | 7 UA đầu trả `inApp = true`; Chrome/Safari trả `false`; cờ `android` đúng theo UA | NFR-13 |
| AC-18 | User A và user B đã có doc `users` | Client SDK của A đọc `users/A`, đọc `users/B`, ghi `users/A`; client chưa auth đọc `users/A` | Chỉ đọc `users/A` được; 3 thao tác còn lại bị từ chối | TBL-01 rules, NFR-10 |
| AC-19 | Action thử có `auth: 'required'` | Gọi khi không có cookie; khi cookie sai; khi cookie đã bị thu hồi (`revokeRefreshTokens`) | Cả 3 trả `UNAUTHENTICATED` | SUP-05, NFR-09 |
| AC-20 | Server có phiên nhưng client Firebase Auth đã đăng xuất (xóa IndexedDB) | Mở `/` | Bị chuyển `/login?reauth=1`, thấy màn đăng nhập (không bị chuyển vòng) | ADR-07 `[ASSUMED]` |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| `parseReturnTo`: chỉ nhận `/join/{22 base62}`; từ chối URL tuyệt đối, `//`, `/room`, mã sai độ dài, ký tự lạ | AC-8, AC-9 |
| `detectInAppBrowser`: bảng UA mẫu (7 in-app + 2 thường), cờ `android` | AC-14, AC-17 |
| `createSessionAction` (emulator): user mới → đủ field TBL-01, `isNewUser = true`, có `Set-Cookie` `__session` | AC-2 |
| `createSessionAction`: user cũ, `profile_customized = false` → đồng bộ tên/ảnh; `created_at` giữ nguyên | AC-4 |
| `createSessionAction`: `profile_customized = true` → không ghi đè `display_name`/`photo_url` | AC-5 |
| `createSessionAction`: token rác / token hết hạn → `GOOGLE_TOKEN_INVALID`, không ghi DB | AC-11 |
| `createSessionAction`: token provider anonymous / password → `GOOGLE_TOKEN_INVALID` | AC-12 |
| `createSessionAction`: `idToken` rỗng / field thừa → `VALIDATION_FAILED` | AC-13 |
| `defineAction` `auth: 'required'`: thiếu cookie / cookie rác / cookie bị thu hồi → `UNAUTHENTICATED` | AC-19 |
| Rules `users`: owner đọc được; người khác, chưa auth, và mọi lệnh ghi đều bị từ chối | AC-18 |
| Component `LoginScreen` (Testing Library): trạng thái loading khóa nút; lỗi hiện dòng (4); clipboard reject → hiện ô link | AC-3, AC-10, AC-16 |

### Kịch bản test trên Chrome (AI chạy)
Tiền điều kiện: emulator + dev đang chạy; `npm run seed -- reset && npm run seed -- t002`. Viewport 375×812. Profile Chrome **P1**. Đăng nhập dùng popup của Auth emulator (UA máy tính).

| Bước | Profile | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|---|
| 1 | P1 | Mở `http://localhost:3000/` | URL thành `/login`. Thấy logo, nút "Đăng nhập với Google", câu ghi chú dữ liệu | AC-1 |
| 2 | P1 | Bấm "Đăng nhập với Google" | Popup emulator mở. Trong lúc chờ, nút trên trang hiện "Đang đăng nhập…" và bị khóa | AC-3 |
| 3 | P1 | Đóng popup không chọn tài khoản | Hiện "Đăng nhập không thành công, thử lại."; nút bấm lại được | AC-10 |
| 4 | P1 | Bấm lại, chọn "Add new account", nhập email `an@example.com`, tên "An Nguyễn" | Về `/`, thấy "Xin chào, An Nguyễn" | AC-2 |
| 5 | P1 | Mở Emulator UI → Firestore → `users/{uid}` | Có `display_name = "An Nguyễn"`, `profile_customized = false`, `current_room_id = null`, `chat_recent_at = []`, `created_at` | AC-2 |
| 6 | P1 | DevTools → Application → Cookies | Có `__session`, HttpOnly, hết hạn sau khoảng 14 ngày | AC-2 |
| 7 | P1 | Mở `http://localhost:3000/login` | Bị chuyển ngay về `/`, không thấy màn đăng nhập | AC-6 |
| 8 | P1 | Xóa cookie site và IndexedDB (DevTools → Application → Clear site data). Mở `/login?returnTo=/join/AAAAAAAAAAAAAAAAAAAAAA` | Thấy banner "Bạn được mời vào một phòng lô tô. Đăng nhập để vào phòng." | AC-8 |
| 9 | P1 | Đăng nhập lại bằng `an@example.com` | URL là `/join/AAAAAAAAAAAAAAAAAAAAAA` (404 ở task này là đúng) | AC-8 |
| 10 | P1 | Clear site data, mở `/login?returnTo=https://evil.com`, đăng nhập | Không có banner; về `/` | AC-9 |
| 11 | P1 | Clear site data, đăng nhập bằng tài khoản seed `binh@example.com` | Thấy "Xin chào, Bình lô tô" (không bị đổi theo tên Google) | AC-5 |
| 12 | P1 | Clear site data, đăng nhập bằng `cuc@example.com` | URL là `/room` | AC-7 |
| 13 | P1 | Clear site data, mở `/login?__ua=Mozilla/5.0 (Linux; Android 13) … Zalo/23.11&returnTo=/join/AAAAAAAAAAAAAAAAAAAAAA` | Thấy panel "Ứng dụng này không cho đăng nhập Google", 2 bước hướng dẫn, nút "Mở bằng Chrome", nút "Copy link"; không có nút Google | AC-14 |
| 14 | P1 | Bấm "Copy link", dán vào thanh địa chỉ tab mới (không Enter) | Toast "Đã copy link"; chuỗi dán ra là URL hiện tại, vẫn có `returnTo` | AC-15 |
| 15 | P1 | Mở `/login?__ua=… (iPhone …) … FBAN/MessengerForiOS` | Có panel, có "Copy link", **không** có "Mở bằng Chrome" | AC-14 |
| 16 | P1 | Đăng nhập bình thường, rồi ở DevTools xóa IndexedDB `firebaseLocalStorageDb` (giữ cookie), tải lại `/` | Chuyển `/login?reauth=1`, thấy màn đăng nhập, không bị chuyển vòng | AC-20 |

AC-4, AC-11, AC-12, AC-13, AC-16, AC-17, AC-18, AC-19 được phủ bằng test tự động.

### Dữ liệu seed / tiền điều kiện
- Scenario `t002`:
  - `u_binh`: `binh@example.com`, `profile_customized = true`, `display_name = "Bình lô tô"`.
  - `u_cuc`: `cuc@example.com`, `current_room_id = "r_seed"`. Không cần doc phòng thật; trang `/room` giữ chỗ chỉ in ra id.
  - Tài khoản `an@example.com` không seed, để test lần đầu đăng nhập.

### Test tay
Đã gộp vào kịch bản Chrome. Dev review thêm: cookie options (`httpOnly`, `sameSite`) và việc không log `idToken`.

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] Rules `users` có test allow (chính chủ) và deny (người khác, chưa auth, ghi)
- [ ] `defineAction` `auth: 'required'` có test cookie thiếu, rác, bị thu hồi
- [ ] Không log `idToken` hay session cookie

## 7. Ghi chú
- `[ASSUMED]` Query `?__ua=` (tắt ở production) để AI giả lập trình duyệt trong ứng dụng chat trên Chrome, vì Claude in Chrome không đổi được user-agent.
- `[ASSUMED]` Cookie `secure` chỉ bật ở production, để dev chạy được trên `http://localhost`.
- `[ASSUMED]` Từ chối ID token có `auth_time` cũ hơn 5 phút (theo khuyến nghị của Firebase khi tạo session cookie).
- `[ASSUMED]` Server có phiên mà client Firebase Auth mất trạng thái → chuyển `/login?reauth=1`. Api-contract không có operation để xóa cookie riêng.
- `[ASSUMED]` Task này dựng `/` tối thiểu ("Xin chào, {tên}") và `/room` giữ chỗ. T-003 thay cả hai.
- `scr-01-login.md` §5 ghi "đăng xuất không làm rời phòng" là quyết định cũ. Q-052 đã ghi đè: đăng xuất = thoát phòng (làm ở T-011). Task này không đụng tới đăng xuất.
- Point: giữ 5.
