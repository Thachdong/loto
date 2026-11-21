---
task: T-002
title: Đăng nhập Google (SCR-01)
written_from_commit: 8fec101
last_run: 2026-11-20 23:55
summary: "P0 5/5 · P1 9/9 · P2 1/1"
---

# Test case QC · T-002 Đăng nhập Google (SCR-01)

## 0. Môi trường chung
- Lệnh: `npm run emulators` (nền) · `npm run dev` (nền) · `npm run seed -- reset && npm run seed -- t002`
- URL: `http://localhost:3000` · Emulator UI: `http://localhost:4000`
- Viewport: 375×812 (trừ khi case ghi khác). UA Chrome máy tính ⇒ đăng nhập bằng **popup** của Auth emulator. Extension không điều khiển được cửa sổ popup ⇒ các bước chọn tài khoản chạy luồng **redirect** trong cùng tab bằng `?__ua=<UA Chrome Android>` (Mobile, không in-app); cần cấp quyền extension cho `localhost:9099`.
- Profile: P1 = khách (1 cửa sổ Chrome). "Clear site data" = DevTools › Application › Storage › Clear site data cho `localhost:3000` (xóa cookie `__session` + IndexedDB Firebase), hoặc `document.cookie` không xóa được HttpOnly nên phải dùng DevTools / `chrome://settings/content/all` → localhost → Delete data.
- Tài khoản (Auth emulator, provider google.com):
  - `an@example.com` "An Nguyễn" — **không seed**, tạo qua "Add new account" trong popup.
  - `binh@example.com` (seed `u_binh`, `display_name = "Bình lô tô"`, `profile_customized = true`).
  - `cuc@example.com` (seed `u_cuc`, `current_room_id = "r_seed"`).
- Chữ (vi.ts): nút "Đăng nhập với Google" · loading "Đang đăng nhập…" · lỗi "Đăng nhập không thành công, thử lại." · banner "Bạn được mời vào một phòng lô tô. Đăng nhập để vào phòng." · ghi chú "Chúng tôi chỉ dùng tên, ảnh đại diện và email Google của bạn." · panel "Ứng dụng này không cho đăng nhập Google" · "Mở bằng Chrome" · "Copy link" · toast "Đã copy link" · "Xin chào, {tên}" · "Phòng" / "Mã phòng: {id}".
- UA mẫu:
  - Zalo Android: `Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 Zalo/23.11`
  - Messenger iOS: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/440.0]`
  (khi đưa vào URL phải `encodeURIComponent`).

## 1. Ma trận phủ
| Nguồn | TC |
|---|---|
| AC-1 | TC-T002-01 |
| AC-2 | TC-T002-02 · `tests/emulator/auth/create-session.test.ts` |
| AC-3 | TC-T002-02 bước 2 · `login-screen.test.tsx` |
| AC-4 | TC-T002-14 (automated) |
| AC-5 | TC-T002-07 · `create-session.test.ts` |
| AC-6 | TC-T002-03 |
| AC-7 | TC-T002-08 · `post-login-path.test.ts` |
| AC-8 | TC-T002-04 · `parse-return-to.test.ts` |
| AC-9 | TC-T002-05 · `parse-return-to.test.ts` |
| AC-10 | TC-T002-06 · `login-screen.test.tsx` |
| AC-11, AC-12, AC-13 | TC-T002-14 (automated) |
| AC-14 | TC-T002-09, TC-T002-11 · `detect-in-app-browser.test.ts`, `in-app-browser-panel.test.tsx` |
| AC-15 | TC-T002-10 · `in-app-browser-panel.test.tsx` |
| AC-16, AC-17 | TC-T002-14 (automated) |
| AC-18 | TC-T002-15 (automated) |
| AC-19 | TC-T002-15 (automated) |
| AC-20 | TC-T002-12 |
| FLOW-01 bước 1–8 | TC-T002-01, 02, 04 |
| FLOW-01 A1 | TC-T002-03 |
| FLOW-01 A3 | TC-T002-07 |
| FLOW-01 E1 | TC-T002-06 |
| FLOW-01 E2 | TC-T002-09, 10, 11 |
| NFR-12 responsive | TC-T002-13 |
| Bảo mật cookie | TC-T002-02 bước 5 |

## 2. Smoke (chạy lại ở các task sau)
TC-T002-01, TC-T002-02, TC-T002-03

## 3. Test case

### TC-T002-01 · Chưa đăng nhập mở trang chủ bị chuyển sang màn đăng nhập
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, FLOW-01 b1, NFR-10 | chrome |

**Tiền điều kiện:** Clear site data. Seed `reset` + `t002`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `http://localhost:3000/` | URL thành `http://localhost:3000/login` | url |
| 2 | P1 | Đọc trang | Có logo, `h1` "Lô Tô Online", câu giới thiệu; `[data-testid=login-google-button]` = "Đăng nhập với Google", bật; `[data-testid=login-data-note]` = "Chúng tôi chỉ dùng tên, ảnh đại diện và email Google của bạn."; không có banner lời mời, không có dòng lỗi | ui |
| 3 | P1 | Đọc console | Không có lỗi đỏ | console |

**Kết quả:** ✅ PASS · `/` → `/login`, đủ khối 1/3/5, không banner/lỗi, console sạch · 2026-11-20
**Smoke 2026-11-21 (khi làm T-003):** ✅ PASS · `/` → `/login`, nút + ghi chú đúng, console sạch
**Smoke 2026-11-21 (khi làm T-004):** ✅ PASS · `/` → `/login`, nút + ghi chú đúng, console sạch

---

### TC-T002-02 · Đăng nhập lần đầu tạo hồ sơ và phiên 14 ngày
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-2, AC-3, FLOW-01 b2–5, b8, SUP-05, SUP-09 | chrome |

**Tiền điều kiện:** Clear site data; seed `reset` + `t002`; đang ở `/login`.
**Dữ liệu:** `an@example.com`, tên "An Nguyễn".

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Bấm "Đăng nhập với Google" | Popup Auth emulator mở | ui |
| 2 | P1 | Trong lúc popup đang mở, đọc nút trên trang chính | Nút hiện "Đang đăng nhập…", `disabled` | ui |
| 3 | P1 | Trong popup: "Add new account" → nhập email `an@example.com`, display name "An Nguyễn" → "Sign in with Google.com" | Popup đóng; trang chuyển về `/`; `[data-testid=home-greeting]` = "Xin chào, An Nguyễn" | url, ui |
| 4 | P1 | Emulator UI › Firestore › `users/{uid của An}` (uid xem ở tab Authentication) | `email = "an@example.com"`, `google_name = "An Nguyễn"`, `display_name = "An Nguyễn"`, `profile_customized = false`, `current_room_id = null`, `chat_recent_at = []`, có `created_at`, `last_active_at`, `updated_at` | emulator-ui |
| 5 | P1 | DevTools › Application › Cookies › `localhost:3000` | Có `__session`, HttpOnly ✓, SameSite Lax, Path `/`, hết hạn ≈ 14 ngày sau hiện tại; `document.cookie` không chứa `__session` | cookie |

**Kết quả:** ✅ PASS · bước 1–2 bằng popup (nút "Đang đăng nhập…" + disabled); bước 3 chạy luồng redirect (`__ua` Chrome Android) vì extension không điều khiển được cửa sổ popup → "Xin chào, An Nguyễn"; doc `users` đủ field TBL-01; bước 5: tool chặn đọc cookie — HttpOnly/Max-Age/SameSite đã kiểm ở `create-session.test.ts`, server đọc được phiên · lần chạy đầu FAIL (redirect mất kết quả) → fix `d1f3066` · 2026-11-20
**Smoke 2026-11-21 (khi làm T-003):** ✅ PASS · redirect (`__ua` Android), tạo An mới → "Xin chào, An Nguyễn" (trang chủ T-003); `users/<uid>` đủ field TBL-01
**Smoke 2026-11-21 (khi làm T-004):** ✅ PASS · redirect (`__ua` Android), tạo An mới → "Xin chào, An Nguyễn"

---

### TC-T002-03 · Đã có phiên mở /login được chuyển thẳng về trang chủ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | alt | AC-6, FLOW-01 A1 | chrome |

**Tiền điều kiện:** Đã đăng nhập An (TC-T002-02).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `http://localhost:3000/login` | URL thành `/`; thấy "Xin chào, An Nguyễn"; không thấy nút Google | url, ui |
| 2 | P1 | Mở `http://localhost:3000/` rồi tải lại | Vẫn ở `/`, không bị chuyển vòng sang `/login` | url |

**Kết quả:** ✅ PASS · `/login` → `/`, không thấy nút Google; tải lại `/` ở yên · chạy lại sau fix `03125a9` vẫn PASS · 2026-11-20
**Smoke 2026-11-21 (khi làm T-003):** ✅ PASS · `/login` → `/`, không nút Google; tải lại `/` ở yên
**Smoke 2026-11-21 (khi làm T-004):** ✅ PASS · `/login` → `/`, không nút Google; tải lại `/` ở yên

---

### TC-T002-04 · Link mời: hiện banner và đăng nhập xong về đúng link
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-8, FLOW-01 b7 | chrome |

**Tiền điều kiện:** Clear site data. Tài khoản An đã tồn tại trong Auth emulator (TC-02) hoặc tạo mới.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `http://localhost:3000/login?returnTo=/join/AAAAAAAAAAAAAAAAAAAAAA` | `[data-testid=login-invite-banner]` = "Bạn được mời vào một phòng lô tô. Đăng nhập để vào phòng." | ui |
| 2 | P1 | Bấm "Đăng nhập với Google", chọn "An Nguyễn" | URL là `/join/AAAAAAAAAAAAAAAAAAAAAA` (trang 404 ở task này là đúng) | url |

**Kết quả:** ✅ PASS · banner đúng chữ; đăng nhập (dùng `binh@example.com` thay An — chỉ kiểm `returnTo`) → `/join/AAAAAAAAAAAAAAAAAAAAAA` (404) · 2026-11-20

---

### TC-T002-05 · returnTo không hợp lệ bị bỏ qua (chống open redirect)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | security | AC-9 | chrome |

**Tiền điều kiện:** Clear site data.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `/login?returnTo=https://evil.com` | Không có `[data-testid=login-invite-banner]` | ui |
| 2 | P1 | Lần lượt mở `/login?returnTo=//evil.com`, `/login?returnTo=/room`, `/login?returnTo=/join/abc` | Cả 3: không có banner | ui |
| 3 | P1 | Ở `/login?returnTo=https://evil.com` bấm "Đăng nhập với Google", chọn "An Nguyễn" | URL là `http://localhost:3000/`, không rời `localhost` | url |

**Kết quả:** ✅ PASS · 4 giá trị không có banner (đối chứng `/join/{22}` có banner); đăng nhập với `https://evil.com` → `http://localhost:3000/` · 2026-11-20

---

### TC-T002-06 · Đóng popup không chọn tài khoản hiện lỗi, bấm lại được
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-10, FLOW-01 E1 | chrome |

**Tiền điều kiện:** Clear site data. Mở `/login?returnTo=/join/AAAAAAAAAAAAAAAAAAAAAA`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Bấm "Đăng nhập với Google" | Popup mở | ui |
| 2 | P1 | Đóng cửa sổ popup (không chọn tài khoản) | Trong ≤ 12 giây (Firebase chờ 8 giây trước khi báo `popup-closed-by-user`): `[data-testid=login-error]` = "Đăng nhập không thành công, thử lại."; nút "Đăng nhập với Google" bật lại; URL vẫn `/login?returnTo=…`; banner lời mời vẫn hiện | ui, url |

Không đóng được popup bằng extension → `⏭ SKIP` kèm lý do (đã phủ bởi `login-screen.test.tsx`).

**Kết quả:** ✅ PASS · popup đóng bằng `window.close()` trên tham chiếu popup (tương đương bấm X) → lỗi sau ~9 giây, nút bật lại, URL và banner giữ nguyên · 2026-11-20

---

### TC-T002-07 · Hồ sơ tự sửa không bị ghi đè khi đăng nhập lại
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-5, FLOW-01 A3 | chrome |

**Tiền điều kiện:** Clear site data; seed `t002` (có `u_binh`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | `/login` → "Đăng nhập với Google" → chọn tài khoản `binh@example.com` | Về `/`; "Xin chào, Bình lô tô" | url, ui |
| 2 | P1 | Emulator UI › Firestore › `users/u_binh` | `display_name = "Bình lô tô"`, `profile_customized = true`, `google_name = "Bình Trần"` | emulator-ui |

**Kết quả:** ✅ PASS · "Xin chào, Bình lô tô"; `users/u_binh`: display_name "Bình lô tô", google_name "Bình Trần", profile_customized true · 2026-11-20

---

### TC-T002-08 · Người đang ở phòng đăng nhập được đưa vào phòng
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-7, FLOW-01 b6 | chrome |

**Tiền điều kiện:** Clear site data; seed `t002` (có `u_cuc`).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | `/login` → "Đăng nhập với Google" → chọn `cuc@example.com` | URL là `/room`; thấy "Phòng" và `[data-testid=room-current-id]` = "Mã phòng: r_seed" | url, ui |
| 2 | P1 | Mở `http://localhost:3000/` | Bị chuyển `/room` | url |

**Kết quả:** ✅ PASS · `/room`, "Phòng", "Mã phòng: r_seed"; `/` → `/room` · 2026-11-20

---

### TC-T002-09 · Trình duyệt Zalo trên Android thấy hướng dẫn mở trình duyệt
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-14, FLOW-01 E2, NFR-13 | chrome |

**Tiền điều kiện:** Clear site data.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `/login?__ua=<UA Zalo Android đã encode>&returnTo=/join/AAAAAAAAAAAAAAAAAAAAAA` | `[data-testid=inapp-panel]` có "Ứng dụng này không cho đăng nhập Google" và 2 bước hướng dẫn; có `[data-testid=inapp-open-chrome]` "Mở bằng Chrome" và `[data-testid=inapp-copy-link]` "Copy link"; **không** có `[data-testid=login-google-button]`; banner lời mời vẫn hiện | ui |
| 2 | P1 | Đọc `href` của `[data-testid=inapp-open-chrome]` | Bắt đầu `intent://localhost:3000/login?`, chứa `returnTo=%2Fjoin%2FAAAAAAAAAAAAAAAAAAAAAA`, kết thúc `#Intent;scheme=https;package=com.android.chrome;end` | ui |

**Kết quả:** ✅ PASS · panel + 2 bước + "Mở bằng Chrome" + "Copy link", không nút Google, banner còn; href intent đúng đầu/cuối, có returnTo · 2026-11-20

---

### TC-T002-10 · Copy link giữ nguyên returnTo
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-15, SCR-01.A2 | chrome |

**Tiền điều kiện:** Đang ở màn TC-T002-09 bước 1.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Bấm "Copy link" | Toast "Đã copy link" | toast |
| 2 | P1 | Đọc clipboard (`await navigator.clipboard.readText()` trong trang, hoặc dán vào ô địa chỉ tab mới, không Enter) | Bằng URL hiện tại của trang, có `returnTo=%2Fjoin%2FAAAAAAAAAAAAAAAAAAAAAA` | ui |

Nếu Chrome chặn clipboard (trình duyệt tự động) và hiện `[data-testid=inapp-link-input]` thay toast → ghi thực tế; nhánh này là AC-16 (đã phủ tự động), kiểm ô chứa đúng URL và chữ được chọn.

**Kết quả:** ✅ PASS · toast "Đã copy link"; chuỗi copy cùng origin/path/tham số với URL hiện tại (khác cách encode: server dựng lại query, khoảng trắng thành `+`) · 2026-11-20

---

### TC-T002-11 · Messenger iOS không có nút Mở bằng Chrome
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | alt | AC-14 | chrome |

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `/login?__ua=<UA Messenger iOS đã encode>` | Có `[data-testid=inapp-panel]`, có "Copy link"; **không** có `[data-testid=inapp-open-chrome]`; không có nút Google | ui |

**Kết quả:** ✅ PASS · có panel và "Copy link", không "Mở bằng Chrome", không nút Google · 2026-11-20

---

### TC-T002-12 · Server có phiên nhưng client mất Firebase Auth → đăng nhập lại, không lặp
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | resilience | AC-20 | chrome |

**Tiền điều kiện:** Đã đăng nhập An, đang ở `/`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Xóa IndexedDB `firebaseLocalStorageDb` (giữ cookie): trong trang chạy `indexedDB.deleteDatabase('firebaseLocalStorageDb')` | Lệnh chạy xong | ui |
| 2 | P1 | Tải lại `/` | Sau ≤ 3 giây URL là `/login?reauth=1`; thấy màn đăng nhập với nút Google | url, ui |
| 3 | P1 | Chờ 3 giây | Vẫn ở `/login?reauth=1` (không bị chuyển vòng về `/`) | url |
| 4 | P1 | Đăng nhập lại bằng An | Về `/`, "Xin chào, An Nguyễn", ở yên | url, ui |

**Kết quả:** ✅ PASS · xoá IndexedDB → `/login?reauth=1`, ở yên sau 7 giây; đăng nhập lại → `/` · 2026-11-20

---

### TC-T002-13 · Màn đăng nhập không tràn ngang ở 360 và 375
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | responsive | NFR-12 | chrome |

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Viewport 375×812, mở `/login?returnTo=/join/AAAAAAAAAAAAAAAAAAAAAA` | `scrollWidth <= innerWidth`; nút Google cao 48px, rộng bằng cột nội dung | layout |
| 2 | P1 | Viewport 360×740, mở `/login?__ua=<UA Zalo Android đã encode>` | `scrollWidth <= innerWidth`; chữ panel không tràn | layout |

**Kết quả:** ✅ PASS (sau fix `11cf54c`) · lần đầu FAIL bước 1: nút rộng 311px thay vì 343px (padding lặp) · sau fix: 375 → nút 343×48, 360 Zalo không tràn · đo bằng iframe vì cửa sổ Chrome maximize · 2026-11-20

---

### TC-T002-14 · createSession và logic client (tự động)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | error | AC-4, AC-11, AC-12, AC-13, AC-16, AC-17 | automated |

- `tests/emulator/auth/create-session.test.ts`:
  - AC-4: user cũ đồng bộ tên Google.
  - AC-11: token rác bị từ chối.
  - AC-12: token anonymous và password bị từ chối.
  - AC-13: input sai trả `VALIDATION_FAILED`.
  - Thêm: `auth_time` cũ hơn 5 phút.
- `src/features/auth/client/components/in-app-browser-panel.test.tsx`: AC-16.
- `src/features/auth/shared/domain/detect-in-app-browser.test.ts`: AC-17.

**Kết quả:** ✅ PASS (automated, `npm test`) · 2026-11-20

---

### TC-T002-15 · Rules users và kiểm phiên của action (tự động)
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | security | AC-18, AC-19 | automated |

- `tests/emulator/auth/users-rules.test.ts`: AC-18.
- `tests/emulator/auth/session.test.ts`: AC-19.

**Kết quả:** ✅ PASS (automated, `npm test`) · 2026-11-20

---

## Từ điển
- **Ưu tiên:** P0 luồng chính, phải pass để đóng task (luôn nằm trong smoke) · P1 luồng thay thế/lỗi/biên quan trọng · P2 hiếm gặp, cosmetic.
- **Loại:** `happy` · `alt` (luồng A*) · `error` (luồng E*) · `boundary` (biên BR) · `permission` (host/player/người ngoài) · `multi-user` · `resilience` (mất mạng, reload, tab ẩn) · `responsive` · `security`.
- **Chạy bằng:** `chrome` (chrome-tester chạy) · `automated` (đã phủ bằng Vitest, ghi đường dẫn test, chrome-tester bỏ qua) · `manual` (cần thiết bị thật, VD Safari iOS, Zalo thật).
- **Cách kiểm:** `url` · `ui` (chữ/phần tử hiển thị, dùng chữ trong vi.ts hoặc `data-testid`) · `toast` · `emulator-ui` (dữ liệu Firestore/RTDB/Auth) · `cookie` · `console` (không có lỗi) · `network` · `layout` (không tràn ngang, kích thước).
