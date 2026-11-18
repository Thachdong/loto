# T-001 · Dựng nền dự án chạy được trên local + emulator

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-00 | M0 | 3 | — | TODO |

## 1. Mục tiêu demo
Sau task này: **dev chạy `npm run emulators` + `npm run dev`, mở `http://localhost:3000` trên Chrome ở viewport 375×812 thì thấy trang chào "Lô Tô Online" theo bố cục mobile-first. Emulator UI (`localhost:4000`) hiện đủ Auth, Firestore, Realtime Database, Storage, Functions. `npm test`, `npm run lint` và `npm run typecheck` đều pass.**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | — | Task nền, không thuộc màn |
| API | — | Khung chung cho mọi Server Action: `ActionResult<T>`, lớp service, Zod, bảng mã lỗi lấy từ `api-contract.yml` (`info.description` › Bảng mã lỗi) |
| Dữ liệu | — | `firestore.rules`, `database.rules.json`, `storage.rules` cấm mọi đọc/ghi; `firestore.indexes.json` rỗng |
| NFR | NFR-12 | Layout mobile-first từ 360px, cột nội dung ≤ 480px ở máy tính |
| NFR | NFR-16 | Từ điển chữ tiếng Việt, hiển thị giờ GMT+7 |
| ADR | ADR-02, ADR-03, ADR-13 | Next.js + Tailwind + shadcn/ui; ghi qua server; Vitest + Emulator |

**Ngoài phạm vi:** đăng nhập và kiểm phiên trong action (T-002); collection, rules cụ thể (task của từng màn); deploy App Hosting, CI GitHub Actions, Playwright (không cần — Q-053); TTL policy, `aggregateDailyStats` (T-013).

## 3. Việc cần làm
### UI
- [ ] Khởi tạo Next.js 16 (App Router) + React 19 + TypeScript strict. Pin phiên bản chính xác trong `package.json` (tech-stack §2).
- [ ] Tailwind CSS 4 + shadcn/ui (khởi tạo `Button`, `Dialog`, `Sheet`, `Input`, toast `Sonner`) — dùng cho các task sau.
- [ ] `app/layout.tsx`: `lang="vi"`, font có đủ dấu tiếng Việt, meta viewport `width=device-width, initial-scale=1`. Khung `AppShell` gồm cột `max-w-[480px] mx-auto px-4`, nền ngoài cột khác màu ở màn rộng (NFR-12).
- [ ] Trang `/` tạm: logo chữ "Lô Tô Online" và câu giới thiệu lấy từ từ điển. T-002 thay bằng logic điều hướng.
- [ ] `src/i18n/vi.ts`: từ điển chữ giao diện, kèm hàm `t(key, params)` (NFR-16). Chữ giao diện của các task sau đều thêm vào đây.
- [ ] `src/lib/time.ts`: `formatTimeVN(date, 'HH:mm' | 'dd/MM HH:mm')` dùng `Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })` (NFR-16).

### API / Backend
- [ ] `src/server/errors.ts`: hằng `ERROR_CODES` gồm đủ 41 mã trong bảng mã lỗi của api-contract, mỗi mã có `{http, message}` (message tiếng Việt). Thêm class `AppError(code, details?)`.
- [ ] `src/server/action.ts`: kiểu `ActionResult<T> = {ok: true, data: T} | {ok: false, error: {code, message, details?}}` và hàm bọc `defineAction({ input: zodSchema, auth: 'none' | 'required', handler })`. Hàm bọc làm các việc:
  - Validate Zod. Sai → `VALIDATION_FAILED`, `details[] = {field, code, message}`.
  - Handler ném `AppError` → trả đúng mã đó.
  - Lỗi bất ngờ → `INTERNAL_ERROR`, không lộ stack. Ghi log JSON một dòng `{severity: 'ERROR', action, code, message, stack}` ra stderr.
  - `auth: 'required'` để sẵn điểm móc, T-002 hiện thực kiểm phiên.
  - Quy ước đặt tên: `<operationId>Action`, file `src/server/actions/<operationId>.ts`.
- [ ] `src/server/firebase-admin.ts`: khởi tạo `firebase-admin` (Firestore, Auth, RTDB, Storage) một lần. Tự nối emulator khi có biến `*_EMULATOR_HOST`.
- [ ] `src/lib/firebase/client.ts`: khởi tạo Firebase JS SDK (modular). `NEXT_PUBLIC_USE_EMULATOR=true` → `connectAuthEmulator`, `connectFirestoreEmulator`, `connectDatabaseEmulator`, `connectStorageEmulator`.
- [ ] `src/server/clock.ts`: `now()` lấy giờ server, thay được trong test, để test các rule theo thời gian (BR-04, BR-05) mà không cần chờ thật.

### Data
- [ ] `firebase.json`: emulators auth 9099, firestore 8080, database 9000, storage 9199, functions 5001, UI 4000. Bật `singleProjectMode`. Project id `demo-loto`. `[ASSUMED]` Dùng tiền tố `demo-` để SDK không gọi tới project thật.
- [ ] `firestore.rules`: `allow read, write: if false` cho mọi đường dẫn. `database.rules.json`: `.read/.write = false`. `storage.rules`: cấm hết. Các task sau mở dần từng phần.
- [ ] `firestore.indexes.json` rỗng (`indexes: [], fieldOverrides: []`).
- [ ] `functions/`: package TypeScript (Node 22, firebase-functions 6.x), `index.ts` chưa export function nào. T-013 thêm `aggregateDailyStats`.
- [ ] `scripts/seed.ts` (`npm run seed -- <scenario>`):
  - Từ chối chạy khi thiếu `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST`, báo lỗi rõ.
  - Hỗ trợ đăng ký scenario. Scenario `reset` xóa sạch emulator qua REST API của emulator.
  - Scenario `smoke` ghi 1 doc `_smoke/hello`.
  - Có hàm tiện ích `seedUser({uid, email, name, photoUrl})`: tạo user Auth emulator provider `google.com` qua `importUsers` để user hiện trong màn chọn tài khoản giả lập. `[ASSUMED]`

### Khác
- [ ] Scripts `package.json`:
  - `dev`: `next dev`
  - `emulators`: `firebase emulators:start --import=.emulator-data --export-on-exit`. `[ASSUMED]` Giữ dữ liệu giữa các lần chạy; thư mục này được gitignore.
  - `test`: `firebase emulators:exec --only auth,firestore,database,storage "vitest run"`
  - `test:unit`: `vitest run --project unit`
  - `lint`: ESLint (next + typescript)
  - `typecheck`: `tsc --noEmit`
  - `seed`: `tsx scripts/seed.ts`
- [ ] Vitest chia 2 project:
  - `unit`: môi trường node, thư mục `src/**/*.test.ts`.
  - `emulator`: thư mục `tests/emulator/**`, có helper `@firebase/rules-unit-testing` cho rules và helper xóa dữ liệu giữa các test.
  - `[ASSUMED]` Thêm `@testing-library/react` + jsdom để test component.
- [ ] `.env.local.example`: `NEXT_PUBLIC_FIREBASE_*` (giá trị cho `demo-loto`), `NEXT_PUBLIC_USE_EMULATOR=true`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, các `*_EMULATOR_HOST` cho server.
- [ ] `docs/chrome-testing.md`: hướng dẫn AI chạy kịch bản Chrome (Q-053):
  - Khởi động emulator + dev, chạy seed.
  - Viewport 375×812.
  - Mỗi người chơi một profile/cửa sổ Chrome riêng (cookie tách biệt).
  - Xem dữ liệu ở Emulator UI.
  - Ghi kết quả pass/fail kèm ảnh chụp khi fail vào mục "Kết quả chạy" của file task.
- [ ] README ngắn: yêu cầu Node 22, Java (cho emulator), firebase-tools; các lệnh trên.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | Repo mới clone, đã `npm install` và có `.env.local` copy từ example | Chạy `npm run emulators` rồi `npm run dev`, mở `http://localhost:3000` | Trang hiện "Lô Tô Online" và câu giới thiệu tiếng Việt, console trình duyệt không có lỗi | Demo T-001 |
| AC-2 | Emulator đang chạy | Mở `http://localhost:4000` | Emulator UI hiện đủ 5 emulator: Authentication, Firestore, Realtime Database, Storage, Functions | ADR-13, Q-053 |
| AC-3 | Trang `/` mở trên Chrome | Đặt viewport 360×740, 375×812, rồi 1280×800 | Ở 360 và 375 không có thanh cuộn ngang, chữ không tràn. Ở 1280, cột nội dung căn giữa, rộng ≤ 480px | NFR-12 |
| AC-4 | Emulator rules đã nạp | Client SDK (đã auth hoặc chưa) ghi/đọc một doc Firestore bất kỳ, ghi một node RTDB, upload một file Storage | Mọi thao tác bị từ chối (`permission-denied`) | ADR-03 |
| AC-5 | Một action thử định nghĩa bằng `defineAction` với schema `{n: number}` | Gọi với `{n: "x"}` | Trả `{ok:false, error:{code:'VALIDATION_FAILED', details:[{field:'n', …}]}}` | api-contract › Error |
| AC-6 | Action thử ném `new AppError('ROOM_FULL')` | Gọi action | Trả `{ok:false, error:{code:'ROOM_FULL', message:'Phòng đã đầy'}}` | api-contract › Bảng mã lỗi |
| AC-7 | Action thử ném `Error('boom')` | Gọi action | Trả `INTERNAL_ERROR` với message "Có lỗi xảy ra, vui lòng thử lại", không chứa "boom" hay stack. stderr có 1 dòng JSON `severity: "ERROR"` | api-contract › InternalError |
| AC-8 | `ERROR_CODES` đã khai báo | So với bảng mã lỗi của api-contract | Đủ 41 mã, HTTP status khớp từng mã | api-contract |
| AC-9 | Thời điểm `2026-11-18T17:30:00Z` | Gọi `formatTimeVN(…, 'HH:mm')` | Trả `00:30` (GMT+7). Mọi chữ trên trang `/` lấy từ `vi.ts` | NFR-16 |
| AC-10 | Thiếu biến `FIRESTORE_EMULATOR_HOST` | Chạy `npm run seed -- smoke` | Script dừng, báo "Chỉ chạy seed trên emulator", không ghi gì | Q-053 |
| AC-11 | Emulator đang chạy | Chạy `npm run seed -- smoke`, sau đó `npm run seed -- reset` | Emulator UI có doc `_smoke/hello`; sau reset thì Firestore trống | Q-053 |
| AC-12 | Code nền đã xong | Chạy `npm test`, `npm run lint`, `npm run typecheck` | Cả 3 lệnh pass (exit 0) | DoD chung |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| `action.test.ts`: lỗi Zod → `VALIDATION_FAILED` có `details.field` | AC-5 |
| `action.test.ts`: `AppError` → đúng mã + message tiếng Việt | AC-6 |
| `action.test.ts`: lỗi bất ngờ → `INTERNAL_ERROR`, không lộ thông tin, có log JSON (spy `console.error`) | AC-7 |
| `errors.test.ts`: snapshot danh sách mã + HTTP so với bảng trích từ api-contract | AC-8 |
| `time.test.ts`: `formatTimeVN` qua mốc nửa đêm GMT+7 | AC-9 |
| `tests/emulator/rules-baseline.test.ts`: Firestore read/write deny (auth và unauth); RTDB write deny; Storage upload deny | AC-4 |
| `tests/emulator/seed.test.ts`: chạy `seed smoke` có doc; chạy `reset` thì xóa sạch | AC-11 |

### Kịch bản test trên Chrome (AI chạy)
Tiền điều kiện: `npm run emulators` và `npm run dev` đang chạy. Dùng 1 cửa sổ Chrome.

| Bước | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|
| 1 | Đặt viewport 375×812, mở `http://localhost:3000` | Thấy "Lô Tô Online" và câu giới thiệu; DevTools console không có lỗi đỏ | AC-1 |
| 2 | Cuộn ngang thử | Trang không cuộn ngang | AC-3 |
| 3 | Đổi viewport 360×740 | Không có thanh cuộn ngang, chữ không tràn | AC-3 |
| 4 | Đổi cửa sổ sang 1280×800 | Cột nội dung căn giữa, rộng ≤ 480px (đo bằng DevTools) | AC-3 |
| 5 | Mở `http://localhost:4000` | Emulator UI có Authentication, Firestore, Realtime Database, Storage, Functions | AC-2 |
| 6 | Ở terminal chạy `npm run seed -- smoke`, tải lại Firestore trong Emulator UI | Có doc `_smoke/hello` | AC-11 |
| 7 | Chạy `npm run seed -- reset`, tải lại Emulator UI | Firestore trống | AC-11 |
| 8 | Chạy `npm test && npm run lint && npm run typecheck` | Cả 3 exit 0 | AC-12 |

### Dữ liệu seed / tiền điều kiện
- Node 22, Java 17+ (cho Emulator Suite), `firebase-tools` cài global hoặc trong devDependencies.
- `.env.local` copy từ `.env.local.example`.
- Scenario seed: `smoke`, `reset`.

### Test tay
Đã gộp vào kịch bản Chrome. Dev chỉ cần đọc `docs/chrome-testing.md` và review cấu trúc thư mục.

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] Rules baseline có test deny cho cả Firestore, RTDB, Storage
- [ ] `docs/chrome-testing.md` và README đủ để một máy mới chạy được từ đầu
- [ ] Không có giá trị bí mật nào trong repo (`.env.local` đã gitignore)

## 7. Ghi chú
- `[ASSUMED]` Project id emulator là `demo-loto`.
- `[ASSUMED]` Seed tạo user Auth emulator provider `google.com` qua `importUsers` để chọn được trong màn đăng nhập giả lập. Nếu màn chọn tài khoản của emulator không liệt kê user import, dùng "Add new account" với đúng email đã seed.
- `[ASSUMED]` Thêm `@testing-library/react` + jsdom vào Vitest để test component (trạng thái loading/error của các màn sau). Mục "Thiết lập" chỉ ghi Vitest.
- `[ASSUMED]` `npm run emulators` dùng `--import/--export-on-exit` để giữ dữ liệu giữa các lần chạy.
- Point: giữ 3. Rủi ro lệch lên 5: phần cấu hình Vitest chạy với `emulators:exec` và Next 16 + Tailwind 4 mới có thể tốn công gỡ lỗi.
- Tech-stack ADR-13 ghi CI GitHub Actions + Playwright, nhưng Q-053 ghi đè: chỉ kiểm local, E2E do AI chạy trên Chrome. Task này không dựng CI.
