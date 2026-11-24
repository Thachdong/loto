---
task: T-009
title: Người trong phòng — online/vé, kick, thu hồi vé (SCR-07)
written_from_commit: 65944ce
last_run: null
summary: null
---

# Test case QC · T-009 Người trong phòng (SCR-07)

## 0. Môi trường
- Như `backlog/testcases/T-006-game-room.md` mục 0 (emulators, dev server, đăng nhập emulator, 375×812).
- Seed `room-members` (alias `t009`, phòng `r_members`, mã `MBR234`): host **An** (`an@example.com`), **Bình** (`binh@example.com`, online, Đỏ A), **Chi** (`chi@example.com`, offline 12 phút, Lam B), **Dũng** (`dung@example.com`, online, chưa lấy vé); ván 1 `waiting`. Presence seed là "ảo": khi mở app thật, presence của người đó được ghi lại theo trạng thái thật.
- Profile: **P1 = An**, **P2 = Bình**, **P3 = Chi**, **P4 = Dũng**.
- Chữ: "Người trong phòng · {n}/16" · "Host" · "(Bạn)" · "Online" · "Offline · {n} phút" · "Chưa lấy vé" · chip "{Màu} {A|B}" · "Kick" · "Thu hồi vé" · "Kick {tên}?" · "Thu hồi vé của {tên}?" · "{tên} đang offline. Vé {màu} sẽ trả về bộ vé." · "Hủy" / "Kick" / "Thu hồi" · "Bấm Mời để gọi bạn vào phòng" · "Không tải được danh sách" + "Thử lại".
- Toast: "{tên} đã bị mời ra khỏi phòng" · "Host đã thu hồi vé của {tên}" · "Chỉ kick được người đã lấy vé" · "{tên} đang online, không thu hồi được" · "Chỉ thu hồi khi ván chờ bắt đầu".
- `data-testid`: `tab-members`, `members-sheet`, `members-title`, `member-row-{uid}` (`data-online`), `member-dot-{uid}`, `member-host-{uid}`, `member-status-{uid}`, `member-ticket-{uid}-{ticketId}`, `member-noticket-{uid}`, `btn-kick-{uid}`, `btn-reclaim-{uid}`, `kick-dialog`, `reclaim-dialog`, `btn-member-cancel`, `btn-member-confirm`, `members-invite-hint`, `members-loading`, `members-error`.

## 1. Ma trận phủ
| AC | TC / test tự động |
|---|---|
| AC-1 | TC-T009-01 · `member-rows.test.ts`, `members-sheet.test.tsx` |
| AC-2 | TC-T009-02 |
| AC-3 | TC-T009-04 · `kick-player.test.ts` |
| AC-4 | TC-T009-05 · `kick-player.test.ts` |
| AC-5 | TC-T009-04 bước 4 · `join-room.test.ts` (BLOCKED_FROM_ROOM) |
| AC-6 | TC-T009-06 |
| AC-7 | TC-T009-01 bước 2 · `kick-player.test.ts`, `members-sheet.test.tsx` |
| AC-8 | `kick-player.test.ts` (automated) |
| AC-9 | TC-T009-03 · `reclaim-player-tickets.test.ts` |
| AC-10 | TC-T009-03 bước 4 · `reclaim-player-tickets.test.ts`, `use-member-actions.test.ts` |
| AC-11 | TC-T009-05 · `member-rows.test.ts` |
| AC-12 | TC-T009-07 · `members-sheet.test.tsx` |
| AC-13 | `rooms-rules.test.ts` (automated) |

## 3. Test case

### TC-T009-01 · Danh sách: thứ tự, online/offline, vé, quyền nút
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, AC-7 | manual |

**Tiền điều kiện:** `npm run seed -- reset && npm run seed -- room-members`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đăng nhập Bình, mở `/room`, bấm tab "Người" | "Người trong phòng · 4/16"; thứ tự An (Host) → Bình (Bạn) → Dũng → Chi; Bình/Dũng chấm xanh "Online"; Chi chấm xám "Offline · 12 phút"; chip "Đỏ A" ở Bình, "Lam B" ở Chi, "Chưa lấy vé" ở Dũng; không có nút nào | ui |
| 2 | P1 | Đăng nhập An, mở `/room`, bấm "Người" | Hàng Bình có "Kick"; hàng Chi có "Thu hồi vé" + "Kick"; hàng An, Dũng không có nút | ui |

**Kết quả:** ⬜

### TC-T009-02 · Cập nhật realtime
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | realtime | AC-2 | manual |

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Giữ sheet "Người" mở | — | ui |
| 2 | P4 | Đăng nhập Dũng, mở `/room`, sheet Vé, lấy Vàng A | ≤ 1 giây hàng Dũng ở P1 hiện chip "Vàng A" và nút "Kick" | ui |
| 3 | P3 | Đăng nhập Chi, mở `/room` | Hàng Chi ở P1 chuyển chấm xanh "Online", nút "Thu hồi vé" biến mất | ui |
| 4 | P3 | Đóng tab | Hàng Chi về "Offline · 0 phút", "Thu hồi vé" hiện lại | ui |

**Kết quả:** ⬜

### TC-T009-03 · Thu hồi vé người offline
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy + lỗi | AC-9, AC-10 | manual |

**Tiền điều kiện:** seed lại `room-members`; P1, P2 mở `/room`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | "Người" → "Thu hồi vé" ở Chi | Dialog "Thu hồi vé của Chi?" + "Chi đang offline. Vé Lam B sẽ trả về bộ vé." | ui |
| 2 | P1 | Bấm "Thu hồi" | Toast "Host đã thu hồi vé của Chi" ở P1, P2; hàng Chi còn, "Chưa lấy vé"; tiêu đề vẫn 4/16 | ui |
| 3 | P2 | Mở sheet Vé | Lam B "Trống" | ui |
| 4 | P1 | Seed lại; P1 mở "Người"; P3 đăng nhập Chi mở `/room` rồi ngay lập tức ở P1 bấm "Thu hồi vé" Chi (nếu nút còn) → "Thu hồi" | Toast "Chi đang online, không thu hồi được" hoặc nút đã biến mất; vé vẫn của Chi | ui |

**Kết quả:** ⬜

### TC-T009-04 · Kick khi ván chờ
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-3, AC-5 | manual |

**Tiền điều kiện:** seed lại `room-members`; P1, P2, P4 mở `/room`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | "Người" → "Kick" ở Bình | Dialog "Kick Bình?" + "Bình sẽ bị đưa ra khỏi phòng và không vào lại được." | ui |
| 2 | P1 | Bấm "Kick" | Toast "Bình đã bị mời ra khỏi phòng" ở P1, P4; hàng Bình biến mất; tiêu đề "3/16"; sheet Vé: Đỏ A "Trống" | ui |
| 3 | P2 | Quan sát | ≤ 1 giây về trang chủ, banner "Bạn đã bị mời ra khỏi phòng "Người trong phòng"." (hoặc "Bạn không còn ở trong phòng." nếu race) | ui |
| 4 | P2 | Nhập mã `MBR234` → "Vào phòng" | "Bạn không thể vào phòng này" | ui |
| 5 | Emulator UI | `rooms/r_members`, `users/u_mb_binh`, RTDB `presence/r_members` | `blocked_uids` có `u_mb_binh`; `current_room_id = null`; không còn node presence Bình | emulator |

**Kết quả:** ⬜

### TC-T009-05 · Kick khi ván đang chạy
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | luồng thay thế | AC-4, AC-11 | manual |

**Tiền điều kiện:** seed lại `room-members`; P1, P2, P4 mở `/room`; P1 bấm "Bắt đầu".

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Mở "Người" | Không có "Thu hồi vé" ở hàng nào; "Kick" vẫn ở Bình, Chi | ui |
| 2 | P1 | "Kick" Bình | Dialog thêm câu "Ván đang diễn ra: vé của Bình bị khóa tới hết ván." → "Kick" | ui |
| 3 | P2 | Quan sát | Về trang chủ | ui |
| 4 | P1 | Sheet Vé | Đỏ A vẫn bị khóa (không lấy được) tới hết ván | ui |
| 5 | P1 | Chờ ván kết thúc (hoặc seed khác) → host xác nhận | Ván mới: Đỏ A "Trống" | ui |

**Kết quả:** ⬜

### TC-T009-06 · Kick người đang offline
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P1 | mất kết nối | AC-6 | manual |

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | — | Seed lại `room-members` (Chi offline) | — | — |
| 2 | P1 | "Người" → "Kick" Chi → "Kick" | Hàng Chi biến mất | ui |
| 3 | P3 | Đăng nhập Chi, mở `/` | Trang chủ, banner "Bạn không còn ở trong phòng." | ui |

**Kết quả:** ⬜

### TC-T009-07 · Phòng chỉ có host
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P2 | biên | AC-12 | manual |

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Seed lại; P1 kick Bình (đang chờ) và Chi; P4 bấm "Rời phòng" | — | ui |
| 2 | P1 | Mở "Người" | Một hàng "An · Host · (Bạn)" + "Bấm Mời để gọi bạn vào phòng" | ui |

**Kết quả:** ⬜
