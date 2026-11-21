# Chạy kịch bản test trên Chrome (AI)

Kịch bản E2E không tự động hoá bằng Playwright (Q-053). AI chạy test case QC trong `backlog/testcases/T-XXX-*.md` trên Chrome thật, dùng extension Claude in Chrome. Mọi lệnh dưới đây chạy trong `implement/webapp/`.

## 1. Chuẩn bị (một lần)
- Node.js 22, Java 17+ (`java -version`).
- `npm install` và `npm --prefix functions install`.
- `cp .env.example .env.local`. Giá trị mặc định trỏ tới emulator project `demo-loto`.
- Chrome đã cài và bật extension Claude in Chrome.

## 2. Khởi động
Chạy hai tiến trình nền ở hai terminal:
```bash
npm run emulators   # Emulator Suite + UI http://localhost:4000 (giữ dữ liệu trong .emulator-data/)
npm run dev         # http://localhost:3000
```
Chờ cả hai sẵn sàng:
```bash
npx --yes wait-on -t 120000 tcp:8080 tcp:9099 tcp:4000 http://localhost:3000
```
Nếu port đã có tiến trình đang chạy thì dùng lại tiến trình đó, không khởi động thêm bản thứ hai.

## 3. Dữ liệu seed
```bash
npm run seed -- reset          # xoá sạch Firestore, Auth, RTDB, Storage
npm run seed -- <scenario>     # VD smoke; scenario từng task nằm ở scripts/seed/scenarios/
```
Seed chỉ chạy khi có `FIRESTORE_EMULATOR_HOST` và `FIREBASE_AUTH_EMULATOR_HOST` (lấy từ `.env.local`). Thiếu biến thì script dừng với thông báo "Chỉ chạy seed trên emulator".

User seed có provider `google.com`, nên hiện trong màn chọn tài khoản giả lập của Auth emulator. Nếu màn đó không liệt kê user, bấm "Add new account" và nhập đúng email đã seed.

## 4. Viewport và người chơi
- Viewport mặc định là **375×812**. Test case nào ghi viewport khác (360×740, 1280×800…) thì đổi theo test case.
- Kiểm tràn ngang bằng điều kiện `document.documentElement.scrollWidth <= window.innerWidth`.
- **Mỗi người chơi dùng một cửa sổ hoặc profile Chrome riêng** để cookie phiên tách biệt. Nếu không tách được cookie, dừng lại và hỏi dev. Không được thay bước UI bằng cách gọi action trực tiếp.

## 5. Kiểm dữ liệu
- Emulator UI: http://localhost:4000 (Authentication, Firestore, Realtime Database, Storage, Functions).
- Đọc qua REST:
  ```bash
  curl "http://127.0.0.1:8080/v1/projects/demo-loto/databases/(default)/documents/_smoke/hello"
  ```

## 6. Ghi kết quả
- Mỗi test case ghi `PASS` hoặc `FAIL` vào bảng kết quả của file `backlog/testcases/T-XXX-*.md`.
- Khi FAIL, ghi lại:
  - bước bị fail
  - kết quả thực tế so với mong đợi
  - ảnh chụp màn hình
  - lỗi console, nếu có
- File task (`backlog/tasks/T-XXX-*.md`) có mục "Kết quả chạy" trỏ tới file test case.

## 7. Dừng
Dừng `npm run emulators` bằng Ctrl+C. Dữ liệu được export vào `.emulator-data/` và nạp lại ở lần chạy sau. Muốn bắt đầu từ trống thì xoá thư mục này hoặc chạy `npm run seed -- reset`.
