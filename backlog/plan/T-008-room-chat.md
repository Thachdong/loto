---
task: T-008
title: Chat trong phòng (SCR-06)
status: done
approved_at: 2026-11-24       # dev yêu cầu làm trực tiếp ("làm tính năng chat")
branch: feature/dongt/T-008-room-chat
plan_commit: 50a1137
---

# Plan T-008 · Chat (SCR-06)

## 1. Tóm tắt
Tab "Chat" mở sheet SCR-06: 50 tin mới nhất realtime, cuộn lên tải thêm 50, gửi tin optimistic qua `sendMessageAction`, rate limit 5 tin/10 giây, badge chưa đọc trên nút "Chat".

## 2. Nguồn
Task `backlog/tasks/T-008-room-chat.md`; api-contract `sendMessage`, `Message`; TBL-04, TBL-01 `chat_recent_at`; BR-23, SUP-07; FLOW-12. Rules: cây con `rooms/{id}/**` đã chỉ cho thành viên đọc, cấm ghi (T-003) — chỉ thêm test cho `messages`.

## 3. Thiết kế (feature `chat`)
| Lớp | File | Nội dung |
|---|---|---|
| shared | `chat/shared/domain/message-rules.ts` (+test) | `messageLength`, `normalizeMessage`, `checkChatRate` |
| shared | `chat/shared/schemas/send-message.ts`, `chat/shared/types.ts` | input Zod (chỉ kiểu), `Message` |
| db | `chat/db/message.repository.ts`, `auth/db/user.repository.ts` | tạo doc tin; đọc/ghi `chat_recent_at` trong tx |
| server | `chat/server/services/chat.service.ts`, `chat/server/actions/send-message.action.ts` | transaction: lazy expiry → thành viên → rate → ghi |
| client | `chat/client/hooks/use-chat-messages.ts`, `use-chat-unread.ts` | listener limitToLast 50 + tải trang cũ; badge theo localStorage |
| client | `chat/client/components/chat-sheet.tsx` (+test) | bubble, ô nhập, đếm ký tự, optimistic, lỗi, gửi lại |
| client | `game/client/components/room-screen.tsx`, `bottom-bar.tsx` | mở sheet + badge |
| seed | `scripts/seed/scenarios/t008.ts` (`chat-history`, alias `t008`) | host + 2 player + 120 tin |

## 5. Giả định
Theo `[ASSUMED]` của task (code point, 422 cho rỗng/dài, tự cuộn khi ở cuối, badge ở task này).

## 8. Kết quả
- `sendMessageAction` + feature `chat` (domain, listener 50 tin + trang cũ, badge, sheet optimistic/gửi lại/rate limit/không còn quyền).
- Rules không đổi (cây con phòng đã cấm ghi); thêm test `messages`.
- Seed `chat-history` / `t008`. Unit + emulator 740/740 pass, build OK. Bỏ chrome-tester; QC test tay theo `backlog/testcases/T-008-room-chat.md`.
- Chưa có seed `room-basic` (task gọi tên) — test case dùng `room-members` (T-009).
