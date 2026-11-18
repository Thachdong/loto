# T-012 · Cài đặt trong phòng: mode dò, tiếng rao, nhịp quay (SCR-11)

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-10 | M2 | 3 | T-011 | TODO |

## 1. Mục tiêu demo
Sau task này: **player mở SCR-04 → bấm "Cài đặt" → chuyển "Tự dò" sang "Auto" giữa ván → mọi số đã rao trên vé tự được đánh dấu, số vừa rao nổi bật, hàng thiếu 1 số có viền "chờ"; tắt "Tiếng rao" → số vẫn hiện nhưng không phát tiếng. Host bấm + trên "Nhịp quay" lên 8 giây → cả phòng thấy toast "Nhịp quay: 8 giây/số", các số sau cách nhau 8 giây. "Hồ sơ cá nhân ›" mở SCR-10 và ← quay lại phòng.**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-11.A1 | Đổi mode dò — client, localStorage `loto.trackMode` |
| Thao tác | SCR-11.A2 | Bật/tắt tiếng rao — client, localStorage `loto.sound` |
| Thao tác | SCR-11.A3 | Đổi nhịp quay (host) |
| API | `updateRoom` → `updateRoomAction({roomId, drawIntervalSec})` | tạo mới |
| Dữ liệu | TBL-02 `draw_interval_sec`, `last_event` | ghi |
| Dữ liệu | localStorage `loto.trackMode`, `loto.sound`, ô đánh dấu `{gameId}:{ticketId}` | client |
| Rule | BR-15 | Nhịp 3–15 giây, mặc định 5, áp dụng từ số kế tiếp |
| Rule | BR-20 | Tự dò / Auto; cả hai phải tự bấm KINH; Tự dò không gợi ý |
| Rule | BR-04 | Hiện "Phòng hết hạn lúc HH:mm" |
| Phụ trợ | SUP-10, SUP-02, SUP-01 | Hiệu ứng Auto; tiếng rao; toast `interval_changed` |
| NFR | NFR-09, NFR-02, NFR-16 | Chỉ host đổi nhịp; toast ≤ 1 giây; giờ GMT+7 |
| Flow | FLOW-15 bước 1–3, A1, A2; FLOW-06 A3 | |

**Ngoài phạm vi:** vẽ hiệu ứng Auto trên vé và phát tiếng rao (đã làm ở T-006 với giá trị mặc định — task này chỉ thêm điều khiển và chuyển trạng thái); nội dung SCR-10 (T-011); đổi tên phòng (không làm – ENT-02).

## 3. Việc cần làm
### UI
- [ ] Sheet thấp SCR-11 mở từ nút "Cài đặt" ở SCR-04, nằm trên thanh KINH/thanh nút dưới: tiêu đề "Cài đặt" + ✕.
- [ ] Segmented "Tự dò" (mặc định) / "Auto" + mô tả "Auto tự đánh dấu số đã rao trên vé; bạn vẫn phải tự bấm KINH." Ghi `loto.trackMode`; T-006 đổi từ đọc hằng mặc định sang đọc store cài đặt (React context + localStorage).
- [ ] Chuyển sang Auto khi ván không `waiting`: vé hiển thị ô đánh dấu = các số đã rao có trên vé (tính từ `called_numbers`), bật hiệu ứng SUP-10 (số vừa rao viền đỏ + `navigator.vibrate`, hàng thiếu 1 số viền "chờ"); ô Tự dò không bị chạm được trong Auto `[ASSUMED]` (theo SCR-04: chạm ô chỉ khi Tự dò).
- [ ] Chuyển Auto → Tự dò: chép các số đã rao có trên vé vào localStorage `{gameId}:{ticketId}` (gộp với ô đã tự đánh dấu trước đó) để giữ nguyên ô đánh dấu, tắt hiệu ứng (FLOW-15 A1, Q-050).
- [ ] Switch "Tiếng rao" Bật (mặc định)/Tắt + "Chỉ áp dụng trên máy của bạn"; ghi `loto.sound`. Tắt → dừng âm đang phát ngay, không phát số mới. Bật khi chưa có `AudioContext` → chạy SCR-04.A1 (tạo `AudioContext` + tải manifest) trong chính lần chạm đó.
- [ ] Nhịp quay: host → stepper −/+ bước 1, giới hạn 3–15 (nút − khóa ở 3, + khóa ở 15), hiện "{n} giây" + "áp dụng từ số kế tiếp"; player → text "{n} giây/số (host chỉnh)" theo `rooms.draw_interval_sec` realtime.
- [ ] Debounce 600 ms sau lần bấm cuối rồi gọi `updateRoomAction` (Q-050); hiển thị giá trị lạc quan trong lúc chờ. Lỗi mạng/khác → trả stepper về giá trị server + toast "Chưa đổi được nhịp quay"; `NOT_ROOM_HOST` → chuyển sang dạng chỉ đọc.
- [ ] Hàng "Hồ sơ cá nhân ›" → `/profile` (SCR-10); ← ở SCR-10 về lại `/room` (Q-050; bổ sung cạnh SCR-11 → SCR-10).
- [ ] Dòng "Phòng hết hạn lúc HH:mm" từ `rooms.expires_at` GMT+7.
- [ ] localStorage không khả dụng (throw) → giữ cài đặt trong bộ nhớ trang, không vỡ UI.
- [ ] Toast `interval_changed` "Nhịp quay: {n} giây/số" trong bảng toast SCR-04 (kiểm đã có từ T-006, thiếu thì thêm).

### API / Backend
- [ ] `updateRoomAction({roomId, drawIntervalSec})` theo `updateRoom`: phiên → Zod (`drawIntervalSec` integer, `additionalProperties false`; sai kiểu → `VALIDATION_FAILED`) → ngoài 3–15 → `422 DRAW_INTERVAL_INVALID` `[ASSUMED]` (bảng mã lỗi; Zod chỉ kiểm kiểu) → transaction: lazy expiry; không phải thành viên → `NOT_ROOM_MEMBER`; không phải host → `NOT_ROOM_HOST`.
- [ ] Ghi `draw_interval_sec`, `updated_at`, `last_event = {type: interval_changed, text: "Nhịp quay: {n} giây/số", actor_uid, at}`. Không sửa `games.next_call_at` đang hẹn — nhịp mới áp dụng từ lần `drawNumber` kế tiếp (`next_call_at = now + draw_interval_sec`, ADR-05). Đổi khi ván chưa chạy/đang tạm dừng vẫn được.
- [ ] Giá trị không đổi → vẫn trả 200, không ghi `last_event` `[ASSUMED]`.
- [ ] Trả `RoomSettings {roomId, drawIntervalSec}`.
- [ ] Kiểm `drawNumber` (T-006) đọc `draw_interval_sec` mới nhất trong transaction (không cache).

### Data
- [ ] Không thêm field. `firestore.rules` không đổi (client cấm ghi `rooms`).
- [ ] Seed `room-running-auto`: ván `running`, đã rao 10 số, trong đó vé Bình có 4 số và một hàng thiếu 1 số `[ASSUMED]`.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | Bình ở ván `running`, mode Tự dò, chưa đánh dấu ô nào, đã rao 10 số (4 số có trên vé) | Mở Cài đặt, chọn "Auto" | Ngay lập tức 4 ô đó được đánh dấu; hàng thiếu 1 số có viền "chờ"; số rao tiếp theo có trên vé được viền đỏ nổi bật; dòng trạng thái "… mode Auto"; vẫn phải tự bấm KINH (không tự gửi) | FLOW-15 bước 1–2, BR-20, SUP-10 |
| AC-2 | Bình đang Auto giữa ván | Chọn "Tự dò" | Các ô đã đánh dấu giữ nguyên, hiệu ứng nổi bật/"chờ" tắt; số rao mới không tự đánh dấu; chạm ô đánh dấu được | FLOW-15 A1, BR-20 |
| AC-3 | Bình chọn Auto, tắt tiếng | Tải lại trang / ván mới bắt đầu / sang phòng khác trên cùng máy | Vẫn Auto và tắt tiếng | FLOW-15 A2, Q-047 |
| AC-4 | Tiếng rao đang bật, ván `running` | Bình tắt "Tiếng rao" | Âm đang phát dừng; số mới vẫn hiện trên bảng/vé nhưng không phát tiếng; người khác vẫn nghe | FLOW-15 bước 3, SUP-02 |
| AC-5 | Bình vào phòng chưa chạm "Bật tiếng", switch đang Tắt | Bật switch | Tiếng rao phát ở số kế tiếp (không cần chạm "Bật tiếng" thêm) | SCR-11.A2, NFR-14 |
| AC-6 | Ván `running`, nhịp 5 giây | Host bấm + 3 lần (5 → 8) | Chỉ 1 request sau 600 ms; `rooms.draw_interval_sec = 8`; ≤ 1 giây cả phòng thấy toast "Nhịp quay: 8 giây/số", player thấy "8 giây/số (host chỉnh)"; số đang chờ giữ hẹn cũ, các khoảng sau giữa 2 số liên tiếp ≈ 8 giây (±1 giây) | BR-15, FLOW-06 A3, NFR-02 |
| AC-7 | Stepper ở 3 / 15 | — | Nút − khóa ở 3, nút + khóa ở 15; gọi action với 2 / 16 → `DRAW_INTERVAL_INVALID`; với 3 / 15 → thành công | BR-15 (biên) |
| AC-8 | Bình (player) | Mở Cài đặt; gọi `updateRoomAction` trực tiếp | Không có stepper, chỉ text; action trả `NOT_ROOM_HOST`, `draw_interval_sec` không đổi | NFR-09, BR-21 |
| AC-9 | Ván `waiting` | Host đổi nhịp sang 10 | Thành công, toast hiện; ván sau khi Bắt đầu rao cách nhau ≈ 10 giây | SCR-11 trạng thái "Đổi nhịp khi ván chưa chạy" |
| AC-10 | Host mất mạng | Bấm + | Stepper về giá trị server, toast "Chưa đổi được nhịp quay" | SCR-11.A3 lỗi |
| AC-11 | Ở phòng | Bấm "Hồ sơ cá nhân ›" rồi ← | Mở SCR-10; ← về lại SCR-04 của phòng | SCR-11 component 5, Q-050 |
| AC-12 | Phòng tạo lúc 14:00 GMT+7 | Mở Cài đặt | "Phòng hết hạn lúc 22:00" | BR-04, NFR-16 |
| AC-13 | localStorage bị chặn (throw) | Đổi mode / tiếng | UI vẫn đổi và áp dụng trong phiên trang, không lỗi | SCR-11.A1 lỗi |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| Hàm thuần `autoMarks(grid, calledNumbers)` → tập ô đánh dấu; `waitingRows(grid, marks)` → hàng thiếu đúng 1 số | AC-1 |
| Hàm thuần `switchToManual(grid, calledNumbers, manualMarks)` → gộp số đã rao trên vé với ô tự đánh dấu cũ | AC-2 |
| Store cài đặt: đọc/ghi `loto.trackMode`, `loto.sound`; localStorage throw → fallback bộ nhớ | AC-3, AC-13 |
| `updateRoomAction`: host đổi 8 → ghi `draw_interval_sec`, `last_event interval_changed`, không đổi `next_call_at`; 3 và 15 ok; 2, 16 → `DRAW_INTERVAL_INVALID`; `"8"` (string) → `VALIDATION_FAILED` | AC-6, AC-7 |
| `updateRoomAction`: player → `NOT_ROOM_HOST`; người ngoài → `NOT_ROOM_MEMBER` | AC-8 |
| `drawNumber` sau khi đổi nhịp: `next_call_at = now + 8s` (fake clock) | AC-6, AC-9 |
| Hook debounce stepper: 3 lần bấm trong 600 ms → 1 lần gọi với giá trị cuối; lỗi → revert | AC-6, AC-10 |

### Kịch bản test trên Chrome (AI chạy)
Môi trường: localhost + Emulator, viewport 375×812. **P1 = Host An**, **P2 = Bình**.

| Bước | Profile | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|---|
| 1 | — | Seed `room-running-auto`; P1, P2 mở `/room`, chạm "Bật tiếng" | Ván đang quay | — |
| 2 | P2 | Mở "Cài đặt" | Mode "Tự dò", Tiếng rao Bật, "5 giây/số (host chỉnh)" (không có stepper), "Phòng hết hạn lúc HH:mm" đúng `expires_at` + 7 giờ | AC-8, AC-12 |
| 3 | P2 | Chọn "Auto", đóng sheet | 4 số đã rao trên vé được đánh dấu; hàng thiếu 1 số có viền "chờ"; dòng trạng thái "mode Auto" | AC-1 |
| 4 | P2 | Chờ số kế tiếp có trên vé (hoặc seed số kế) | Ô đó viền đỏ nổi bật và tự đánh dấu; KINH không tự gửi | AC-1 |
| 5 | P2 | Cài đặt → "Tự dò"; chờ thêm 1 số có trên vé | Ô cũ vẫn đánh dấu, không còn viền "chờ"; số mới không tự đánh dấu; chạm ô đánh dấu được | AC-2 |
| 6 | P2 | Tắt "Tiếng rao" | Số mới vẫn hiện, không có tiếng (kiểm qua DevTools: không có audio node phát / quan sát tab không có biểu tượng loa); P1 vẫn có tiếng | AC-4 |
| 7 | P2 | Tải lại trang | Vẫn Tự dò + tiếng Tắt (chọn Auto rồi tải lại → vẫn Auto) | AC-3 |
| 8 | P2 | Bật lại "Tiếng rao" (sau tải lại chưa chạm "Bật tiếng") | Số kế tiếp phát tiếng | AC-5 |
| 9 | P1 | Mở Cài đặt, bấm + 3 lần nhanh | Hiện "8 giây"; sau ~600 ms toast "Nhịp quay: 8 giây/số" ở P1 và P2; P2 thấy "8 giây/số (host chỉnh)" | AC-6 |
| 10 | P1 | Ghi thời điểm 3 số tiếp theo trên bảng số (hoặc `called_numbers` + `next_call_at` trong Emulator UI) | Số đầu tiên theo hẹn cũ, các khoảng sau ≈ 8 giây | AC-6 |
| 11 | P1 | Bấm − tới 3, + tới 15 | − khóa ở 3; + khóa ở 15 | AC-7 |
| 12 | P1 | DevTools Offline, bấm − | Stepper trả về giá trị server, toast "Chưa đổi được nhịp quay" | AC-10 |
| 13 | P1 | Online; bấm "Hồ sơ cá nhân ›" rồi ← | Mở SCR-10, quay lại SCR-04 đúng phòng | AC-11 |
| 14 | — | Seed `room-waiting`; P1 đổi nhịp 10, Bắt đầu ván | Toast hiện; các số cách nhau ≈ 10 giây | AC-9 |
| 15 | P2 | DevTools Console chạy override `localStorage.setItem` throw, đổi mode | UI vẫn đổi, không lỗi trắng trang | AC-13 |

### Dữ liệu seed / tiền điều kiện
- Auth Emulator: An, Bình.
- Seed `room-running-auto`, `room-waiting` (T-011); bộ audio mẫu từ T-006.

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] Test deny `updateRoom` cho player và người ngoài
- [ ] T-006 đọc mode/tiếng từ store cài đặt (không còn hằng mặc định); smoke lại kịch bản chính T-006

## 7. Ghi chú
- `[ASSUMED]` Ngoài 3–15 trả `422 DRAW_INTERVAL_INVALID` theo bảng mã lỗi (SCR-11 ghi `VALIDATION_FAILED`, không xảy ra trên UI vì stepper giới hạn).
- `[ASSUMED]` "Áp dụng từ số kế tiếp" hiểu theo ADR-05/`drawNumber`: hẹn `next_call_at` đang chờ giữ nguyên, nhịp mới tính từ lần rao kế tiếp.
- `[ASSUMED]` Đổi về cùng giá trị không ghi `last_event`.
- `[ASSUMED]` Mode Auto không cho chạm ô tự đánh dấu.
- Point 3 khớp checklist (logic hiệu ứng Auto đã có ở T-006).
