# T-010 · Lịch sử ván trong phòng (SCR-08)

| Epic | Milestone | Point | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| EPIC-08 | M2 | 2 | T-009 | REVIEW |

## 1. Mục tiêu demo
Sau task này: **thành viên chơi xong 2 ván, mở SCR-04 → bấm "Lịch sử" → thấy thẻ "Ván 2" trên "Ván 1", mỗi thẻ có giờ bắt đầu–kết thúc (GMT+7) và người thắng (ảnh, tên, chip "Vé {màu} {cạnh}") hoặc "Không ai thắng" / "Đã hủy"; ván vừa được host xác nhận tự xuất hiện trên cùng mà không cần tải lại.**

## 2. Phạm vi
| Loại | ID | Ghi chú |
|---|---|---|
| Thao tác | SCR-08.A0 | Listener `rooms/{roomId}/games` where `status in [finished, cancelled]` orderBy `seq_no desc` |
| API | — | Chỉ đọc realtime, không có operation |
| Dữ liệu | TBL-05 `games` | chỉ đọc (`seq_no`, `status`, `result`, `winners`, `started_at`, `ended_at`, `created_at`) |
| Dữ liệu | TBL-06 `players` | chỉ đọc `photo_url` của người thắng trong ván đó |
| Dữ liệu | `firestore.indexes.json` | composite index `games`: `status` ASC + `seq_no` DESC |
| Quyết định | Q-031, Q-039, Q-050 | Chỉ lưu kết quả; chỉ xem khi phòng còn mở; ảnh lấy từ players |
| Phụ trợ | SUP-01 | Lịch sử tự cập nhật khi ván kết thúc |
| NFR | NFR-02, NFR-16 | ≤ 1 giây; giờ GMT+7 |
| Flow | FLOW-13 bước 1–3, A1, A2, E1 | |

**Ngoài phạm vi:** màn chi tiết ván, diễn biến ván (SUP-11 – ngoài MVP); phân trang (số ván ít, không cần).

## 3. Việc cần làm
### UI
- [ ] Sheet SCR-08 mở từ nút "Lịch sử" ở SCR-04: tiêu đề "Lịch sử ván" + ✕.
- [ ] Thẻ ván: "Ván {seq_no}", "{started_at} – {ended_at}" HH:mm GMT+7; ván không có `started_at` (hủy trước khi bắt đầu) → chỉ "Hủy lúc {ended_at}" `[ASSUMED]` (nếu `ended_at` rỗng dùng `created_at`).
- [ ] Kết quả: `result = won` → mỗi phần tử `winners[]` một dòng 🏆 + ảnh (từ `players/{uid}.photo_url` của ván đó; không có → chữ cái đầu `display_name`) + `display_name` + chip "Vé {màu} {cạnh}" (màu từ `color`, cạnh A/B từ `ticket_id`); `no_winner` → "Không ai thắng"; `cancelled` → "Đã hủy".
- [ ] Ảnh người thắng: đọc một lần `players` của từng ván hiển thị (getDocs, cache theo `gameId`) `[ASSUMED]` — không gắn listener cho từng ván.
- [ ] Trạng thái: loading 3 thẻ skeleton; empty "Chưa có ván nào kết thúc" + "Kết quả mỗi ván sẽ hiện ở đây."; lỗi "Không tải được lịch sử" + "Thử lại"; bị từ chối (phòng đóng / không còn ở phòng) → để SCR-04 xử lý đưa về SCR-02 (hành vi T-006).
- [ ] Map màu vé → tên tiếng Việt và màu chip dùng chung với SCR-05 (T-005).

### API / Backend
- [ ] Không có Server Action. Kiểm lại dữ liệu ván do T-007 ghi đủ field cho thẻ: `winners[].{uid, display_name, ticket_id, color}`, `result`, `started_at`, `ended_at`.

### Data
- [ ] `firestore.indexes.json`: composite index collection `games` (scope collection): `status` ASCENDING, `seq_no` DESCENDING.
- [ ] `firestore.rules`: không đổi (đọc theo cây con phòng); thêm test đọc lịch sử.
- [ ] Seed `history`: phòng có ván 1 `finished` `won` (1 người thắng), ván 2 `finished` `won` (2 người đồng thắng), ván 3 `finished` `no_winner`, ván 4 `cancelled` (không `started_at`), ván 5 `waiting` (hiện tại) `[ASSUMED]` — ván hủy và không ai thắng khó tạo bằng UI nên dùng seed.

## 4. Acceptance criteria
| # | Given | When | Then | Nguồn |
|---|---|---|---|---|
| AC-1 | Seed `history` | Thành viên mở sheet "Lịch sử" | Thấy 4 thẻ theo thứ tự Ván 4, 3, 2, 1 (không có ván 5 đang chờ); giờ HH:mm GMT+7 đúng với dữ liệu seed | FLOW-13 bước 1–3, NFR-16 |
| AC-2 | Seed `history` | Xem thẻ Ván 2 | 2 dòng 🏆, mỗi dòng ảnh (hoặc chữ cái đầu khi player không có ảnh), tên, chip "Vé {màu} {cạnh}" đúng `winners` | FLOW-13 bước 3, Q-050 |
| AC-3 | Seed `history` | Xem thẻ Ván 3 và Ván 4 | Ván 3 "Không ai thắng"; Ván 4 "Đã hủy" và chỉ hiện giờ hủy | FLOW-13 bước 3, Q-031 |
| AC-4 | Sheet Lịch sử đang mở ở player B, ván hiện tại vừa có KINH | Host bấm "Xác nhận kết thúc ván" | ≤ 1 giây thẻ ván vừa xong xuất hiện trên cùng, không tải lại | FLOW-13 A1, SUP-01, NFR-02 |
| AC-5 | Phòng mới, chưa ván nào kết thúc | Mở Lịch sử | "Chưa có ván nào kết thúc" + "Kết quả mỗi ván sẽ hiện ở đây." | FLOW-13 E1 |
| AC-6 | Người không ở phòng / phòng đã đóng | Query `rooms/{roomId}/games` bằng client SDK | Bị Security Rules từ chối | FLOW-13 A2, Q-039, NFR-09 |
| AC-7 | Query lịch sử | Chạy trên Emulator với `firestore.indexes.json` | Query `status in [...]` + `orderBy seq_no desc` chạy không báo thiếu index | SCR-08.A0 |

## 5. Test
### Unit / integration (Vitest + Emulator)
| Case | Phủ AC |
|---|---|
| Hàm thuần `toHistoryCard(game, playersById)`: won 1 / 2 người thắng, no_winner, cancelled không `started_at`, người thắng không có ảnh → chữ cái đầu, format giờ GMT+7 (UTC 16:30 → 23:30) | AC-1, AC-2, AC-3 |
| Query lịch sử trên Emulator với seed `history`: trả 4 ván đúng thứ tự `seq_no` giảm dần, không có ván `waiting` | AC-1, AC-7 |
| Rules: thành viên đọc được `games` + `players`; người ngoài / người có `current_room_id` khác bị từ chối | AC-6 |

### Kịch bản test trên Chrome (AI chạy)
Môi trường: localhost + Emulator, viewport 375×812. **P1 = Host An**, **P2 = Bình**.

| Bước | Profile | Thao tác | Kết quả mong đợi | AC |
|---|---|---|---|---|
| 1 | — | Seed `room-basic` (phòng mới) | — | — |
| 2 | P2 | Mở `/room` → "Lịch sử" | "Chưa có ván nào kết thúc" + "Kết quả mỗi ván sẽ hiện ở đây." | AC-5 |
| 3 | P1, P2 | Chơi 1 ván tới KINH đúng (dùng seed số rao sẵn/đồng hồ nhanh như kịch bản T-007); để sheet Lịch sử của P2 mở | — | — |
| 4 | P1 | Bấm "Xác nhận kết thúc ván" | ≤ 1 giây sheet ở P2 hiện thẻ "Ván 1" với người thắng, giờ bắt đầu–kết thúc | AC-4 |
| 5 | P1, P2 | Chơi ván 2 tương tự, xác nhận | Thẻ "Ván 2" ở trên "Ván 1" | AC-1, AC-4 |
| 6 | — | Seed `history`; P2 tải lại `/room`, mở "Lịch sử" | 4 thẻ Ván 4 → 1; Ván 2 có 2 người thắng với chip vé đúng màu/cạnh; Ván 3 "Không ai thắng"; Ván 4 "Đã hủy" chỉ có giờ hủy | AC-1, AC-2, AC-3 |
| 7 | Emulator UI | Đối chiếu `games/*` | Giờ hiển thị = `started_at`/`ended_at` + 7 giờ | AC-1 |

AC-6, AC-7 phủ bằng test rules / query trên Emulator.

### Dữ liệu seed / tiền điều kiện
- Auth Emulator: An, Bình (+ Chi cho ván đồng thắng trong seed).
- Seed `room-basic`, seed `history` (mục Data).

## 6. Definition of Done
- [ ] DoD chung (xem `backlog.md` mục 1)
- [ ] Composite index có trong `firestore.indexes.json`, query chạy trên Emulator không lỗi
- [ ] Rules test đọc lịch sử (allow thành viên / deny người ngoài)

## 7. Ghi chú
- `[ASSUMED]` Ảnh người thắng đọc một lần qua `getDocs(players)` của từng ván, cache theo `gameId`.
- `[ASSUMED]` Ván hủy không có `started_at` hiện "Hủy lúc {ended_at}". Thực tế ván `cancelled` chỉ sinh khi phòng đóng (hết hạn/host đăng xuất) nên người chơi hầu như không thấy khi phòng còn mở — vẫn hiển thị theo spec, kiểm bằng seed.
- Point 2 khớp checklist.
