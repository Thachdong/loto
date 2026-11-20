---
name: chrome-tester
description: Tự khởi động Firebase Emulator + Next.js dev + seed, mở Chrome (Claude in Chrome) ở viewport điện thoại 375×812 và chạy test case QC trong backlog/testcases/T-XXX-*.md (smoke task trước + P0/P1 task hiện tại), nhiều người chơi bằng nhiều cửa sổ/profile, kiểm UI/URL/toast/Emulator UI, điền kết quả PASS/FAIL kèm ảnh. Dùng khi orchestrator gọi sau khi viết test case, hoặc dev/QC gọi /chrome-tester T-XXX [TC-...|--smoke|--all].
argument-hint: T-XXX [TC-ID ...] [--smoke] [--all]
---

# chrome-tester

Phạm vi chạy mặc định: smoke của mọi task đã `DONE` trước đó (mục 2 trong file test case của chúng) → P0 + P1 của `T-XXX`. `--all` thêm P2. `--smoke` chỉ smoke. Truyền TC-ID → chỉ các TC đó (dùng khi chạy lại sau fix).
Bỏ qua TC `automated` (ghi `⏭ automated`) và `manual` (ghi `⏭ manual — cần dev/QC làm tay`).

## 1. Dựng môi trường (trong `implement/webapp/`)
1. Kiểm `.env.local` tồn tại (không có → copy từ `.env.example`, báo dev).
2. Kiểm port đang dùng: `lsof -i :3000 -i :8080 -i :9099 -i :4000`. Đã chạy sẵn → dùng lại, không khởi động trùng.
3. Chưa chạy → Bash `run_in_background: true`:
   - `npm run emulators`
   - `npm run dev`
4. Chờ sẵn sàng (không dùng sleep tay): `npx --yes wait-on -t 120000 tcp:8080 tcp:9099 tcp:4000 http://localhost:3000`.
5. Seed: `npm run seed -- reset && npm run seed -- <scenario theo "Môi trường chung" của file TC>`. TC có tiền điều kiện seed riêng → seed lại trước TC đó.
6. Lỗi (thiếu Java, firebase-tools, port bận bởi tiến trình khác) → dừng, báo dev dòng lỗi quyết định + cách sửa.

## 2. Mở Chrome
1. **Đọc skill `anthropic-skills:chrome-browser` trước** (cách nạp tool `mcp__claude-in-chrome__*` bằng một lần ToolSearch, tab, quyền site, dialog cần tránh).
2. Không thao tác trên tab dev đang mở; mở tab/cửa sổ mới cho từng profile.
3. Đặt viewport 375×812 (tool resize window). TC ghi viewport khác → đổi theo TC.
4. **Nhiều người chơi** (P1, P2…): mỗi profile cần cookie riêng.
   - Cách 1: mỗi profile một cửa sổ Chrome profile riêng có extension Claude in Chrome, nếu tool cho chọn.
   - Không tách được cookie → **dừng và hỏi dev** (VD dev mở sẵn profile thứ 2) — không giả lập bằng cách gọi action thẳng mà vẫn ghi PASS.
5. Chrome extension không kết nối được → báo dev bật extension; không chuyển sang công cụ khác khi chưa được đồng ý.

## 3. Chạy từng TC
Với mỗi TC theo thứ tự trong file:
1. Dựng tiền điều kiện (seed, xóa site data/cookie qua DevTools hoặc trang `chrome://settings` nếu TC yêu cầu "profile sạch").
2. Làm từng bước đúng cột Thao tác. Sau mỗi bước kiểm theo cột **Cách kiểm**:
   - `url`: URL tab hiện tại.
   - `ui`/`toast`: đọc nội dung trang (text/accessibility tree), so khớp chữ chính xác; dùng `data-testid` nếu có.
   - `emulator-ui`: mở tab `http://localhost:4000` (Firestore/Auth/RTDB) xem doc/field; hoặc đọc qua REST emulator bằng Bash (`curl http://localhost:8080/v1/projects/demo-loto/databases/(default)/documents/<path>`).
   - `cookie`: DevTools Application hoặc `document.cookie` (cookie HttpOnly không đọc được bằng JS → xem trong DevTools/thông tin request).
   - `console`: đọc console log, không có error.
   - `layout`: kiểm không có thanh cuộn ngang (`document.documentElement.scrollWidth <= innerWidth`).
3. Bước sai mong đợi → chụp màn hình, ghi lại thực tế, **dừng TC đó** (không làm tiếp các bước sau), chuyển TC kế.
4. Không tự sửa code trong lúc chạy. Không sửa kết quả mong đợi cho khớp thực tế.
5. Flaky (realtime chậm): chờ tối đa 3 giây rồi kiểm lại một lần trước khi kết luận FAIL.

## 4. Ghi kết quả
- Trong file test case, thay dòng `**Kết quả:**` của TC:
  - `✅ PASS · 2026-11-20`
  - `❌ FAIL bước 3: thấy "…" thay vì "…" · ảnh: backlog/testcases/evidence/T-002/TC-T002-03.png · 2026-11-20`
  - `⏭ SKIP: <lý do>`
- Ảnh: lưu được ra file thì lưu `backlog/testcases/evidence/T-XXX/<TC-ID>.png`; không lưu được → mô tả chi tiết thực tế trong dòng kết quả.
- Smoke của task trước: ghi kết quả vào file test case **của task đó** dưới dòng `**Smoke YYYY-MM-DD (khi làm T-XXX):**`.
- Frontmatter: `last_run`, `summary` (VD `P0 6/6 · P1 8/9 · P2 chưa chạy`).
- Không commit (orchestrator lo).

## 5. Dọn dẹp
Tiến trình nền do skill này khởi động → để chạy nếu orchestrator còn vòng fix; xong hẳn thì dừng chúng. Đóng tab đã mở; không đóng tab của dev.

## Báo cáo
Bảng TC: ID · ưu tiên · kết quả · bước fail + thực tế ngắn. Phân loại fail: **code** / **test case sai** / **môi trường**. Smoke hồi quy của task trước (có hỏng gì không).
