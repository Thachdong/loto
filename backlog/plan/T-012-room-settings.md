---
task: T-012
title: Cài đặt trong phòng — mode dò, tiếng rao, nhịp quay (SCR-11)
status: approved
approved_at: 2026-11-24       # dev yêu cầu làm trực tiếp ("làm tính năng tab Cài đặt")
branch: feature/dongt/T-012-room-settings
plan_commit:
---

# Plan T-012 · Cài đặt (SCR-11)

## 1. Tóm tắt
Tab "Cài đặt" mở sheet SCR-11: cách dò (Dò tay / Tự dò), tiếng rao (switch), nhịp quay (stepper host 3–15, debounce 600 ms → `updateRoomAction`; player chỉ đọc), "Hồ sơ cá nhân ›", "Phòng hết hạn lúc HH:mm".

## 2. Nguồn
Task `backlog/tasks/T-012-room-settings.md`; api-contract `updateRoom`, `RoomSettings`; BR-15, BR-20; FLOW-15, FLOW-06 A3. Đã có: mode dò + `syncTicketMarks` (Q-068), tiếng rao (`sound-pref`), toast `interval_changed`, `drawNumber` đọc `draw_interval_sec` trong transaction.

## 3. Thiết kế
| Lớp | File | Nội dung |
|---|---|---|
| shared | `room/shared/schemas/update-room.ts`, `room/shared/types.ts`, `room/shared/domain/draw-interval.ts` (+test) | input, `RoomSettings`, giới hạn 3–15 |
| db | `room/db/room.repository.ts` | `setDrawIntervalInTx` |
| server | `room/server/services/room-settings.service.ts`, `room/server/actions/update-room.action.ts` | transaction theo contract |
| client | `settings/client/hooks/use-draw-interval.ts`, `settings/client/components/settings-sheet.tsx` (+test) | debounce, revert, sheet |
| client | `game/client/hooks/use-play-mode.ts`, `game/client/lib/sound-pref.ts` | fallback bộ nhớ khi localStorage throw |
| client | `game/client/components/room-screen.tsx` | tab "Cài đặt" → sheet |

## 5. Giả định
- Tên chế độ theo quyết định trước của dev: "Dò tay" (manual) / "Tự dò" (auto) — spec ghi "Tự dò"/"Auto".
- `/profile` (T-011) chưa có → hàng "Hồ sơ cá nhân ›" hiện khóa kèm "Sắp có".
- Seed: dùng lại `game-running` (T-006) thay cho `room-running-auto`.

## 8. Kết quả
(điền khi xong)
