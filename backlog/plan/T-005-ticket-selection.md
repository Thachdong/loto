---
task: T-005
title: Chọn vé: xem 16 vé, lấy/bỏ vé, host tạo bộ vé mới
status: approved
approved_at: 2026-11-21
branch: feature/dongt/T-005-ticket-selection
plan_commit: null
---

# Plan T-005 · Chọn vé

## 1. Tóm tắt
Sau task: player trong `/room` bấm nút "Vé" mở sheet SCR-05, thấy 16 thẻ vé (4×4, thứ tự màu cố định) kèm người giữ realtime, xem trước vé giấy 9×9, lấy/bỏ vé (tối đa 2, chỉ khi ván `waiting`). Host bấm "Tạo bộ vé mới" (dialog xác nhận → sinh lại 16 vé nếu không ai giữ; còn người giữ → dialog liệt kê, thu hồi người offline). Mới: feature `ticket` (4 action + db + UI), presence RTDB (hook + rules), `PaperTicket` dùng chung, toast `last_event`.
Chạy Chrome: **bỏ qua** (dev yêu cầu, `--skip-chrome`); kiểm bằng unit + emulator + component test, test case QC vẫn được viết (TC `chrome` đánh dấu chưa chạy).

## 2. Nguồn đã đọc
- Task: `backlog/tasks/T-005-ticket-selection.md`
- Specs: api-contract › `takeTicket`, `releaseTicket`, `renewTicketSet`, `reclaimPlayerTickets`, schemas `MyTickets`/`ReclaimResult`/`TicketSetRenewed`/`TicketId`; database › TBL-03, TBL-05, TBL-06, TBL-08; ui-ux/scr-05-tickets §1–5; FLOW-04, FLOW-05; BR-08..13, BR-22; ADR-06, ADR-14.
- Code hiện có: `room/db/{room.repository,room.mapper,ticket.doc,game.doc}.ts`, `room-expiry.service.ts` (plan/apply/afterCommit), `join-room.service.ts` (mẫu transaction + error-outcome), `core/server/action.ts`, `core/client/hooks/use-doc-listener.ts`, `use-current-room.ts`, `room-lobby.tsx`, `seed-room.ts`, `firestore.rules`, `database.rules.json` (baseline `false`), `tests/emulator/room/rooms-rules.test.ts`.
- Next.js docs: không dùng API Next mới (chỉ Server Action đã có mẫu + client component). Sheet/Dialog dùng shadcn có sẵn (`core/client/ui/{sheet,dialog}.tsx`).

## 3. Thiết kế
### 3.1 Feature & file theo lớp
Feature mới `ticket` (sở hữu dữ liệu `players` TBL-06 và ghi đè `grid` của `tickets`). Phần ghi vào doc `rooms/{id}` (`ticket_set_no`, `last_event`) đặt trong `room.repository` (room là chủ doc). `db` không import `db` feature khác → service ghép hai repo.

| Lớp | File | Tạo/Sửa | Nội dung |
|---|---|---|---|
| shared | `ticket/shared/constants.ts` | Tạo | `MAX_TICKETS_PER_PLAYER=2`, `TICKET_ID_PATTERN`, `TICKET_IDS` (16 id theo thứ tự màu, A rồi B), `ticketColorOf(id)` |
| shared | `ticket/shared/types.ts` | Tạo | `MyTickets`, `TicketSetRenewed`, `ReclaimResult`, `StillHeldDetail`, view types client (`TicketView`, `PlayerView`, `TicketCardVM`) |
| shared | `ticket/shared/schemas/{take-ticket,release-ticket,renew-ticket-set,reclaim-player-tickets}.ts` | Tạo | Zod `z.strictObject` + `.max()` |
| shared | `ticket/shared/domain/derive-ticket-cards.ts` (+ test) | Tạo | `deriveTicketCards(...)` thuần (xem 3.2) |
| shared | `ticket/shared/domain/partner-ticket.ts` (+ test) | Tạo | `partnerOf(id)` (cặp cùng màu, cạnh khác) |
| shared | `room/shared/types.ts` | Sửa | `RoomView.lastEvent` thêm `text`, `atMs` |
| shared | `core/shared/i18n/vi.ts` | Sửa | key `ticket.*`, `event.ticketSetRenewed`, `event.ticketsReclaimed(+Self)`, `room.ticketsButton` |
| db | `ticket/db/player.doc.ts`, `player.mapper.ts` (+ test) | Tạo | TBL-06 snake_case ↔ `PlayerRecord` |
| db | `ticket/db/ticket.repository.ts` | Tạo | `getTicketExistsInTx`, `findHolderOfTicketInTx`, `getPlayerInTx`, `listPlayersInTx`, `upsertPlayerTicketInTx`, `removeTicketFromPlayerInTx`, `deletePlayerInTx`, `overwriteTicketGridsInTx`, `readPresenceOnline(roomId)` (RTDB Admin, 1 lần) |
| db | `room/db/room.repository.ts` | Sửa | `renewTicketSetInRoomInTx` (`ticket_set_no`, `last_event`), `setRoomEventInTx` (cho reclaim) |
| db | `firestore.rules` | Sửa | không đổi quyền (cây con `rooms/**` đã mở cho member); thêm comment tham chiếu |
| db | `database.rules.json` | Sửa | `presence/$roomId`: đọc khi có `presence_access/$roomId/$uid`; `$uid` ghi khi chính chủ + có access; `.validate` (online bool, display_name string ≤ 100, photo_url string\|null, at number); `presence_access` cấm client |
| db | `scripts/seed/lib/seed-room.ts` | Sửa | thêm opts `players`, `presence`, `ticketSetNo` |
| db | `scripts/seed/scenarios/t005.ts`, `index.ts` | Tạo/Sửa | kịch bản `tickets-basic`, `tickets-running`, `tickets-carry` (đăng ký tên này trong `SCENARIOS`; alias `t005` = tickets-basic) |
| server | `ticket/server/services/ticket.service.ts` | Tạo | `takeTicket`, `releaseTicket`, `renewTicketSet`, `reclaimPlayerTickets` |
| server | `ticket/server/actions/{take-ticket,release-ticket,renew-ticket-set,reclaim-player-tickets}.action.ts` | Tạo | vỏ mỏng `defineAction` |
| client | `core/client/hooks/use-collection-listener.ts` (+ test) | Tạo | `onSnapshot` collection, retry như `useDocListener` |
| client | `core/client/hooks/use-presence.ts` (+ test) | Tạo | `usePresence(roomId, me)` (ghi + `onDisconnect`), `useRoomPresence(roomId)` (đọc `presence/{roomId}` → `Record<uid,boolean>` + `keys`) |
| client | `ticket/client/hooks/use-ticket-board.ts` | Tạo | nghe `tickets`, `players`, presence → `deriveTicketCards` |
| client | `ticket/client/hooks/use-ticket-actions.ts` | Tạo | gọi 4 action, map `error.code` → toast/dialog, trạng thái pending |
| client | `ticket/client/components/{ticket-sheet,ticket-card,ticket-thumb,paper-ticket,ticket-preview,renew-confirm-dialog,still-held-dialog,ticket-skeleton}.tsx` (+ test) | Tạo | SCR-05 #1–#9 |
| client | `ticket/client/index.ts` | Tạo | export `TicketSheet`, `PaperTicket` |
| client | `room/client/components/room-lobby.tsx` | Sửa | nút "Vé" mở `TicketSheet`; gọi `usePresence`; hook toast `last_event` |
| client | `room/client/hooks/use-room-event-toast.ts` (+ test) | Tạo | toast `ticket_set_renewed` / `tickets_reclaimed` |
| client | `room/client/hooks/use-current-room.ts` | Sửa | `mapRoomDoc` thêm `text`, `atMs` |
| test | `tests/emulator/ticket/{take-ticket,release-ticket,renew-ticket-set,reclaim-player-tickets,ticket-rules,presence-rules}.test.ts`, `ticket-fixtures.ts` | Tạo | integration + rules allow/deny |

### 3.2 Contract (lane client chỉ dựa vào đây)
```ts
// ticket/shared/schemas
TakeTicketInput    = strictObject({ roomId: string.min(1).max(128), ticketId: string.regex(TICKET_ID_PATTERN) })
ReleaseTicketInput = giống TakeTicketInput
RenewTicketSetInput= strictObject({ roomId })
ReclaimPlayerTicketsInput = strictObject({ roomId, uid: string.min(1).max(128) })

// ticket/server/actions (đều ActionResult<T>, auth: "required")
takeTicketAction(raw)      -> MyTickets        // { gameId, ticketIds: TicketId[] }
releaseTicketAction(raw)   -> MyTickets
renewTicketSetAction(raw)  -> TicketSetRenewed // { ticketSetNo }
reclaimPlayerTicketsAction(raw) -> ReclaimResult // { uid, releasedTicketIds }
// lỗi TICKETS_STILL_HELD: error.details = StillHeldDetail[]
type StillHeldDetail = { code: "holder"; uid: string; displayName: string; ticketIds: TicketId[]; online: boolean }

// client views (map ở hook từ snapshot snake_case)
TicketView = { id: TicketId; color: TicketColor; side: "a"|"b"; grid: number[]; setNo: number }
PlayerView = { uid: string; displayName: string; photoUrl: string | null; ticketIds: TicketId[] }

// ticket/shared/domain/derive-ticket-cards.ts
deriveTicketCards({ tickets: TicketView[], players: PlayerView[], presence: Record<string, boolean> | null,
                    gameStatus: GameStatus | null, meUid: string }) => {
  cards: TicketCardVM[16],            // luôn đúng thứ tự TICKET_IDS; thiếu doc vé -> card.ticket = null
  myCount: number, heldCount: number, // "Bạn giữ k/2", "x/16 vé đã có chủ"
  soldOut: boolean,                   // heldCount === 16
  locked: boolean,                    // gameStatus !== "waiting"
}
TicketCardVM = { id, color, side, ticket: TicketView | null,
  holder: { uid, displayName, photoUrl } | null, mine: boolean,
  lockedUntilEnd: boolean,            // locked && holder && holder.uid không có node trong presence
  action: "take" | "release" | "max" | "taken" | "running",   // biến thể nút #5/#6
  partnerId: TicketId }

// presence (RTDB TBL-08)
usePresence(roomId: string | null, me: { uid, displayName, photoUrl })   // ghi online + onDisconnect
useRoomPresence(roomId: string | null): { status: "loading"|"ready"|"error"; map: Record<uid, boolean> }
// map[uid] = node.online; uid KHÔNG có key = đã rời / chưa vào

// i18n keys mới (vi.ts) — ui-worker dùng đúng tên, S1 tạo sẵn
ticket.{title, counter, soldOut, lockedBanner, empty, mine, lockedUntilEnd, emptyHolder, partnerLine, take, release,
        takeMax, takeTaken, takeRunning, renew, renewConfirmTitle, renewConfirmBody, cancel, create,
        stillHeldTitle, stillHeldRemind, reclaim, loadError, retry, back, color.{red..pink}}
error toast: ticket.err.{taken, limit, notWaitingTake, notWaitingRenew, targetOnline, generic}
event.{ticketSetRenewed, ticketsReclaimed, ticketsReclaimedSelf}, room.ticketsButton
// data-testid: ticket-open, ticket-sheet, ticket-counter, ticket-lock-banner, ticket-card-{id}, ticket-holder-{id},
//   ticket-preview, ticket-take, ticket-release, ticket-renew, renew-confirm, still-held-dialog, still-held-row-{uid},
//   ticket-reclaim-{uid}, ticket-load-error, ticket-retry, paper-ticket-{id}
```
Route/Server Component: không thêm route; `/room` giữ nguyên.

### 3.3 Luồng chính
- Mở `/room`: `RoomLobby` gọi `usePresence` (ghi `presence/{roomId}/{me}`), bấm "Vé" → `TicketSheet` → `useTicketBoard` nghe `rooms/{r}/tickets` (collection), `rooms/{r}/games/{g}/players` (collection), `presence/{r}` (RTDB) → `deriveTicketCards`. Game status lấy từ `useCurrentRoom().game`.
- Lấy/bỏ vé: nút → `takeTicketAction`/`releaseTicketAction` → service transaction → listener `players` cập nhật mọi client.
- Tạo bộ mới: "Tạo bộ vé mới" → dialog #9 → `renewTicketSetAction`; `TICKETS_STILL_HELD` → dialog #8 (dòng realtime theo presence + players hiện tại, `details` chỉ là dữ liệu đầu) → "Thu hồi" → `reclaimPlayerTicketsAction`. Thành công → `rooms.last_event` → `useRoomEventToast` toast cho cả phòng.
- Service (mọi action): 1 `runTransaction`, đọc hết rồi ghi. Thứ tự đọc: `users/{uid}` → `planLazyExpiry(room)` → game → (vé / players). Lazy expiry vừa đóng phòng → `apply` + trả error-outcome `NOT_ROOM_MEMBER` (commit trước, ném sau commit, `afterCommit` dọn presence). RTDB đọc **trước** transaction (reclaim: 1 node; renew: cả `presence/{roomId}`), ngoài Firestore tx.
- `takeTicket` thứ tự lỗi: member → lazy expiry → ticket tồn tại → `waiting` → đã có chủ (`players where ticket_ids array-contains`) → giới hạn 2. Tạo `players/{uid}` (`display_name`, `photo_url` từ `users`, `joined_at`, `expire_at` = `rooms.expire_at` hoặc `created_at+31d` qua `core/db/ttl`), `arrayUnion`. Không ghi `last_event`.
- `releaseTicket`: member → ticket tồn tại → `waiting` → `ticketId ∈ ticket_ids` (else `TICKET_NOT_HELD`) → `arrayRemove` (giữ doc `[]`).
- `renewTicketSet`: member → host → `waiting` → còn player có `ticket_ids` ≠ [] → `TICKETS_STILL_HELD` (details đủ, `online` từ presence đọc trước tx) → ghi đè 16 grid bằng `generateTicketSet(cryptoRng())`, `set_no`, `updated_at`; `rooms.ticket_set_no + 1`, `last_event ticket_set_renewed`.
- `reclaimPlayerTickets`: member → host → `uid ≠ me` → `waiting` → player doc tồn tại (`PLAYER_NOT_FOUND`) → đích online (`TARGET_ONLINE`) → xóa player doc, `last_event tickets_reclaimed` (`target_uid`, `text` = tên đích).

## 4. Các bước thực hiện
| Step | Worker | Lane | Phụ thuộc | Phạm vi file | Commit dự kiến |
|---|---|---|---|---|---|
| S1 | server-worker (contract) | main | — | `ticket/shared/**` (schemas, types, constants, domain + test), `room/shared/types.ts`, `vi.ts`, stub 4 action | `feat(ticket): add ticket schemas, derive logic and action contract` |
| S2 | db-worker | backend | S1 | `ticket/db/**`, `room/db/room.repository.ts`, `database.rules.json`, `firestore.rules` (comment), seed, `tests/emulator/ticket/{ticket-rules,presence-rules}.test.ts` | `feat(ticket): add player repository, presence rules and seed` |
| S3 | server-worker | backend | S2 | `ticket/server/**`, `tests/emulator/ticket/{take,release,renew,reclaim}*.test.ts`, `ticket-fixtures.ts` | `feat(ticket): implement take/release/renew/reclaim actions` (có thể tách 2 commit: take+release / renew+reclaim) |
| S4 | ui-worker | client | S1 | `core/client/hooks/{use-collection-listener,use-presence}*`, `ticket/client/**` | `feat(ticket): add ticket sheet UI` (+ `feat(core): add presence and collection hooks`) |
| S5 | ui-worker | client | S4 | `room/client/components/room-lobby*`, `room/client/hooks/{use-current-room,use-room-event-toast}*` | `feat(room): open ticket sheet, presence and event toasts in room page` |

Lane `backend` (S2→S3) và `client` (S4→S5) chạy song song sau S1; không chung file (kiểm: `room/shared/types.ts`, `vi.ts` thuộc S1; `room.repository.ts` chỉ lane backend; `room-lobby`/`use-current-room` chỉ lane client).

## 5. Ánh xạ AC → kiểm chứng
Chrome bỏ qua theo yêu cầu dev; AC thuộc UI kiểm bằng component test + unit domain, và đánh dấu "chưa chạy Chrome".

| AC | Cách kiểm | File test |
|---|---|---|
| AC-1, AC-2 | unit (derive) + component (16 thẻ, thứ tự, preview) | `derive-ticket-cards.test.ts`, `ticket-sheet.test.tsx`, `paper-ticket.test.tsx` |
| AC-3, AC-4 | emulator (+ component trạng thái "Bạn") | `take-ticket.test.ts`, `ticket-sheet.test.tsx` |
| AC-5 | emulator + unit (biến thể `max`) | `take-ticket.test.ts`, `derive-ticket-cards.test.ts` |
| AC-6 | unit (`taken`) + emulator | `derive-ticket-cards.test.ts`, `take-ticket.test.ts` |
| AC-7 | emulator concurrency 20 lần | `take-ticket.test.ts` |
| AC-8 | emulator | `release-ticket.test.ts` |
| AC-9 | emulator (`GAME_NOT_WAITING`) + unit (`running`, locked) + component (banner) | `take-ticket.test.ts`, `renew-ticket-set.test.ts`, `ticket-sheet.test.tsx` |
| AC-10, AC-11, AC-12 | unit (derive) | `derive-ticket-cards.test.ts` |
| AC-13 | emulator (grid mới đúng bất biến BR-08, `set_no`, `last_event`) + component (dialog #9) | `renew-ticket-set.test.ts`, `renew-confirm-dialog.test.tsx` |
| AC-14, AC-15, AC-16 | emulator (`details`, reclaim, renew lại) + component (dialog #8) | `renew-ticket-set.test.ts`, `reclaim-player-tickets.test.ts`, `still-held-dialog.test.tsx` |
| AC-17, AC-18, AC-19 | emulator | `renew-…`, `reclaim-…` tests |
| AC-20 | emulator (action) + rules test | `take-ticket.test.ts`, `ticket-rules.test.ts` |
| AC-21 | component (listener lỗi → "Không tải được bộ vé" + Thử lại) | `ticket-sheet.test.tsx` |
| AC-22 | rules test RTDB + unit `usePresence` (mock `onDisconnect`); `onDisconnect` thật = **manual** (không chạy Chrome) | `presence-rules.test.ts`, `use-presence.test.ts` |
| Toast `last_event` | component/unit | `use-room-event-toast.test.ts` |

## 6. Giả định & câu hỏi mở
- `[ASSUMED]` (task) Nút "Vé" tạm trong `RoomLobby`; T-006 thay bằng tab bar.
- `[ASSUMED]` (task) Host luôn qua dialog #9 trước; `TICKETS_STILL_HELD` mở #8; online trong #8 lấy realtime từ RTDB.
- `[ASSUMED]` (task) Câu chữ toast `tickets_reclaimed`, `TARGET_ONLINE`, lỗi mạng; đọc presence ngoài transaction; thứ tự kiểm lỗi `takeTicket`; tên seed `tickets-*`.
- `[ASSUMED]` **Mới:** T-004 **chưa** viết `presence/*` trong `database.rules.json` (đang baseline `false`) → T-005 viết rules + test (task ghi "nếu T-004 đã viết").
- `[ASSUMED]` **Mới:** index `ticket_ids` array-contains là single-field, Firestore tự tạo → không thêm vào `firestore.indexes.json`; chỉ test emulator.
- `[ASSUMED]` **Mới:** hook `usePresence`/`useRoomPresence` đặt ở `core/client/hooks/` (dùng chung T-006/T-009, tránh client feature import client feature chéo).
- `[ASSUMED]` **Mới:** thao tác trên phòng bị lazy-expiry đóng ngay trong tx → trả `NOT_ROOM_MEMBER` (api-contract không có mã "phòng đóng" cho 4 action này).
- `[ASSUMED]` **Mới:** `rooms.last_event.text` do server ghi cho `tickets_reclaimed` = tên người bị thu hồi; client dùng `text` cho người khác và `targetUid === me` → câu "…của bạn".
- `[ASSUMED]` **Mới:** `reclaimPlayerTickets` đã có `SCR-05.A4` thiếu trong api-contract (đã ghi ở task) — không sửa specs.
- `[ASSUMED]` **Mới:** bỏ Chrome → AC-22 `onDisconnect` thật, AC-3 "≤ 1 giây", AC-7 đua 2 cửa sổ thật chỉ có bằng chứng gián tiếp (emulator concurrency test + unit); ghi rõ trong test case QC là chưa chạy Chrome.
- ❓ Không có câu hỏi chặn.

## 7. Rủi ro
- Concurrency `takeTicket`: dựa vào xung đột transaction Firestore trên query `array-contains` (Admin SDK dùng khóa pessimistic trên tài liệu đã đọc, nhưng query rỗng không khóa doc nào). **Hai người lấy cùng vé có thể cùng thấy rỗng.** Cách chặn: trong tx đọc cả doc `tickets/{ticketId}` rồi ghi nhẹ vào nó (hoặc đọc toàn bộ `players` của ván và lọc trong bộ nhớ → query rộng sẽ xung đột với mọi ghi mới vào collection). Chọn: đọc cả collection `players` (≤ 16 doc), lọc trong bộ nhớ — an toàn nhờ Admin SDK transaction phát hiện thay đổi kết quả query; bắt buộc test 20 lần lặp. Nếu vẫn lọt → ghi marker lên doc vé.
- RTDB emulator chưa dùng trong test action → fixture phải seed presence qua Admin RTDB; cổng `9000` cần chạy.
- Gate `npm test` cần Java; `ticket` cần database emulator trong `firebase.json` (đã có).
- Dialog/sheet shadcn: kiểm trap focus + `DialogTitle` ẩn (nhớ i18n cho nút đóng, bài học T-004).

## 8. Kết quả (orchestrator điền khi xong)
- Commits: …
- Lint/typecheck/test: …
- QC: `backlog/testcases/T-005-ticket-selection.md` — Chrome bỏ qua (dev yêu cầu)
- Còn lại cho dev review: …
