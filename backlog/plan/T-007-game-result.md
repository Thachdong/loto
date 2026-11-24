---
task: T-007
title: Kết quả ván (SCR-09): host duyệt KINH — xác nhận kết thúc / bác bỏ quay tiếp, chúc mừng, ván mới
status: approved          # draft | approved | in-progress | done
approved_at: 2026-11-24       # YYYY-MM-DD khi dev duyệt
branch: feature/dongt/T-007-game-result
plan_commit: null        # hash commit plan
---

# Plan T-007 · Kết quả ván SCR-09

> **Plan theo specs mới (specs thắng, Q-055..Q-058).** File task `backlog/tasks/T-007-game-result.md` lỗi thời: **bỏ** cửa sổ đồng kinh 5 giây, `closeClaimWindow`, SCR-09.A2, `claim_window*` (dev xác nhận 2026-11-24). Thay bằng: duyệt danh sách `claims`, `confirmGame` (cần ≥1 lượt win) và `rejectClaims` mới (toàn hụt), chỉ chép player online (BR-29).

## 1. Tóm tắt
Sau task: có lượt KINH → ván `awaiting_confirm` → thẻ SCR-09 nửa trên SCR-04 (thay thẻ tạm T-006): "KINH! · Chờ host duyệt ({k} lượt)", danh sách lượt (✅ Đúng – Hàng n: 5 số / ❌ Hụt), vé thu nhỏ (ô đã rao tô đậm, hàng thắng viền xanh, "▸ Xem vé"). Host thấy **"Xác nhận kết thúc ván"** (khi có lượt đúng) hoặc **"Bác bỏ – quay tiếp"** (khi toàn hụt). Player thấy "⏳ Đang chờ host duyệt…", lời nhắc KINH, dòng host offline. Xác nhận → ván `finished`, ván mới `waiting`, overlay toàn màn "🎊 Chúc mừng! 🎊" + pháo giấy + tiếng chúc mừng + "Đóng". Bác bỏ → `claims=[]`, ván quay lại `running`/`paused`, toast "{tên} kinh hụt". Hết 90 số → overlay "Ván {n} kết thúc — không ai thắng".

## 2. Nguồn đã đọc
- Specs: api-contract › `confirmGame`, `rejectClaims`, `GameConfirmResult`, `Winner`, `GameState`, mã lỗi `GAME_NOT_AWAITING_CONFIRM`, `CLAIM_HAS_WIN`, `NO_WINNING_CLAIM` (đã có trong `errors.ts`, `vi.ts err.*`); ui-ux/scr-09-result.md (toàn bộ); database › TBL-05 (`claims`, `winners`, `result`, `confirmed_by`, `ended_at`, `resume_status`); business BR-07, BR-11, BR-17, BR-19, BR-28, BR-29; FLOW-08 4–11, A5, E5; FLOW-14 A1.
- Code tái dùng: `game-room.ts` (`inGameRoom`), `rollover.service.ts` (`loadRolloverPlayers`, `rolloverToNewGame` — đã thiết kế cho T-007), `game.mapper` (`resultOfClaims`, `finishedGamePatch`, `winnerFromClaim`), `finishAndCloseInTx`, `readRoomPresence`, `draw.service` (mẫu nhánh `closing`), `claim-card.tsx`, `use-game-actions.ts`, `game-errors.ts`, `use-current-room.mapGameDoc`, `PaperTicket`, `use-audio`/`select-clip`, seed `t006.ts` (`game-awaiting`, `game-awaiting-expiring`, `game-nearly-done`).

## 3. Thiết kế
### 3.1 File theo lớp
| Lớp | File | Tạo/Sửa | Nội dung |
|---|---|---|---|
| shared | `game/shared/schemas/{confirm-game,reject-claims}.ts` | Tạo | `{roomId, gameId}` strictObject |
| shared | `game/shared/types.ts` | Sửa | `GameConfirmResult`, `Winner` |
| shared | `room/shared/types.ts` | Sửa | `GameView` + `result`, `winners: WinnerView[]`, `confirmedBy` |
| shared | `core/shared/i18n/vi.ts` | Sửa | nhóm `result.*`, `toast.claimsRejected`, `err.confirmNetwork/rejectNetwork/claimHasWin` |
| db | `room/db/game.repository.ts` | Sửa | `confirmGameInTx` (winners, `confirmed_by`), `rejectClaimsInTx` |
| server | `game/server/services/result.service.ts` | Tạo | `confirmGame`, `rejectClaims` |
| server | `game/server/actions/{confirm-game,reject-claims}.action.ts` | Tạo | action |
| seed | `scripts/seed/scenarios/t007.ts`, `index.ts` | Tạo/Sửa | `result-awaiting-win` (B miss + C win), `result-awaiting-miss` (B miss), `result-host-claims` (H win), `result-host-offline` |
| client | `room/client/hooks/use-current-room.ts` | Sửa | map `result/winners/confirmed_by` |
| client | `game/client/hooks/use-finished-game.ts` | Tạo | giữ gameId ván vừa có KINH/đang chạy; khi `current_game_id` đổi → nghe doc ván cũ; `finished` → mở overlay tới khi bấm Đóng (SCR-09.A0, AC-21) |
| client | `game/client/hooks/use-host-online.ts` | Tạo | RTDB `presence/{roomId}/{hostUid}.online` |
| client | `game/client/components/review-card.tsx` | Tạo | thay `claim-card.tsx` (xóa): #1,#2,#4,#5,#6,#9,#10 |
| client | `game/client/components/result-overlay.tsx` | Tạo | `finished`: #1,#3,#4,#7,#8,#11 + pháo giấy CSS (tắt khi reduced-motion) |
| client | `game/client/components/mini-ticket.tsx` | Tạo | lưới 9×9 thu nhỏ, `called` đậm, hàng thắng viền xanh |
| client | `use-game-actions.ts`, `game-errors.ts`, `room-screen.tsx`, `use-audio.ts` | Sửa | `confirm`/`reject`, map lỗi, mount, tiếng chúc mừng khi overlay `won` |

### 3.2 Contract
```ts
confirmGameAction({roomId, gameId}): ActionResult<GameConfirmResult>
// {finishedGameId, result:'won', winners: Winner[], nextGameId: string|null, roomStatus}
rejectClaimsAction({roomId, gameId}): ActionResult<GameState>
type Winner = {uid, displayName, ticketId, color, row, claimedAt: string}
GameView += { result: 'won'|'no_winner'|null; winners: WinnerView[]; confirmedBy: string|null }
WinnerView = {uid, displayName, ticketId, color, row, claimedAtMs}
```
`data-testid`: `review-card`, `review-item-{uid}-{ticketId}` (`data-result`), `btn-review-view-{uid}-{ticketId}`, `mini-ticket` (`data-row-win`), `btn-confirm-game`, `btn-reject-claims`, `review-waiting`, `review-host-offline`, `review-nudge`, `result-overlay` (`data-result`), `result-winner-{uid}-{ticketId}`, `result-keep-line`, `btn-result-close`, `confetti`.

### 3.3 Luồng
- **confirmGame** (tx, presence đọc trước tx): `inGameRoom` → host (`NOT_ROOM_HOST`) → `GAME_STALE` → `status≠awaiting_confirm` → `GAME_NOT_AWAITING_CONFIRM` → không có claim win → `NO_WINNING_CLAIM`. Phòng `closing` (lazy expiry) → `finishAndCloseInTx` + clear `current_room_id` + xóa presence (như draw.service), `nextGameId=null`, `roomStatus=closed`. Ngược lại: ván `finished/won`, `winners`, `confirmed_by`, `ended_at`; `rolloverToNewGame` (player online còn trong phòng), `last_event=game_finished` "Ván {n} kết thúc · {k} người thắng".
- **rejectClaims**: host → stale → awaiting → có win → `CLAIM_HAS_WIN`; ngược lại `claims=[]`, `status=resume_status` (`running` → `next_call_at=now+N`; `paused` → `pause_reason=host`), `resume_status=null`, `last_event=claims_rejected` text "A, B kinh hụt". Nếu lazy expiry đổi phòng `closing` → vẫn cho quay tiếp (giống resume).
- **Client**: `useFinishedGame(roomId, currentGame)` nhớ `lastActiveGameId` (game status ≠ waiting); khi `current_game_id` đổi và ván cũ ≠ ván hiện tại → listener doc ván cũ; `status=finished` → overlay. Overlay giữ dữ liệu ván cũ tới khi Đóng. Dòng #11: mình có vé ở ván cũ (doc player ván cũ đọc 1 lần) và có/không trong players ván mới.

## 4. Các bước (inline tuần tự — task nhỏ, chung file `room-screen`)
| Step | Worker | Phạm vi | Commit |
|---|---|---|---|
| S1 | server-worker (contract) | schemas, types, stub 2 action, `vi.ts` | `feat(game): add confirm and reject contracts and result i18n keys` |
| B1 | db-worker | `game.repository` + seed `t007` | `feat(game): add game confirm/reject writes and result seed scenarios` |
| B2 | server-worker | `result.service`, 2 action, `tests/emulator/game/{confirm-game,reject-claims}.test.ts` | `feat(game): implement confirmGame and rejectClaims` |
| C1 | ui-worker | `mapGameDoc`, `use-finished-game`, `use-host-online`, actions/errors + test | `feat(game): add finished game and host presence hooks` |
| C2 | ui-worker | `mini-ticket`, `review-card` (xóa `claim-card`), mount | `feat(game): add KINH review card with host confirm and reject` |
| C3 | ui-worker | `result-overlay`, confetti, tiếng chúc mừng | `feat(game): add game result overlay` |
| M | orchestrator | gate đầy đủ, qc-testcase-writer, đóng task (bỏ chrome-tester theo dev) | `test(qc): …` / `chore(backlog): mark T-007 as done` |

## 5. AC (viết lại theo specs mới) → kiểm chứng
| AC | Nội dung | Kiểm |
|---|---|---|
| AC-1 | `awaiting_confirm` → thẻ "KINH! · Chờ host duyệt (k lượt)", danh sách đúng/hụt + hàng & 5 số, vé thu nhỏ; vé + thanh KINH vẫn bấm được | component `review-card.test.tsx` |
| AC-2 | Player khác KINH thêm khi chờ → thêm vào cuối danh sách (đã có ở T-006 server) | emulator `create-claim.test.ts` (sẵn) + component |
| AC-3 | Host: có lượt win → chỉ nút Xác nhận; toàn miss → chỉ nút Bác bỏ; player không có nút, thấy dòng chờ + lời nhắc (chỉ khi có vé chưa claim) | component |
| AC-4 | Host offline → player thấy "Host đang offline…" | component (`hostOnline=false`) |
| AC-5 | confirmGame: ván `finished/won`, `winners` = claims win, `confirmed_by`, `ended_at`; ván mới `waiting` `seq+1`; chép player online còn trong phòng, không chép offline/đã rời; `last_event=game_finished` | emulator `confirm-game.test.ts` |
| AC-6 | confirmGame lỗi: không host `NOT_ROOM_HOST`; ván không chờ `GAME_NOT_AWAITING_CONFIRM`; toàn miss `NO_WINNING_CLAIM`; gameId cũ `GAME_STALE` | emulator |
| AC-7 | confirmGame khi phòng quá hạn → ván `finished`, phòng `closed`, `nextGameId=null` | emulator |
| AC-8 | Host tự KINH đúng rồi tự xác nhận được | emulator |
| AC-9 | rejectClaims: `claims=[]`, về `running` + `next_call_at=now+N` / về `paused` giữ `pause_reason=host`; `resume_status=null`; `last_event=claims_rejected` liệt kê tên | emulator `reject-claims.test.ts` |
| AC-10 | rejectClaims có lượt win → `CLAIM_HAS_WIN`, không đổi; toast "Vừa có vé KINH đúng — hãy xác nhận" | emulator + unit `game-errors` |
| AC-11 | Sau xác nhận: mọi máy thấy overlay "🎊 Chúc mừng! 🎊" + "Ván n kết thúc · k người thắng", vé thắng, "Vé của bạn vẫn được giữ cho ván n+1"; giữ dữ liệu ván cũ tới khi Đóng | component `result-overlay.test.tsx` + hook test |
| AC-12 | Người offline lúc kết thúc → "Bạn offline lúc ván kết thúc nên vé đã được trả lại…" | component |
| AC-13 | Hết 90 số → overlay "Ván n kết thúc — không ai thắng" + Đóng | component + hook |
| AC-14 | Lỗi mạng → toast "Chưa xác nhận được, thử lại" / "Chưa bác bỏ được, thử lại"; nút bấm lại được | unit `game-errors` |
| AC-15 | Pháo giấy tắt khi `prefers-reduced-motion` | component |

## 6. Giả định
- `[ASSUMED]` Phòng quá hạn khi chờ duyệt: SCR-04 đã đưa về SCR-02 (T-006); **không** hiện "trang chúc mừng ngắn" trước khi về (đơn giản hóa, dùng banner hết hạn có sẵn).
- `[ASSUMED]` `rejectClaims` khi phòng vừa sang `closing` vẫn cho quay tiếp (ván đang diễn ra, BR-04) giống `resumeGame`.
- `[ASSUMED]` Rung khi có lượt KINH mới: `navigator.vibrate(80)` nếu có, bỏ qua lỗi.
- `[ASSUMED]` Tiếng chúc mừng: dùng clip `celebrate` trong manifest audio mẫu nếu có; không có → im.
- Host 1 mình chơi được: hợp lệ theo BR-14 (không đổi).
- Bỏ chrome-tester (dev 2026-11-24); QC test tay theo `backlog/testcases/T-007-*.md`.

## 7. Rủi ro
- Listener ván cũ sau khi `current_game_id` đổi: nếu client vào lại sau khi ván đã xong sẽ không thấy overlay (chấp nhận — chỉ hiện khi đang theo dõi lúc chuyển).
- Tạo ván mới + chép player chung transaction với nhánh closing → test emulator cả 2 nhánh.

## 8. Kết quả (orchestrator điền khi xong)
- Commits: …
- Lint/typecheck/test: …
- QC: …
