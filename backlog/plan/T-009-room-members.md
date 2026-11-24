---
task: T-009
title: Người trong phòng — online/vé, kick, thu hồi vé (SCR-07)
status: done
approved_at: 2026-11-24       # dev yêu cầu làm trực tiếp ("implement tính năng quản lý player tab Người")
branch: feature/dongt/T-009-room-members
plan_commit: 5185639
---

# Plan T-009 · Người trong phòng (SCR-07)

## 1. Tóm tắt
Tab "Người" ở thanh dưới SCR-04 mở sheet "Người trong phòng · {member_count}/16": hàng mỗi node RTDB `presence/{roomId}` (ảnh + chấm online, tên, "Host"/"(Bạn)", "Online"/"Offline · n phút", chip vé hoặc "Chưa lấy vé"). Host thấy "Kick" (player có vé, không phải host) và "Thu hồi vé" (offline + có vé + ván `waiting`), mỗi nút qua dialog xác nhận. Server Action mới `kickPlayerAction`.

## 2. Nguồn
Task `backlog/tasks/T-009-room-members.md`; api-contract `kickPlayer`, `reclaimPlayerTickets`, `KickResult`; BR-06, BR-13, BR-21, BR-22; FLOW-10; Q-048, Q-050.
Đã có sẵn (tái dùng, không đổi): `reclaimPlayerTickets` (T-005), banner `kicked` từ `last_event` (T-006 `leave-reason`), toast `member_kicked`/`tickets_reclaimed` (`last-event-toast`), `joinRoom` chặn `BLOCKED_FROM_ROOM` (T-004), RTDB rules đọc theo `presence_access`.

## 3. Thiết kế
| Lớp | File | Nội dung |
|---|---|---|
| db | `room/db/room.repository.ts` | `kickMemberInTx` (blocked_uids arrayUnion, member_count, last_event) |
| shared | `room/shared/schemas/kick-player.ts`, `room/shared/types.ts` | `KickPlayerInput`, `KickResult` |
| server | `room/server/services/room-kick.service.ts`, `room/server/actions/kick-player.action.ts` | transaction theo contract; sau commit xóa presence (lỗi chỉ log) |
| shared | `members/shared/domain/member-rows.ts` (+test) | `buildMemberRows`, `sortMembers` (host → mình → online → offline → tên), quyền nút |
| client | `members/client/hooks/use-room-presence.ts` | listener RTDB `presence/{roomId}` |
| client | `members/client/components/members-sheet.tsx` (+test) | sheet + dialog kick/thu hồi, loading/empty/error |
| client | `game/client/components/room-screen.tsx` | tab "Người" → `MembersSheet` |
| shared | `vi.ts` | nhóm `members.*` |
| seed | `scripts/seed/scenarios/t006.ts` (`room-members`, alias `t009`) | An host, Bình online Đỏ A, Chi offline Xanh B, Dũng online chưa vé |

## 4. Bước
Inline tuần tự: server kick (+ test emulator) → domain + hook + sheet + mount → seed + test → QC → đóng task.

## 5. Giả định
- Theo task `[ASSUMED]`: nguồn danh sách = node presence; xóa RTDB sau commit, lỗi chỉ log; banner chấp nhận cả câu chung khi race.
- Thứ tự lỗi kick: thành viên → host → tự kick → có doc player + `current_room_id = roomId`.

## 8. Kết quả
- `kickPlayerAction` mới (room feature); feature `members` (domain, hook presence, sheet + dialog kick/thu hồi) gắn vào tab "Người".
- Tái dùng không đổi: `reclaimPlayerTickets`, banner kick, toast `member_kicked`/`tickets_reclaimed`, `BLOCKED_FROM_ROOM`.
- Seed `room-members` / `t009`. Unit + emulator 717/717 pass, build OK. Bỏ chrome-tester theo yêu cầu dev; QC test tay theo `backlog/testcases/T-009-room-members.md`.
- Lệch nhỏ: toast kick dùng câu sẵn có "{tên} đã bị mời ra khỏi phòng" (T-006) thay "{tên} bị mời ra khỏi phòng".
