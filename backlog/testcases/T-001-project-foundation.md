---
task: T-001
title: Dựng nền dự án chạy được trên local + emulator
written_from_commit: e467650
last_run: null
summary: null
---

# Test case QC · T-001 Dựng nền dự án chạy được trên local + emulator

## 0. Môi trường chung
- Lệnh: `npm run emulators` (nền) · `npm run dev` (nền) · `npm run seed -- reset`
- `.env.local` copy từ `.env.example`
- URL: `http://localhost:3000` · Emulator UI: `http://localhost:4000`
- Viewport: 375×812 (trừ khi case ghi khác)
- Profile: P1 = khách chưa đăng nhập (1 cửa sổ Chrome là đủ)
- Chữ mong đợi (từ `src/core/shared/i18n/vi.ts`): tiêu đề "Lô Tô Online", câu giới thiệu "Chơi lô tô cùng bạn bè, mọi lúc mọi nơi"

## 1. Ma trận phủ
| Nguồn | TC |
|---|---|
| AC-1 | TC-T001-01 |
| AC-2 | TC-T001-03 |
| AC-3 | TC-T001-02 (375), TC-T001-05 (360, 1280) |
| AC-4 (automated) | TC-T001-07 · `tests/emulator/core/rules-baseline.test.ts` |
| AC-5, AC-6, AC-7 (automated) | TC-T001-08 · `src/core/server/action.test.ts` |
| AC-8 (automated) | TC-T001-08 · `src/core/shared/errors.test.ts` |
| AC-9 | TC-T001-01 (chữ từ vi.ts) · TC-T001-08 (`src/core/shared/time.test.ts`, `src/app/page.test.tsx`) |
| AC-10 | TC-T001-06 · `tests/emulator/core/seed.test.ts` |
| AC-11 | TC-T001-04 · `tests/emulator/core/seed.test.ts` |
| AC-12 | TC-T001-09 |
| NFR-16 font tiếng Việt | TC-T001-01 bước 3 |

## 2. Smoke (chạy lại ở các task sau)
TC-T001-01, TC-T001-02, TC-T001-03

## 3. Test case

### TC-T001-01 · Trang chủ hiện tên app và câu giới thiệu, không lỗi console
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, AC-9, NFR-16 | chrome |

**Tiền điều kiện:** emulator + dev đang chạy.
**Dữ liệu:** —

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đặt viewport 375×812, mở `http://localhost:3000` | `[data-testid=app-title]` = "Lô Tô Online"; `[data-testid=app-tagline]` = "Chơi lô tô cùng bạn bè, mọi lúc mọi nơi"; tab title "Lô Tô Online" | ui |
| 2 | P1 | Đọc console | Không có lỗi đỏ (error) | console |
| 3 | P1 | Kiểm `document.documentElement.lang` và `getComputedStyle(document.body).fontFamily` | `lang = "vi"`; font chứa "Be Vietnam Pro"; dấu tiếng Việt ("Lô Tô", "cùng bạn bè") hiển thị đúng, không ô vuông | ui |

**Kết quả:** ⬜

---

### TC-T001-02 · Ở 375px không có thanh cuộn ngang
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | responsive | AC-3 | chrome |

**Tiền điều kiện:** trang `/` đang mở ở viewport 375×812.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Chạy `document.documentElement.scrollWidth <= window.innerWidth` | `true` | layout |
| 2 | P1 | Thử cuộn ngang (`window.scrollTo(200, 0)` rồi đọc `window.scrollX`) | `scrollX = 0` | layout |

**Kết quả:** ⬜

---

### TC-T001-03 · Emulator UI hiện đủ 5 emulator
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-2 | chrome |

**Tiền điều kiện:** `npm run emulators` đang chạy.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở `http://localhost:4000` | Trang Overview có các thẻ Authentication, Firestore, Realtime Database, Storage, Functions, mỗi thẻ ở trạng thái đang chạy (có port 9099, 8080, 9000, 9199, 5001) | ui |

**Kết quả:** ⬜

---

### TC-T001-04 · Seed smoke tạo doc, reset xoá sạch Firestore
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | happy | AC-11 | chrome |

**Tiền điều kiện:** emulator đang chạy, `.env.local` có `FIRESTORE_EMULATOR_HOST`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | — | Terminal: `npm run seed -- smoke` | Exit 0, in "Seed \"smoke\" xong." | ui (terminal) |
| 2 | P1 | Mở `http://localhost:4000/firestore`, tải lại | Có collection `_smoke`, doc `hello` với `message = "hello"`, `created_at` là timestamp | emulator-ui |
| 3 | — | Terminal: `npm run seed -- reset` | Exit 0, in "Seed \"reset\" xong." | ui (terminal) |
| 4 | P1 | Tải lại Emulator UI › Firestore | Không còn collection nào | emulator-ui |

**Kết quả:** ⬜

---

### TC-T001-05 · Bố cục ở 360px và 1280px
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | responsive | AC-3, NFR-12 | chrome |

**Tiền điều kiện:** trang `/` đang mở.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Đặt viewport 360×740 | `scrollWidth <= innerWidth` = `true`; tiêu đề và câu giới thiệu nằm trọn trong khung, không bị cắt | layout |
| 2 | P1 | Đặt cửa sổ 1280×800 | `[data-testid=app-shell]`: `getBoundingClientRect().width <= 480`; khoảng cách trái ≈ khoảng cách phải (lệch ≤ 2px) | layout |
| 3 | P1 | So màu nền `body` và `[data-testid=app-shell]` (`getComputedStyle(...).backgroundColor`) | Hai màu khác nhau (nền ngoài xám nhạt, cột trắng) | layout |

**Kết quả:** ⬜

---

### TC-T001-06 · Seed từ chối chạy khi thiếu biến emulator
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | error | AC-10 | chrome |

**Tiền điều kiện:** emulator đang chạy; `npm run seed -- reset` đã chạy.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | — | Terminal: `env -u FIRESTORE_EMULATOR_HOST npx tsx scripts/seed/index.ts smoke` (không nạp `.env.local`) | Exit ≠ 0, stderr có "Chỉ chạy seed trên emulator" | ui (terminal) |
| 2 | P1 | Tải lại Emulator UI › Firestore | Không có collection `_smoke` | emulator-ui |

**Kết quả:** ⬜

---

### TC-T001-07 · Rules baseline chặn mọi đọc/ghi từ client
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | security | AC-4 | automated |

Phủ bởi `tests/emulator/core/rules-baseline.test.ts` (chạy trong `npm test`): Firestore đọc/ghi, RTDB đọc/ghi, Storage upload/đọc đều `permission-denied` với cả user chưa đăng nhập và đã đăng nhập.

**Kết quả:** ⬜

---

### TC-T001-08 · Khung action, mã lỗi và giờ GMT+7
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | error | AC-5, AC-6, AC-7, AC-8, AC-9 | automated |

Phủ bởi:
- `src/core/server/action.test.ts` cho AC-5, AC-6 và AC-7.
- `src/core/shared/errors.test.ts` cho AC-8. Test so sánh với bảng mã lỗi đọc trực tiếp từ `specs/api-contract.yml`.
- `src/core/shared/time.test.ts` và `src/app/page.test.tsx` cho AC-9.

**Kết quả:** ⬜

---

### TC-T001-09 · Test, lint, typecheck đều pass
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-12 | chrome |

**Tiền điều kiện:** dừng `npm run emulators` trước (`npm test` tự bật emulator trên cùng port).

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | — | Terminal: `npm test && npm run lint && npm run typecheck` | Cả 3 lệnh exit 0 | ui (terminal) |

**Kết quả:** ⬜

---

## Từ điển
- **Ưu tiên:** P0 luồng chính, phải pass để đóng task (luôn nằm trong smoke) · P1 luồng thay thế/lỗi/biên quan trọng · P2 hiếm gặp, cosmetic.
- **Loại:** `happy` · `alt` (luồng A*) · `error` (luồng E*) · `boundary` (biên BR) · `permission` (host/player/người ngoài) · `multi-user` · `resilience` (mất mạng, reload, tab ẩn) · `responsive` · `security`.
- **Chạy bằng:** `chrome` (chrome-tester chạy) · `automated` (đã phủ bằng Vitest, ghi đường dẫn test, chrome-tester bỏ qua) · `manual` (cần thiết bị thật, VD Safari iOS, Zalo thật).
- **Cách kiểm:** `url` · `ui` (chữ/phần tử hiển thị, dùng chữ trong vi.ts hoặc `data-testid`) · `toast` · `emulator-ui` (dữ liệu Firestore/RTDB/Auth) · `cookie` · `console` (không có lỗi) · `network` · `layout` (không tràn ngang, kích thước).
