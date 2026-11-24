---
task: T-010
title: Lịch sử ván trong phòng (SCR-08)
status: done
approved_at: 2026-11-24       # dev yêu cầu làm trực tiếp ("hãy làm tính năng trong tab Lịch sử")
branch: feature/dongt/T-010-game-history
plan_commit: null
---

# Plan T-010 · Lịch sử ván (SCR-08)

## 1. Tóm tắt
Tab "Lịch sử" ở thanh dưới SCR-04 mở sheet "Lịch sử ván": thẻ ván đã kết thúc (mới nhất trên cùng), giờ bắt đầu–kết thúc GMT+7, người thắng (🏆 ảnh/chữ cái đầu, tên, chip "Vé {màu} {cạnh}") hoặc "Không ai thắng" / "Đã hủy" (+ "Hủy lúc HH:mm"). Tự cập nhật realtime khi ván mới kết thúc. Chỉ đọc, không có Server Action.

## 2. Nguồn
Task `backlog/tasks/T-010-game-history.md`; ui-ux/scr-08-history.md; database TBL-05/TBL-06; FLOW-13; Q-031, Q-039, Q-050; NFR-02, NFR-16. Code tái dùng: `useCollectionListener`, `formatTimeVN`, `TICKET_PALETTE`, `Avatar`, `Sheet`, rules đọc `games`/`players` cho thành viên (T-006 `game-rules.test.ts`).

## 3. Thiết kế (feature `history`)
| Lớp | File | Nội dung |
|---|---|---|
| shared | `history/shared/domain/history-card.ts` (+test) | `toHistoryCard`, `sortHistory` (thuần) |
| client | `history/client/hooks/use-game-history.ts` | listener `rooms/{r}/games`, lọc `finished/cancelled`, sắp `seq_no` giảm; `getDocs(players)` 1 lần/ván để lấy ảnh |
| client | `history/client/components/history-sheet.tsx` (+test) | sheet SCR-08, loading/empty/error |
| client | `game/client/components/room-screen.tsx` | tab "Lịch sử" → `HistorySheet` |
| shared | `vi.ts` | nhóm `history.*` |
| seed | `scripts/seed/scenarios/t006.ts` (`history`, alias `t010`) | ván 1 won, 2 won×2, 3 no_winner, 4 cancelled, 5 waiting |

## 4. Bước
Inline tuần tự: domain → hook + sheet + mount → seed + test → QC → đóng task.

## 5. AC → kiểm
| AC | Kiểm |
|---|---|
| AC-1 thứ tự + giờ GMT+7 | unit `history-card.test.ts`; emulator `seed-scenarios.test.ts` (history); component `history-sheet.test.tsx` |
| AC-2 2 người thắng, ảnh/chữ đầu, chip | unit + component |
| AC-3 no_winner / cancelled chỉ giờ hủy | unit + component + emulator |
| AC-4 realtime khi ván kết thúc | listener (manual TC) |
| AC-5 empty | component |
| AC-6 rules deny người ngoài | emulator `game-rules.test.ts` (sẵn từ T-006) |
| AC-7 index | **Không cần**: đọc cả collection `games` của phòng rồi lọc/sắp ở client (xem 6) |

## 6. Giả định
- `[ASSUMED]` Không dùng query `status in [...] orderBy seq_no` → không cần composite index; số ván mỗi phòng ít (≤ vài chục) nên lọc ở client. Lệch task/SCR-08.A0 (không ảnh hưởng hành vi).
- `[ASSUMED]` (task) ảnh người thắng đọc 1 lần `players` của từng ván có người thắng, cache theo gameId.
- Bỏ chrome-tester (dev); QC chạy tay theo `backlog/testcases/T-010-game-history.md`.
- Thứ tự waterfall: T-008/T-009 chưa làm; T-010 không phụ thuộc dữ liệu của 2 task đó.

## 8. Kết quả
- Typecheck ✓, lint ✓, unit + emulator 693/693 ✓, `next build` ✓.
- QC: `backlog/testcases/T-010-game-history.md` — 4 TC, chạy tay.
