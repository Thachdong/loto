---
task: T-006
title: Chơi trọn ván ở Phòng chơi (SCR-04): bắt đầu, rao số, dò vé, báo KINH, rời phòng, hết hạn
status: done            # draft | approved | in-progress | done
approved_at: 2026-11-22        # YYYY-MM-DD khi dev duyệt
branch: feature/dongt/T-006-game-room
plan_commit: 24226fa        # hash commit plan
---

# Plan T-006 · Phòng chơi SCR-04

> **Plan theo specs mới (specs thắng).** File task `backlog/tasks/T-006-game-room.md` lỗi thời (ghi chú đầu file, Q-055..Q-058) — mọi chỗ lệch xem mục 6.3.

## 1. Tóm tắt
Sau task: host + 2 player (3 profile Chrome 375×812) vào `/room` (SCR-04 thật, thay `room-lobby`): host Bắt đầu → server rao ngay số đầu, cứ N giây host (hoặc player dự phòng sau 5k giây) gọi `drawNumber`; nghe rao sau khi chạm "Bật tiếng"; tự dò/Auto; bấm KINH → lượt được **append `games.claims`** kèm gợi ý win/miss, ván sang `awaiting_confirm` (dừng quay, vẫn nhận KINH), cả phòng thấy toast "{tên} KINH!" + **thẻ tạm** liệt kê lượt Kinh; tạm dừng/tiếp tục; hết 90 số → ván `finished` `no_winner` + ván mới; rời phòng giữa ván (dialog cảnh báo, vé bị hủy) / host rời = đóng phòng; hết hạn 8 giờ (lazy expiry + `expireRoom`).
**Ranh giới T-007:** T-007 làm SCR-09 đầy đủ (thẻ/overlay), `confirmGame`, `rejectClaims`, tiếng chúc mừng/kinh hụt phát theo `claims_rejected`, overlay no_winner. Ở T-006 ván `awaiting_confirm` chỉ thoát được bằng `leaveRoom`/hết hạn (`expireRoom`/lazy expiry tự `finished`). `rolloverToNewGame` (service dùng chung) do T-006 tạo để T-007 gọi lại.

## 2. Nguồn đã đọc
- Task: `backlog/tasks/T-006-game-room.md` (toàn bộ), `backlog/tasks/T-007-game-result.md` (phạm vi/ranh giới).
- Specs: api-contract › `startGame`, `pauseGame`, `resumeGame`, `drawNumber`, `createClaim`, `leaveRoom` (204), `expireRoom`, schema `GameState`/`DrawResult`/`ClaimResult`/`RoomExpireResult`, bảng mã lỗi (`GAME_*`, `CLAIMS_CLOSED`, `TICKET_ALREADY_CLAIMED`, `ROOM_CLOSING`, `NO_TICKETS_HELD`, `DRAW_TOO_EARLY`, `ROOM_NOT_EXPIRED`; đã có đủ trong `core/shared/errors.ts`); database › TBL-02, TBL-03, TBL-05 (`claims`, `resume_status`, bỏ `claim_window*`), TBL-06, TBL-08; actions.md (dòng 5–12); ui-ux/scr-04-room.md (toàn bộ, gồm #19 `join_code`, #21/#23 dialog); idea FLOW-03/06/07/08/11/14, BR-04, 11, 14–17, 19–22, 25, 26, 28, 29, 30; tech-stack ADR-05, ADR-06, ADR-08.
- Code hiện có: `room-expiry.service.ts` (`planLazyExpiry`/`applyLazyExpiry`), `room.repository.ts`, `game.doc.ts` (đã có `claims`/`resume_status`), `ticket.repository.ts` (`listPlayersInTx`, `readRoomPresence`, `deletePlayerInTx`), `use-current-room.ts`, `use-room-event-toast.ts`, `use-presence.ts`, `PaperTicket`, `TicketSheet`, `room-lobby.tsx`, `seed-room.ts`, `scripts/seed/scenarios/t005.ts`, `firestore.rules`, `database.rules.json`.
- Next.js docs (`node_modules/next/dist/docs/01-app/03-api-reference/01-directives/`): `use-server.md` (return values chỉ trả data UI cần), `use-client.md`.

## 3. Thiết kế
### 3.1 Feature & file theo lớp
Feature mới `game` (quay số, Kinh, audio, SCR-04). `room` giữ lazy expiry/`expireRoom`/`leaveRoom` (dữ liệu phòng). `ticket` chỉ sửa `PaperTicket` (client).

| Lớp | File | Tạo/Sửa | Nội dung |
|---|---|---|---|
| shared | `game/shared/types.ts` | Tạo | `GameState`, `DrawResult`, `ClaimResult`, `ClaimView` |
| shared | `game/shared/constants.ts` | Tạo | `TICKET_ORDER` (16 vé Đỏ A→Hồng B, dẫn xuất từ `TICKET_COLORS`), `BACKUP_STEP_MS=5000`, `DRAW_EARLY_TOLERANCE_MS=300`, `MAX_NUMBER=90` |
| shared | `game/shared/schemas/{start-game,pause-game,resume-game,draw-number,create-claim}.ts` | Tạo | `z.strictObject` (`roomId`,`gameId`,`seq` int 0–89, `ticketId` regex `TicketId`) |
| shared | `room/shared/schemas/{leave-room,expire-room}.ts` | Tạo | `{roomId}` |
| shared | `room/shared/types.ts` | Sửa | `GameView` thêm `nextCallAt`, `pauseReason`, `resumeStatus`, `claims[]`, `playerCount`; `RoomView` thêm `drawIntervalSec`; `RoomExpireResult` |
| shared | `game/shared/domain/check-claim.ts` (+test) | Tạo | `checkClaim(grid, called) → {win,row}` (row nhỏ nhất) |
| shared | `game/shared/domain/pick-next-number.ts` (+test) | Tạo | `pickNextNumber(called, randomInt)` |
| shared | `room/shared/domain/decide-expiry.ts` (+test) | Tạo | `decideExpiry({roomStatus,gameStatus,now,expiresAt})` → `none\|cancel_and_close\|mark_closing\|finish_and_close\|close` (không còn `claim_window`) |
| shared | `game/shared/domain/{backup-order,draw-fire-at,auto-effects,ticket-layout,last-event-toast,select-clip,marks-store}.ts` (+test) | Tạo | Domain thuần phía client (xem 3.2); `marks-store` nhận `Storage` tiêm vào |
| db | `game/db/game.repository.ts` | Tạo | `startGameInTx`, `setGamePausedInTx`, `setGameRunningInTx`, `appendDrawInTx`, `finishGameInTx`, `appendClaimInTx`, `createNextGameInTx`, `copyPlayersInTx` |
| db | `game/db/game.mapper.ts` (+test) | Tạo | `claimFromDoc/ToDoc`, `winnerFromClaim` |
| db | `room/db/room.repository.ts` | Sửa | `closeRoomInTx(reason)` (`expired`\|`host_left`), `setRoomCalledNumbersInTx`, `setRoomGameInTx`, `finishAndCloseInTx` |
| db | `ticket/db/ticket.repository.ts` | Sửa | `deletePlayersInTx`, `getPlayerStatusInTx` (users.current_room_id của player) |
| db | `scripts/seed/lib/seed-room.ts` | Sửa | thêm tùy chọn `drawIntervalSec, calledNumbers, nextCallAt, startedAt, pauseReason, claims, resumeStatus, lastEvent` |
| seed | `scripts/seed/scenarios/t006.ts`, `scripts/seed/index.ts` | Tạo/Sửa | scenario ở 3.4 |
| server | `room/server/services/room-expiry.service.ts` | Sửa | thêm nhánh `awaiting_confirm` → finish (`winners` = claims win; không có → `no_winner`) + đóng; `closing` + ván đã `finished/cancelled` → đóng; dùng `decideExpiry` |
| server | `room/server/services/room-expire.service.ts`, `room/server/actions/expire-room.action.ts` | Tạo | `expireRoomAction` (`NOT_ROOM_MEMBER`, `ROOM_NOT_EXPIRED`, idempotent) |
| server | `room/server/services/room-leave.service.ts`, `room/server/actions/leave-room.action.ts` | Tạo | `leaveRoomAction` → `data: null`; player/host (3.3) |
| server | `game/server/services/game-lifecycle.service.ts` + `actions/{start,pause,resume}-game.action.ts` | Tạo | |
| server | `game/server/services/draw.service.ts` + `actions/draw-number.action.ts` | Tạo | `drawNumber`, `rolloverToNewGame` (export cho T-007) |
| server | `game/server/services/claim.service.ts` + `actions/create-claim.action.ts` | Tạo | |
| server | (có điều kiện) `ticket.service.ts`, `invite/.../join-room.service.ts`, `room.service.ts` | Sửa nhẹ | chỉ khi test AC-39 cho thấy chưa gọi đúng lazy expiry; mặc định không sửa |
| client | `ticket/client/components/paper-ticket.tsx` (+test) | Sửa | props `size:'single'\|'double'`, `marks`, `onCellTap`, `autoHit`, `waitingRows`, `markedStyle` |
| client | `game/client/hooks/use-game-room.ts` | Tạo | listener `players` + `tickets` của mình, claims; ghép `useCurrentRoom` |
| client | `room/client/hooks/use-current-room.ts` | Sửa | `mapRoomDoc`/`mapGameDoc` thêm field mới (3.2) |
| client | `game/client/hooks/{use-server-time-offset,use-draw-scheduler,use-expiry-timer,use-wake-lock,use-marks,use-room-toasts,use-connection}.ts` | Tạo | |
| client | `game/client/audio/{audio-engine,use-audio}.ts` + `components/sound-gate.tsx` | Tạo | |
| client | `game/client/components/{room-screen,room-header,number-panel,host-controls,my-tickets,kinh-bar,claim-card,bottom-bar,board90-sheet,invite-sheet,leave-dialog}.tsx` | Tạo | UI SCR-04 |
| client | `room/client/hooks/use-room-event-toast.ts` | Sửa→thay | thay bằng `use-room-toasts` (đủ 16 `last_event.type`); xóa file cũ nếu không còn dùng |
| client | `room/client/components/room-lobby.tsx` (+test) | Xóa | thay bằng `RoomScreen`; `room/client/index.ts` sửa export |
| client | `game/client/index.ts` | Tạo | export `RoomScreen` |
| app | `src/app/room/page.tsx` | Sửa | RSC mỏng → `<RoomScreen>` |
| i18n | `core/shared/i18n/vi.ts` (+test) | Sửa (S1) | toàn bộ key mục 3.2 |
| assets | `public/audio/manifest.json`, `public/audio/v0/**`, `scripts/make-sample-audio.sh` | Tạo | bộ audio mẫu (ADR-08) |
| test | `tests/emulator/game/{start-pause-resume,draw-number,create-claim,game-rules,claim-latency}.test.ts`, `tests/emulator/room/{leave-room,expire-room}.test.ts`, mở rộng `room-expiry.test.ts`, `tests/emulator/game/game-fixtures.ts` | Tạo/Sửa | |

Số file ước tính: shared ≈ 28 (gồm test), db ≈ 7, server ≈ 18 (service + action + test), client ≈ 42 (gồm test), app 1, seed 3, assets ≈ 3 + clip.

Kiểm giao tập file giữa lane: `backend` = `shared/domain/{check-claim,pick-next-number,decide-expiry}`, `db/**`, `server/**`, `scripts/seed/**`, `tests/emulator/**`; `client` = `client/**`, `app/**`, `shared/domain/{backup-order,draw-fire-at,auto-effects,ticket-layout,last-event-toast,select-clip,marks-store}`, `public/audio/**`, `scripts/make-sample-audio.sh`; `main` = `shared/{types,constants,schemas}`, stub action, `vi.ts`. Giao nhau = rỗng.

### 3.2 Contract (lane client chỉ dựa vào đây)
**Action (đều trả `ActionResult<T>`, auth `required`):**
```ts
startGameAction({roomId, gameId})        → GameState
pauseGameAction({roomId, gameId})        → GameState
resumeGameAction({roomId, gameId})       → GameState
drawNumberAction({roomId, gameId, seq})  → DrawResult
createClaimAction({roomId, gameId, ticketId}) → ClaimResult
leaveRoomAction({roomId})                → null            // api 204
expireRoomAction({roomId})               → RoomExpireResult
type GameState = {gameId; seqNo; status: GameStatus; playerCount; startedAt: string|null; nextCallAt: string|null}
type DrawResult = {drawn: boolean; number: number|null; seq: number; nextCallAt: string|null; gameStatus: GameStatus}
type ClaimResult = {result:'win'|'miss'; ticketId; row: number|null; gameStatus: GameStatus}
type RoomExpireResult = {roomStatus: RoomStatus; gameStatus: GameStatus}
```
Mã lỗi theo api-contract (x-errors từng op). `DRAW_TOO_EARLY` kèm `details[0] = {code:'nextCallAt', nextCallAt: ISO}` `[ASSUMED]` dạng detail.

**Model client (camelCase, từ listener):**
- `RoomView` + `drawIntervalSec`, `calledNumbers: number[]` (đã có? thêm nếu thiếu).
- `GameView` = `{id, seqNo, status, pauseReason, nextCallAt: Date|null, claims: ClaimView[], resumeStatus, playerCount}`; `ClaimView = {uid, displayName, ticketId, color, result:'win'|'miss', row, claimedAtMs}`.
- `PlayerView = {uid, displayName, ticketIds: TicketId[]}`.
- `lastEvent.text` do server soạn cho: `game_started` "Ván {n} bắt đầu", `game_finished` "Ván {n} kết thúc", `claim_submitted` "{tên} KINH!", `member_left`, `room_closed` ("Host đã đóng phòng"); client `lastEventToast(lastEvent, me)` dùng `text` khi có, không có thì map theo type (đủ 16 type TBL-02 + 2 câu cục bộ).

**Route:** `/room` (giữ). Không route mới; sheet/dialog là state cục bộ.

**i18n (S1 thêm vào `vi.ts`):** nhóm `room.*` (header, `status.{waiting,running,paused,awaiting_confirm,...}` kèm "Chờ host duyệt KINH", chip "⏱ Còn {mm:ss}", "Đóng sau ván này", "Mời", "Rời"), `panel.*` ("Chưa rao số nào", "Nhịp quay {n} giây/số", "Số thứ {n}/90", "Số kế tiếp sau {n} giây", "⏸ Host đã tạm dừng", "⏳ Chờ host duyệt KINH", "Bảng 90 ›"), `host.*` (Bắt đầu/Tạm dừng/Tiếp tục, "{x}/16 vé đã có chủ · {n} người trong phòng", "Cần ít nhất 1 người lấy vé"), `me.*` (3 dòng trạng thái #10, "Bạn chưa có vé", "Chọn vé", "Bạn đang xem ván này. Lấy vé khi ván kết thúc."), `kinh.*` ("KINH", "Kinh vé {màu} {A/B}", "Đã KINH vé này"), `claim.*` (thẻ tạm: tiêu đề, gợi ý "vé đủ hàng"/"chưa đủ hàng"), `board.*`, `invite.*` (link, "Mã phòng", "Copy mã", "Đã copy link", "Đã copy mã phòng", "Chia sẻ…", hạn "HH:mm"), `leave.*` (3 dialog: player không ván / player đang chơi cảnh báo / host "Đóng phòng"), `sound.*` ("Chạm để bật tiếng", "Không tải được tiếng rao"), `conn.*` ("Mất kết nối – đang kết nối lại…"), `toast.*` 16 type + "Phòng sẽ hết hạn sau 15 phút" + "Phòng sẽ đóng khi ván này kết thúc", `err.*` map lỗi action → toast (SCR-04 §3: `NO_TICKETS_HELD` "Cần ít nhất 1 người lấy vé", `ROOM_CLOSING` "Phòng sắp hết hạn, không bắt đầu ván mới", `NOT_TICKET_HOLDER` "Vé này không tham gia ván", `TICKET_ALREADY_CLAIMED` "Vé này đã báo KINH, chờ host duyệt", `CLAIMS_CLOSED` "Ván đã kết thúc", lỗi mạng "Chưa gửi được KINH, bấm lại" / "Không rời được phòng, thử lại"), `leaveBanner` (đã có từ T-003: `left`, `expired`, `host_left`). Mọi key client cần phải có sau S1; thêm sau → main chen commit nhỏ.

**Hook/prop chính:** `useDrawScheduler({room, game, players, meUid, offsetMs})`; `useServerTimeOffset(): number` (RTDB `.info/serverTimeOffset`, cập nhật thêm từ `DRAW_TOO_EARLY`); `useMarks(gameId, ticketId, storage)`; `PaperTicket` thêm `size`. `data-testid`: `room-header`, `game-subtitle`, `expiry-chip`, `btn-invite`, `btn-leave`, `last-number`, `called-count` ("n/90"), `next-countdown`, `recent-numbers`, `btn-board90`, `host-bar`, `btn-start`/`btn-pause`/`btn-resume`, `host-hint`, `me-status`, `ticket-{id}` + `data-cell`/`data-marked`/`data-hit`/`data-waiting`, `no-ticket-card`, `spectator-note`, `kinh-bar`, `btn-kinh`, `kinh-sheet-{id}`, `claim-card`, `claim-item-{uid}-{ticketId}`, `bottom-bar`, `tab-{tickets|chat|members|history|settings}`, `sheet-coming-soon`, `sound-gate`, `board90`, `board-cell-{n}`, `invite-sheet`, `invite-link`, `invite-code`, `btn-copy-link`, `btn-copy-code`, `btn-share`, `leave-dialog`, `btn-leave-confirm`, `conn-banner`, `toast` (sonner). Dataset: `document.documentElement.dataset.wakelock`.

### 3.3 Luồng chính (nghiệp vụ theo specs mới)
- **`startGame`** (tx): lazy expiry → host → `GAME_STALE` → `waiting` → phòng `active` & `now<expires_at` (`ROOM_CLOSING`; nếu lazy expiry vừa đóng/chuyển `closing` thì commit phần hết hạn rồi trả `ROOM_CLOSING`) → xóa player `ticket_ids` rỗng hoặc `users.current_room_id≠roomId` → 0 player → `NO_TICKETS_HELD` (không ghi) → chép tên/ảnh, `player_count`, `started_at`, `status=running`, `rooms.called_numbers=[pickNextNumber([])]`, `next_call_at=now+N`, `last_event=game_started`.
- **`pause`/`resume`:** như api (không `loop_version`); `resume` được cả khi phòng `closing`; `next_call_at=now+N`.
- **`drawNumber`:** lazy expiry → `GAME_STALE` → caller là host hoặc có doc player của ván **và** `current_room_id==roomId` (`NOT_ROOM_MEMBER`) → `running` (`GAME_NOT_RUNNING`) → `seq≠len` ⇒ `drawn:false` → `now<next_call_at−300ms` ⇒ `DRAW_TOO_EARLY` → append số + `next_call_at=now+draw_interval_sec`. Đủ 90: ván `finished` `no_winner`, `ended_at`, `next_call_at=null`, `last_event=game_finished`("Ván n kết thúc"); phòng `active` → `rolloverToNewGame` (ván mới `waiting` `seq_no+1`, `current_game_id`, `game_count+1`, **chép chỉ player còn trong phòng VÀ đang online** (BR-29, presence RTDB đọc **trước** tx), `called_numbers` giữ tới lần Bắt đầu sau); phòng `closing` → đóng phòng. Log `{op:'drawNumber',roomId,gameId,uid,role,seq,drawn,code}`.
- **`createClaim`:** `ticketId` regex → thành viên (`NOT_ROOM_MEMBER`, kể cả đã rời) → `GAME_STALE` → trạng thái ∈ `running/paused/awaiting_confirm` (khác → `CLAIMS_CLOSED`) → `ticketId ∈ players/{uid}.ticket_ids` (`NOT_TICKET_HOLDER`) → vé đã trong `claims` (`TICKET_ALREADY_CLAIMED`) → `checkClaim` với `called_numbers` hiện tại → append `claims {…, result, row, claimed_at}`; `running/paused` → `resume_status=status`, `status=awaiting_confirm`, `next_call_at=null`, `pause_reason=null`; đã `awaiting_confirm` → chỉ append; `last_event=claim_submitted` ("{tên} KINH!"). Trả `ClaimResult`. Không còn `winners`/cửa sổ 5 giây.
- **`leaveRoom`:** lazy expiry → thành viên (`NOT_ROOM_MEMBER`). **Player:** `current_room_id=null`, `member_count−1`, `last_event=member_left`; ván `waiting` → xóa doc player; ván khác → **giữ** doc player (vé bị hủy; `claims` của họ giữ). **Host:** ván chưa kết thúc → `cancelled` (`result=cancelled`), phòng `closed` `close_reason=host_left`, `last_event=room_closed` "Host đã đóng phòng", `member_count=0`, mọi `current_room_id=null`. Sau commit xóa RTDB (`presence/{roomId}/{uid}` + `presence_access/...`; host → cả phòng). Lỗi xóa RTDB chỉ log. Client trước khi gọi: hủy `onDisconnect`, ngừng ghi presence.
- **`expireRoom` / lazy expiry (`decideExpiry`):** `waiting`→ván `cancelled`+phòng `closed`; `running/paused`→phòng `closing` (`room_closing`); `awaiting_confirm`→ván `finished` (`winners`=claims có `result=win`; có → `result=won`, không → `no_winner`) + đóng; phòng `closing` mà ván đã `finished/cancelled` → đóng. Đóng phòng: `close_reason=expired`, `member_count=0`, `last_event=room_closed`, `users.current_room_id=null`, xóa RTDB sau commit.
- **Client:** `useCurrentRoom`→`useGameRoom` nghe `rooms`/`games/{current}`/`players`/`tickets`/`users/{me}`; `usePresence` ghi online; `useDrawScheduler` (host `fireAt=next_call_at`, dự phòng k: `+5k s`, trừ `offsetMs`; hủy/hẹn lại khi `seq/next_call_at/status/gameId` đổi; `visibilitychange`; thử lại 1s ≤3 lần); `useExpiryTimer` (chip ≤15 phút, toast cục bộ 1 lần, jitter 0–2s gọi `expireRoom`); Wake Lock khi `running`; audio chỉ phát khi `called_numbers` **tăng** sau lần tải đầu.

### 3.4 Seed scenario cần có (chrome-tester, `npm run seed -- <name>`; 3 người H/B/C Auth emulator, presence online cả 3)
Tạo file `scripts/seed/scenarios/t006.ts`, dùng `seedRoom` đã mở rộng; `draw_interval_sec=3` mọi scenario trừ khi ghi khác.
| Scenario | Mô tả | AC chính |
|---|---|---|
| `game-waiting` (alias `t006`) | ván 1 `waiting`; B `[red_a]`, C `[blue_a, blue_b]`, H không vé; 3 người trong phòng; `expires_at=+8h` | 01,02,09,11,14,17,27,28,32,33 |
| `game-empty` | như trên, không player | 09 |
| `game-running` | `running`, đã rao 5 số, `next_call_at=now+3s`; B/C như trên | 03,05,07,08,12,13,15,16,17,18-ish,29,31,41,42,43 |
| `game-row-ready` | `running`; hàng 0 của `blue_a` đủ 5 số trong `called_numbers`, `red_a` chưa đủ hàng nào; `next_call_at=now+3s` | 20,21,22,23,24 (win/miss) |
| `game-paused` | `paused`, `pause_reason=host` | 12,13,19-ish |
| `game-awaiting` | `awaiting_confirm`, `claims=[C blue_a win row0]`, `resume_status=running` | 22,23,38 |
| `game-nearly-done` | `running`, 89 số đã rao, `next_call_at=now+3s` | 25 |
| `game-nearly-done-closing` | như trên + phòng `closing` | 26 |
| `game-near-expiry` | `waiting`, `expires_at=now+14 phút` (chip) | 35 |
| `game-expiring-waiting` | `waiting`, `expires_at=now+60s` | 36 |
| `game-expiring-running` | `running`, `expires_at=now+60s` | 37 |
| `game-expired-idle` | `waiting`, `expires_at` đã qua, phòng vẫn `active` (không ai mở) | 10,39 |
| `game-awaiting-expiring` | `awaiting_confirm` + `expires_at=now+60s` | 38 |
Mật khẩu/email theo `seedUser` hiện có; in ra `roomId`, uid, email từng vai (như `t005.ts`). Audio manifest mẫu **thiếu số 90** (AC-30). Nếu cần "đẩy số" giữa chừng cho Kinh đúng: dùng scenario `game-row-ready` (không cần lệnh phụ `fill-row`).

## 4. Các bước thực hiện
Mỗi step 1–2 commit ≤ ~400 dòng; message EN, Conventional Commits, không nhắc AI. Plan commit riêng trước S1.

| Step | Worker | Lane | Phụ thuộc | Phạm vi file | Commit dự kiến |
|---|---|---|---|---|---|
| S1a | server-worker (contract) | main | — | `game/shared/{types,constants,schemas}`, `room/shared/{schemas,types}`, stub 7 action | `feat(game): add game schemas and action contract` |
| S1b | server-worker (contract) | main | S1a | `core/shared/i18n/vi.ts` (+test) | `feat(game): add room screen and game i18n keys` |
| B1 | server-worker | backend | S1 | `shared/domain/{check-claim,pick-next-number}`, `room/shared/domain/decide-expiry` + test | `feat(game): add claim check, number picker and expiry decision rules` |
| B2a | db-worker | backend | S1 | `scripts/seed/lib/seed-room.ts`, `scenarios/t006.ts`, `index.ts` | `feat(game): add game room seed scenarios` |
| B2b | db-worker | backend | B2a | `game/db/**`, `room.repository`, `ticket.repository` | `feat(game): add game repository and room close writes` |
| B3 | server-worker | backend | B1, B2b | `room-expiry.service`, `expire-room` service/action, `room-expiry.test` | `feat(room): extend lazy expiry for awaiting-confirm games and add expireRoom` |
| B4 | server-worker | backend | B3 | `game-lifecycle.service`, 3 action, test | `feat(game): implement startGame, pauseGame and resumeGame` |
| B5a | server-worker | backend | B4 | `draw.service` (`drawNumber`), action, test | `feat(game): implement drawNumber with backup callers` |
| B5b | server-worker | backend | B5a | `rolloverToNewGame` (online-only copy, closing → close), test | `feat(game): roll over to a new game after the 90th number` |
| B6 | server-worker | backend | B4 | `claim.service`, `create-claim.action`, test | `feat(game): implement createClaim into the claims list` |
| B7 | server-worker | backend | B3 | `room-leave.service`, `leave-room.action`, test | `feat(room): implement leaveRoom for players and host` |
| B8 | db-worker | backend | B5b, B6, B7 | `game-rules.test`, `claim-latency.test` (rules deny + P95) | `test(game): add rules deny and claim latency tests` |
| C1a | ui-worker | client | S1 | `backup-order`, `draw-fire-at`, `auto-effects`, `ticket-layout` + test | `feat(game): add draw timing, auto-mark and ticket layout rules` |
| C1b | ui-worker | client | S1 | `last-event-toast`, `select-clip`, `marks-store` + test | `feat(game): add event toast, clip selection and mark storage rules` |
| C2a | ui-worker | client | C1 | `paper-ticket.tsx` (size/marks/hit/waiting) + test | `feat(ticket): support single and double layouts and marks in PaperTicket` |
| C2b | ui-worker | client | C1 | `use-current-room` map, `use-game-room`, `use-marks` | `feat(game): add realtime game room hooks` |
| C3a | ui-worker | client | C2 | `room-screen`, `room-header`, `number-panel`, `host-controls`, `my-tickets`, `app/room/page.tsx`, xóa `room-lobby` | `feat(game): add room screen shell, panel and tickets` |
| C3b | ui-worker | client | C3a | `kinh-bar`, `claim-card`, `bottom-bar` (sheet "Sắp có" + `TicketSheet`) | `feat(game): add KINH bar, claim card and bottom bar` |
| C4a | ui-worker | client | C3 | `use-server-time-offset`, `use-draw-scheduler` + test | `feat(game): add client draw scheduler with backup callers` |
| C4b | ui-worker | client | C4a | `use-expiry-timer`, `use-wake-lock` | `feat(game): add expiry timer and wake lock` |
| C5a | ui-worker | client | C1b | `audio-engine`, `use-audio`, `sound-gate` | `feat(game): add audio engine and sound gate` |
| C5b | ui-worker | client | C5a | `public/audio/**`, `make-sample-audio.sh` | `feat(game): add sample audio manifest and clips` |
| C6 | ui-worker | client | C3 | `board90-sheet`, `invite-sheet`, `leave-dialog` | `feat(game): add board, invite and leave sheets` |
| C7 | ui-worker | client | C3 | `use-room-toasts`, `use-connection`, banner, `?debug=` (dev) | `feat(game): add room toasts and connection banner` |
| M | (orchestrator) | main | cả hai lane | typecheck/lint/`npm test`, seed + Chrome, qc-testcase-writer | `test(qc): add QC test cases for T-006` / `chore(backlog): mark T-006 as done` |

Quy tắc lane: các lane khác nhau **không sửa chung file**. `main` (S1) chạy trước, inline. Lane `backend` thứ tự B1 → B2a → B2b → B3 → {B4 → B5a → B5b ∥ B6, B7} → B8 (B5/B6/B7 tuần tự trong lane). Lane `client` tuần tự C1 → C2 → C3 → {C4, C5, C6, C7} (cùng lane nên tuần tự; chung `room-screen.tsx` chỉ gắn mount). Client dùng action stub tới khi backend xong; chỉ test E2E sau merge.

## 5. Ánh xạ AC → kiểm chứng
AC viết lại theo specs mới (đánh số theo task file; thay đổi so với task ghi bằng †). Hint "emulator" = Vitest project emulator.
| AC | Cách kiểm | File test / TC |
|---|---|---|
| AC-01 Bắt đầu ≤1s, `player_count`, 1 số, `next_call_at` | emulator + chrome | `tests/emulator/game/start-pause-resume.test.ts`; TC chrome `game-waiting` |
| AC-02 xóa player rỗng/đã rời | emulator | cùng file |
| AC-03 mỗi N giây có số, đồng bộ ≤1s, không trùng | chrome (3 cửa sổ) + unit `pickNextNumber` | `pick-next-number.test.ts`; TC `game-running` |
| AC-04 `DRAW_TOO_EARLY` + biên −300ms | emulator | `draw-number.test.ts` |
| AC-05 3 lời gọi song song cùng `seq` → 1 `drawn:true` | emulator | `draw-number.test.ts` |
| AC-06 người xem/ đã rời → `NOT_ROOM_MEMBER` †(thêm đã rời) | emulator + chrome | `draw-number.test.ts` |
| AC-07/08 dự phòng sau N+5 / N+10 s (log server) | unit `backupOrder`,`drawFireAt` + chrome (đóng tab H, B) | `backup-order.test.ts`, `draw-fire-at.test.ts`; TC chrome đọc `console.debug('[draw]')` |
| AC-09 0 vé → nút khóa + `NO_TICKETS_HELD` | emulator + chrome | `start-pause-resume.test.ts`; `game-empty` |
| AC-10 quá hạn lúc Bắt đầu → `ROOM_CLOSING`, đã đóng | emulator | `start-pause-resume.test.ts`; seed `game-expired-idle` |
| AC-11 không phải host → `NOT_ROOM_HOST` | emulator + chrome | `start-pause-resume.test.ts` |
| AC-12/13 tạm dừng/tiếp tục (toast, 10s không số, `pause_reason`) | emulator + chrome | `game-paused` |
| AC-14 `waiting` chạm ô không đánh dấu, chạm vé mở SCR-05 | chrome + component | `paper-ticket.test.tsx` |
| AC-15 Tự dò: đánh dấu, tải lại còn | unit `marks-store` + chrome | `marks-store.test.ts` |
| AC-16 Auto: tô, viền đỏ, viền chờ | unit `autoEffects` + chrome | `auto-effects.test.ts` |
| AC-17 KINH hiện đúng đối tượng/trạng thái, spectator note | chrome | TC `game-running` |
| AC-18 † KINH vé chưa đủ hàng → lượt `result=miss` vào `claims`, ván `awaiting_confirm`, toast "{tên} KINH!" cả phòng, **không** toast "kinh hụt"; thẻ tạm hiện gợi ý chưa đủ hàng | emulator + chrome | `create-claim.test.ts`; `game-running` |
| AC-19 † KINH khi `paused` → `awaiting_confirm`, `resume_status=paused` | emulator | `create-claim.test.ts` |
| AC-20 † KINH đúng: `claims[0]={C,blue_a,win,row 0}`, `status=awaiting_confirm`, `resume_status=running`, `next_call_at=null`, `last_event=claim_submitted`; thẻ tạm; không còn số mới; KINH vẫn bấm (vé khác) | emulator + chrome | `create-claim.test.ts`; `game-row-ready` |
| AC-21 2 vé → action sheet 2 dòng, đúng `ticketId` | chrome + component | TC `game-row-ready` |
| AC-22 † đang `awaiting_confirm` KINH thêm → chỉ append, status giữ | emulator + chrome | `game-awaiting` |
| AC-23 † `NOT_TICKET_HOLDER` / `TICKET_ALREADY_CLAIMED` / `CLAIMS_CLOSED` + toast đúng | emulator + chrome | `create-claim.test.ts` |
| AC-24 2 hàng đủ → row nhỏ | unit | `check-claim.test.ts` |
| AC-25 † 90 số: ván `finished`/`no_winner`, ván mới `waiting`, chỉ chép player **online** (BR-29) | emulator + chrome | `draw-number.test.ts` (rollover); `game-nearly-done` |
| AC-26 phòng `closing` + số 90 → ván `finished`, phòng `closed`, banner hết hạn | emulator + chrome | `game-nearly-done-closing` |
| AC-27 1 vé: ô 38×32, chữ 17px, panel 96px | unit `ticketLayout` + chrome (đo bằng JS) | `ticket-layout.test.ts` |
| AC-28 2 vé: ô 38×28, header 52, panel 52, không cuộn, đáy vé 2 ≤ đỉnh KINH | chrome (JS `getBoundingClientRect`) | TC `game-running` (C 2 vé) |
| AC-29 bật tiếng, `[audio] latencyMs ≤ 500` | chrome | TC `game-running` |
| AC-30 manifest thiếu số 90 / lỗi → chỉ hiện số / toast | unit `selectClip` + chrome | `select-clip.test.ts` |
| AC-31 toast mọi `last_event` đúng câu, tự ẩn 3s, queue, không toast cũ | unit `lastEventToast` + chrome | `last-event-toast.test.ts` |
| AC-32 † Sheet Mời: link + **mã phòng** + Copy link/Copy mã + hạn HH:mm + share ẩn khi không hỗ trợ; chỉ host thấy "Mời" | chrome | TC `game-waiting` |
| AC-33 † player Rời khi `waiting`: về SCR-02 banner "Bạn đã rời phòng…", toast "B đã rời phòng", `member_count−1`, xóa player, RTDB gỡ | emulator + chrome | `tests/emulator/room/leave-room.test.ts` |
| AC-34 † Rời **giữa ván**: dialog cảnh báo vé bị hủy; xác nhận → doc player giữ, `createClaim` → `NOT_ROOM_MEMBER`, `claims` cũ giữ; **không** có `GAME_IN_PROGRESS`/`HOST_CANNOT_LEAVE` | emulator + chrome | `leave-room.test.ts` |
| AC-34b † Host Rời/"Đóng phòng": ván `cancelled`, phòng `closed` `host_left`, mọi người về SCR-02 banner "Host đã đóng phòng" | emulator + chrome | `leave-room.test.ts`; `game-running` |
| AC-35 chip ≤15 phút + toast 1 lần | chrome | `game-near-expiry` |
| AC-36 `waiting` hết hạn → `expireRoom` đóng, 3 người về SCR-02 | emulator + chrome | `expire-room.test.ts`; `game-expiring-waiting` |
| AC-37 `running` hết hạn → `closing`, chip "Đóng sau ván này", ván vẫn quay | emulator + chrome | `game-expiring-running` |
| AC-38 † `awaiting_confirm` hết hạn → ván `finished` (`winners`=claims win; không win → `no_winner`), phòng `closed` | emulator | `room-expiry.test.ts`, `expire-room.test.ts` |
| AC-39 phòng quá hạn không ai mở → mở app → đóng | emulator + chrome | `game-expired-idle` |
| AC-40 `ROOM_NOT_EXPIRED` + idempotent | emulator | `expire-room.test.ts` |
| AC-41 wakelock dataset | chrome (JS) | TC `game-running` |
| AC-42 mất/nối mạng `?debug=offline|online` | chrome | TC `game-running` |
| AC-43 Bảng 90 | chrome | TC `game-running` |
| AC-44 client không ghi được; người ngoài phòng không đọc `games` | emulator (rules) | `tests/emulator/game/game-rules.test.ts` |
| AC-45 `createClaim` P95 <1000ms (20 lượt) | emulator | `claim-latency.test.ts` |
| AC-46 (mới) phòng `running` hết 90 số khi một player offline → player offline không được chép sang ván mới (vé trống) | emulator | `draw-number.test.ts` |
| AC-47 (mới) thanh KINH hiện khi `awaiting_confirm`; vé đã trong `claims` hiện "Đã KINH vé này" và khóa | chrome | `game-awaiting` |

## 6. Giả định & câu hỏi mở
### 6.1 `[ASSUMED]` chép từ task (còn hiệu lực)
- Seed tên/cờ khác task (mục 3.4 dùng scenario đăng ký trong `scripts/seed/index.ts`, không có `npm run seed:t006`/`--expires-in`/`fill-row`).
- localStorage key `loto:mode` (`manual` mặc định|`auto`), `loto:sound` (≠`off` mặc định Bật), sessionStorage `loto:soundUnlocked`; key đánh dấu `{gameId}:{ticketId}`.
- Sheet chưa làm (Chat/Người/Lịch sử/Cài đặt) mở khung "Sắp có".
- `draw_interval_sec` mặc định 5 (seed 3 để test nhanh). Không đổi nhịp/mode/tiếng ở UI (T-012).
- Backup không lọc theo presence (lượt trùng vô hại nhờ `seq`); thử lại mạng 1s ≤3 lần; jitter `expireRoom` 0–2s; `wakelock` dataset; log dev `[draw]`/`[audio]`; `?debug=offline|online` chỉ dev.
- Ván kết thúc ngay khi rao số thứ 90 (`DrawRequest.seq` tối đa 89).
- Phòng bị lazy expiry chặn action: transaction commit phần hết hạn rồi trả lỗi nghiệp vụ (`ROOM_CLOSING`; phòng đã `closed` → `NOT_ROOM_MEMBER`).
- Xóa RTDB sau commit, lỗi chỉ log; câu nối xen sau câu số nếu còn ≥1s trước `next_call_at`; manifest mẫu bỏ số 90; bộ audio sinh offline bằng TTS máy (`say` + `ffmpeg`).
### 6.2 `[ASSUMED]` mới
- Thời gian server cho client: dùng RTDB `.info/serverTimeOffset` (không đổi `ActionResult`); `DRAW_TOO_EARLY` trả `details[0].nextCallAt` để chỉnh thêm (xem ❓1).
- Thẻ tạm `awaiting_confirm` (T-006): liệt kê `claims` (tên, vé, gợi ý "đủ hàng"/"chưa đủ hàng"), phụ đề "Chờ host duyệt KINH", **không** nút host (T-007 thay bằng SCR-09). Host cũng thấy thẻ này; ván chỉ thoát bằng `leaveRoom`/hết hạn trong phạm vi T-006.
- `lastEvent.text` do server soạn cho `game_started`, `game_finished`, `claim_submitted`, `member_left`, `room_closed`; client fallback theo type; `lastEventToast` map đủ 16 type TBL-02 (kể cả type thuộc T-007/T-008/T-009) để các task sau không đụng lại.
- Tiếng "KINH!" ngắn khi `claim_submitted` (SCR-04 §5) và tiếng kinh hụt khi `claims_rejected` được **nối sẵn** trong `use-audio` (bắt theo `last_event.type`); T-006 chỉ test phía client bằng unit; manifest mẫu có thêm mảng `kinh: [≥1]` `[ASSUMED]` tên key.
- `drawNumber` yêu cầu thêm `users/{caller}.current_room_id == roomId` (người đã rời giữa ván có doc player vẫn bị `NOT_ROOM_MEMBER`).
- Đọc presence (RTDB) cho BR-29 **trước** transaction Firestore (RTDB không nằm trong tx); race nhỏ chấp nhận.
- `startGame` `GameState.nextCallAt` = `next_call_at` mới; `leaveRoom` thành công trả `{ok:true,data:null}`.
- Nút "Rời" hiện cho **mọi** người kể cả host (host → dialog #23 "Đóng phòng"); không khóa nút theo trạng thái ván.
- "Rời" khi mình không có vé tham gia hoặc ván `waiting` → dialog đơn giản (#21 nhánh 1); có vé tham gia và ván `running/paused/awaiting_confirm` → dialog cảnh báo (#21 nhánh 2).
- Banner SCR-02 `host_left`/`left`/`expired` dùng store có sẵn (`leave-reason-store`, T-003); T-006 chỉ ghi `left` khi mình bấm Rời, còn lại suy từ snapshot (`infer-leave-reason`).
### 6.3 Chỗ task file lệch specs (theo specs)
1. Bỏ `claim_window`, `claim_window_ends_at`, `closeClaimWindow`, nhánh đồng thắng phía server; thay bằng `claims[]` + `awaiting_confirm` + `resume_status`.
2. `createClaim` không đổi trạng thái theo hụt/đúng: **mọi** lượt đều → `awaiting_confirm` (kể cả hụt); lỗi `TICKET_ALREADY_CLAIMED` (không còn `TICKET_ALREADY_WON`); nhận KINH cả khi `awaiting_confirm`; `CLAIMS_CLOSED` chỉ khi `waiting/finished/cancelled`.
3. `last_event`: `claim_submitted` (không có `claim_miss`/`claim_win`); toast "kinh hụt" thuộc `claims_rejected` (T-007); tiếng kinh hụt không phát ở T-006 khi KINH hụt.
4. `leaveRoom`: bỏ `GAME_IN_PROGRESS`/`HOST_CANNOT_LEAVE`; player rời giữa ván (vé bị hủy, dialog cảnh báo); host rời = đóng phòng (`host_left`); nút Rời ở header cho cả host; dialog host #23.
5. Lazy expiry: bỏ nhánh `claim_window`; `awaiting_confirm` → ván `finished` với `winners` = claims `win` (không win → `no_winner`), không phải "`result=won` giữ `winners`".
6. `drawNumber` hết 90 số: chép **chỉ player online** (BR-29/Q-058), task chép mọi player còn trong phòng.
7. `pauseGame` không dùng `loop_version` (SCR-04.A5 cũ còn nhắc) — đã bỏ.
8. Header phụ đề: "Chờ host duyệt KINH" (task ghi "Chờ đồng kinh/Chờ host xác nhận"); thanh KINH hiện cả `awaiting_confirm` (task: khóa); vé đã trong `claims` → "Đã KINH vé này".
9. Sheet Mời: thêm `join_code` (Mã phòng chữ lớn, "Copy mã" → "Đã copy mã phòng", chia sẻ gồm link + mã) — task chỉ có link.
10. Toast lỗi: `CLAIMS_CLOSED` "Ván đã kết thúc" (task "Đã hết lượt báo KINH"); `TICKET_ALREADY_CLAIMED` "Vé này đã báo KINH, chờ host duyệt".
11. Seed `awaiting`: `claims` thay `winners`; không còn `claim_window_ends_at`.
12. Header task có "Rời: không phải host, chỉ ván `waiting`"; "thẻ tạm claim_window" → thẻ tạm `awaiting_confirm`.
### 6.4 ❓ Câu hỏi mở — dev đã trả lời 2026-11-22: chấp nhận đề xuất cả ❓1, ❓2, ❓3
- ❓1 **`serverTimeOffset` lấy từ đâu?** ADR-05 chỉ nói "tính từ thời gian server trả trong response", api-contract không có `serverNow`. Đề xuất: dùng RTDB `.info/serverTimeOffset` (đã có kết nối RTDB cho presence), không đổi `ActionResult`; fallback sửa lệch bằng `details[0].nextCallAt` của `DRAW_TOO_EARLY`. Phương án khác: thêm `meta.serverNow` vào `ActionResult` (đụng `core/`, ảnh hưởng mọi action).
- ❓2 **Người rời giữa ván trong chuỗi dự phòng:** doc player được giữ nên `backupOrder` (client tính từ `players`) vẫn tính họ → thêm ≤5s trễ/người rời. Đề xuất: chấp nhận ở T-006 (ván treo ở `awaiting_confirm` là tình huống chính của rời giữa ván), không lọc theo presence; nếu cần, T-009 (Người) lọc sau.
- ❓3 **Ván `awaiting_confirm` ở T-006 không có lối ra cho host** (confirm/reject là T-007): host chỉ có thể rời phòng hoặc chờ hết hạn. Đề xuất: chấp nhận (T-007 ngay sau, cùng milestone M1); chrome test T-006 dừng ở thẻ tạm, không cần thoát ván. Nếu dev muốn demo liền mạch, hoãn merge T-006 tới khi T-007 xong.

## 7. Rủi ro
- Transaction: `planLazyExpiry` đã tách pha đọc/ghi; mọi action mới phải đọc **hết** (room, game, players, users, tickets) trước khi ghi — dễ vi phạm khi thêm `users` của từng player ở `startGame`/rollover (đọc theo batch `getAll`).
- RTDB presence đọc ngoài tx cho rollover (BR-29) có race nhỏ.
- Hẹn giờ bị trình duyệt hãm khi tab ẩn (ADR-05); Wake Lock chỉ giảm nhẹ; test dự phòng trên Chrome phụ thuộc đóng hẳn tab host.
- Audio: Chrome chặn autoplay → chỉ phát sau chạm; độ trễ ≤0,5s phụ thuộc giải mã sẵn; clip TTS mẫu chất lượng thấp, không đại diện kho thật (BIZ-09).
- Layout 2 vé phải vừa đúng 570px không cuộn ở 375×812; `PaperTicket` đổi props có thể vỡ SCR-05 (T-005) — giữ mặc định cũ, test `paper-ticket.test.tsx` + `ticket-sheet.test.tsx`.
- Mô hình `RoomView/GameView` mở rộng (S1) ảnh hưởng `use-current-room` và test T-003/T-005 — chạy lại toàn bộ unit.
- Số đầu của ván do `startGame` rao: client phải phát tiếng cho "số mới sau lần tải đầu" kể cả số này (tăng `called_numbers` từ rỗng/giữ cũ của ván trước → xét `len` giảm/đổi ván).
- `called_numbers` giữ tới lần Bắt đầu kế tiếp (TBL-02): UI ván mới `waiting` phải không hiện số cũ như số "đang rao" (dựa `game.status=waiting` ẩn panel).

## 8. Kết quả
- Commits: `git log --oneline 24226fa^..HEAD` (26 step B1–B8, C1–C7, S1, M).
- Lint/typecheck/test: typecheck ✓, lint ✓, unit 401/401 ✓, emulator 252/252 ✓.
- QC: `backlog/testcases/T-006-game-room.md` — 44 TC, chưa chạy tay (dev bỏ bước chrome-tester, 2026-11-24).
- Còn lại cho dev review: màn duyệt KINH/xác nhận ván thuộc T-007; host chơi 1 mình hợp lệ theo BR-14.
