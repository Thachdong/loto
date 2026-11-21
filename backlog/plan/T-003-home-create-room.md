---
task: T-003
title: Trang chủ & tạo phòng (SCR-02)
status: approved
approved_at: 2026-11-21
branch: feature/dongt/create-room
plan_commit: null
---

# Plan T-003 · Trang chủ & tạo phòng (SCR-02)

## 1. Tóm tắt
Sau task: user đã đăng nhập mở `/` (SCR-02) → nhập tên phòng (hoặc để trống) → "Tạo phòng" → `/room` tối thiểu thấy tên phòng, "Ván 1 · Chờ bắt đầu", "1 người", **mã phòng 6 ký tự** và link mời `/join/{inviteCode}` (host). Emulator có `rooms/{id}` (kèm `invite_code` 22 ký tự + `join_code` 6 ký tự), ván 1 `waiting`, 16 vé đúng BR-08, RTDB `presence_access`. Đang ở phòng mở `/` → vào thẳng `/room`. Không ở phòng → menu avatar "Đăng xuất" về SCR-01.

Dev đã chốt (2026-11-21): làm theo specs mới Q-055..Q-058 (`join_code` BR-30, nhãn trạng thái ván mới, lý do `host_left`); **SCR-02.A4 (card "Vào phòng" có nút + dialog nhập mã + `joinRoom({roomCode})`) chuyển sang T-004**.

## 2. Nguồn đã đọc
- Task: `backlog/tasks/T-003-home-create-room.md` (kèm ghi chú ⚠ Q-055..Q-058)
- Specs:
  - `api-contract.yml` › `createRoom` (`POST /rooms`), `deleteCurrentSession` (`DELETE /sessions/current`), schemas `RoomCreate`, `RoomCreated` (thêm `roomCode`), `InviteCode`, `RoomCode` (`^[A-HJ-NP-Z2-9]{6}$`), bảng mã lỗi (`ALREADY_IN_ROOM` + `details[0].currentRoomId`, `ROOM_NAME_INVALID`)
  - `database.md` › TBL-01, TBL-02 (`join_code`, indexes, enum `close_reason` gồm `host_left`), TBL-03, TBL-05 (`claims`, `resume_status`, bỏ `claim_window`, `awaiting_confirm` = "Chờ host duyệt"), TBL-08 (`presence_access`)
  - `ui-ux/scr-02-home.md` (§1–5, card 8/10 mới, banner 4 thêm "Host đã đóng phòng")
  - `idea/business.md` BR-02, BR-04, BR-05, BR-07, BR-08, BR-30; FLOW-02
  - `tech-stack.md` ADR-03, ADR-05, ADR-09, ADR-14
- Next.js docs: `03-api-reference/04-functions/cookies.md` (`delete` chỉ trong Server Function), `redirect.md`, `use-router.md`, `refresh.md`, `connection.md`

## 3. Thiết kế
Feature sở hữu: **`room`** (TBL-02/03/05). Đăng xuất + menu avatar thuộc **`auth`**. Lint boundaries chỉ cho `feature-client` import client cùng feature → `app/page.tsx` ghép header (auth) + `HomeScreen` (room).

### 3.1 Feature & file theo lớp
| Lớp | File | Tạo/Sửa | Nội dung |
|---|---|---|---|
| shared | `src/features/room/shared/schemas/create-room.ts` | Tạo | `CreateRoomInput = z.strictObject({ name: z.string().max(200).optional() })` (độ dài thật kiểm sau trim ở service) |
| shared | `src/features/room/shared/types.ts` | Tạo | `RoomCreated`, `RoomStatus`, `GameStatus`, `CloseReason`, `TicketColor`, `TicketSide`, `Ticket`, `RoomView`, `GameView`, `LeaveReason` |
| shared | `src/features/room/shared/constants.ts` | Tạo | `TICKET_COLORS`, `ROOM_NAME_MAX = 50`, `ROOM_TTL_MS = 8h`, `RETENTION_MS = 31 ngày`, `DEFAULT_DRAW_INTERVAL_SEC = 5`, `ROOM_CODE_ALPHABET`, `ROOM_CODE_PATTERN`, `INVITE_CODE_PATTERN`, `LEAVE_REASON_STORAGE_KEY = 'loto:leaveReason'` |
| shared | `src/features/room/shared/domain/generate-ticket-set.ts` (+test) | Tạo | `generateTicketSet(rng)` (ADR-14), `seededRng(seed)` (mulberry32) |
| shared | `src/features/room/shared/domain/random-code.ts` (+test) | Tạo | `randomCode(alphabet, length, randomInt)` thuần; `BASE62` |
| shared | `src/features/room/shared/domain/room-name.ts` (+test) | Tạo | `resolveRoomName(raw, displayName)` → tên hoặc `null` (không hợp lệ) |
| shared | `src/features/room/shared/domain/leave-reason.ts` (+test) | Tạo | `inferLeaveReason(lastRoomSnapshot, myUid, now)` → `expired`/`host_left`/`kicked`/`unknown` (Q-050) |
| shared | `src/features/auth/shared/schemas/delete-current-session.ts` | Tạo | `DeleteCurrentSessionInput = z.strictObject({})` |
| shared | `src/core/shared/i18n/vi.ts` | Sửa | key `home.*`, `room.*`, `gameStatus.*`, `leaveReason.*`, `account.*`, `common.offline` |
| core | `src/core/server/random.ts` (+test) | Tạo | `cryptoRandomInt(max)` (`crypto.randomInt`), `cryptoRng()` cho `generateTicketSet` |
| core | `src/core/db/ttl.ts` (+test) | Tạo | `expireAtFrom(createdAt)` = +31 ngày (NFR-11) |
| core | `src/core/server/session.ts` | Sửa | `clearSessionCookie()` (`maxAge: 0`) |
| db | `src/features/room/db/room.doc.ts`, `game.doc.ts`, `ticket.doc.ts` | Tạo | Kiểu doc TBL-02/05/03 |
| db | `src/features/room/db/room.mapper.ts` (+test) | Tạo | doc ↔ model (`RoomCreated`, model nội bộ cho service) |
| db | `src/features/room/db/room.repository.ts` | Tạo | `newRoomRef()`, `getRoomInTx`, `findOpenRoomByJoinCodeInTx`, `createRoomInTx(…, room, game, tickets)`, `closeRoomExpiredInTx`, `markRoomClosingInTx`, `getGameInTx`, `cancelGameInTx`, `setPresenceAccess`, `removePresence(roomId)` |
| db | `src/features/auth/db/user.repository.ts` | Sửa | `getUserDocInTx(tx, uid)`, `setCurrentRoomInTx(tx, uid, roomId, now)`, `findUidsInRoomInTx(tx, roomId)`, `clearCurrentRoomInTx(tx, uids, now)` |
| db | `firestore.rules` | Sửa | `isMember(roomId)`; `rooms/{roomId}` + cây con: đọc khi là thành viên; ghi `false` |
| db | `database.rules.json` | Giữ | `presence_access` deny mặc định (đã có) — thêm test |
| db | `firestore.indexes.json` | Sửa | `fieldOverrides` tắt index `rooms.called_numbers`, `rooms.last_event` |
| seed | `scripts/seed/lib/seed-room.ts` | Tạo | `seedRoom({roomId, hostUid, members, name, expiresAt, gameStatus, roomStatus, joinCode, rngSeed})` |
| seed | `scripts/seed/lib/seed-user-doc.ts` | Tạo | tách `seedUserDoc` từ `t002.ts` để dùng chung |
| seed | `scripts/seed/scenarios/t002.ts` | Sửa | dùng `seedUserDoc` chung |
| seed | `scripts/seed/scenarios/t003.ts`, `scripts/seed/index.ts` | Tạo/Sửa | `u_an` không ở phòng; `u_cuc` host `r_old` còn hạn |
| server | `src/features/room/server/services/room-expiry.service.ts` | Tạo | `applyLazyExpiry(tx, ctx)` — đọc trước, trả `plan` ghi; export cho T-004/T-006/T-007 |
| server | `src/features/room/server/services/room.service.ts` | Tạo | `createRoom(uid, input)` |
| server | `src/features/room/server/actions/create-room.action.ts` | Tạo | `createRoomAction`, `auth: 'required'` |
| server | `src/features/auth/server/services/session.service.ts` | Sửa | `deleteCurrentSession(uid)` |
| server | `src/features/auth/server/actions/delete-current-session.action.ts` | Tạo | `deleteCurrentSessionAction`, `auth: 'required'` |
| client | `src/core/client/hooks/use-doc-listener.ts` | Tạo | `useDocListener(path | null)` → `{status: 'loading'|'ready'|'error', data}` |
| client | `src/core/client/ui/skeleton.tsx`, `dropdown-menu.tsx`, `avatar.tsx` | Tạo | shadcn (viết tay, không chạy CLI) |
| client | `src/features/room/client/hooks/use-current-room.ts` | Tạo | nghe `users/{uid}` → `rooms/{id}` → `games/{gid}`; ghi lý do rời phòng |
| client | `src/features/room/client/lib/leave-reason-store.ts` | Tạo | đọc/ghi `sessionStorage` (try/catch) |
| client | `src/features/room/client/components/home-screen.tsx` (+test) | Tạo | lời chào, form tạo phòng, card 8 (gợi ý), card 9, skeleton, banner offline |
| client | `src/features/room/client/components/create-room-form.tsx` (+test) | Tạo | ô tên + bộ đếm Unicode + nút, xử lý lỗi A1 |
| client | `src/features/room/client/components/current-room-card.tsx` | Tạo | card 9 |
| client | `src/features/room/client/components/leave-reason-banner.tsx` (+test) | Tạo | banner 4 |
| client | `src/features/room/client/components/room-lobby.tsx` (+test) | Tạo | `/room` tối thiểu: tên, "Ván n · trạng thái", "m người", mã phòng, link mời + "Copy link" (host) |
| client | `src/features/room/client/index.ts` | Tạo | export `HomeScreen`, `RoomLobby` |
| client | `src/features/auth/client/components/account-header.tsx` (+test) | Tạo | logo, avatar (ảnh/chữ cái đầu), menu: "Đăng xuất" chỉ khi `currentRoomId = null` (nghe `users/{uid}`) |
| client | `src/features/auth/client/hooks/use-sign-out.ts` | Tạo | action → `signOut()` → `router.replace('/login')` |
| client | `src/features/auth/client/index.ts` | Sửa | export `AccountHeader` |
| app | `src/app/page.tsx` | Sửa | Suspense → `requireUser`; có phòng → `redirect('/room')`; render `AccountHeader` + `HomeScreen` + `AuthSync` |
| app | `src/app/room/page.tsx` | Sửa | Suspense → `requireUser`; không phòng → `redirect('/')`; render `RoomLobby` + `AuthSync` |
| test | `tests/emulator/room/rooms-rules.test.ts` | Tạo | allow thành viên / deny người ngoài, chưa auth, ghi; RTDB `presence_access` deny |
| test | `tests/emulator/room/create-room.test.ts` | Tạo | AC-2,3,4,6,7,8,9,18,21,22 |
| test | `tests/emulator/room/room-expiry.test.ts` | Tạo | `applyLazyExpiry` 3 nhánh |
| test | `tests/emulator/auth/delete-current-session.test.ts` | Tạo | AC-14,15,16 |
| test | `tests/emulator/room/session-cookie.ts` | Tạo | helper tạo user + cookie phiên (tái dùng `google-token.ts`) |

Tổng: shared 13 (kể test) · core 6 · db 9 · seed 5 · server 5 · client 17 · app 2 · test emulator 5.

### 3.2 Contract (để các lane chạy song song)
```ts
// room/shared/types.ts
export type RoomStatus = "active" | "closing" | "closed";
export type GameStatus = "waiting" | "running" | "paused" | "awaiting_confirm" | "finished" | "cancelled";
export type CloseReason = "expired" | "host_left";
export type TicketColor = "red" | "orange" | "yellow" | "green" | "teal" | "blue" | "purple" | "pink";
export type TicketSide = "a" | "b";
export type Ticket = { id: `${TicketColor}_${TicketSide}`; color: TicketColor; side: TicketSide; grid: number[] };

/** api-contract › RoomCreated */
export type RoomCreated = {
  roomId: string; name: string; inviteCode: string; roomCode: string; inviteUrl: string;
  currentGameId: string; drawIntervalSec: number; expiresAt: string; // ISO
};

/** Dữ liệu client đọc từ listener (camelCase, chỉ field UI cần). */
export type RoomView = {
  id: string; name: string; hostUid: string; status: RoomStatus; memberCount: number;
  inviteCode: string; joinCode: string; expiresAt: Date; currentGameId: string; gameCount: number;
  closeReason: CloseReason | null; lastEvent: { type: string; targetUid: string | null } | null;
};
export type GameView = { id: string; seqNo: number; status: GameStatus };
export type LeaveReason = "kicked" | "expired" | "host_left" | "left" | "unknown";
export type LeaveReasonRecord = { reason: LeaveReason; roomName: string | null };

// Actions
createRoomAction(input: { name?: string }): Promise<ActionResult<RoomCreated>>
  // lỗi: VALIDATION_FAILED, UNAUTHENTICATED, ALREADY_IN_ROOM (details[0] = {code:'current_room', currentRoomId}), ROOM_NAME_INVALID
deleteCurrentSessionAction(input: {}): Promise<ActionResult<null>>
  // không ở phòng → null; ở phòng → INTERNAL_ERROR (T-011 làm tiếp); UNAUTHENTICATED
```
Đường dẫn listener client: `users/{uid}`, `rooms/{roomId}`, `rooms/{roomId}/games/{gameId}`. Mapping snake → camel làm trong `use-current-room.ts`.

Route: `/` (SCR-02), `/room` (tối thiểu). Link mời: `${NEXT_PUBLIC_APP_URL}/join/${inviteCode}`.

Key i18n mới (S1 thêm vào `vi.ts`):
```
common.offline            "Mất kết nối – đang thử lại…"
account.logo              "LÔ TÔ"
account.menu              "Tài khoản"
account.signOut           "Đăng xuất"
home.greeting             (đã có) "Xin chào, {name}"
home.createTitle          "Tạo phòng mới"
home.roomNamePlaceholder  "Phòng của {name}"
home.roomNameCounter      "{count}/50"
home.roomNameInvalid      "Tên phòng từ 1 đến 50 ký tự"
home.createRoom           "Tạo phòng"
home.creating             "Đang tạo phòng…"
home.createFailed         "Không tạo được phòng, thử lại"
home.alreadyInRoom        "Bạn đang ở phòng {name}"
home.joinTitle            "Vào phòng"
home.joinHint             "Muốn vào phòng bạn bè? Mở link mời bạn nhận được."
home.currentTitle         "Bạn đang ở phòng"
home.currentSummary       "Ván {game} · {status} · {members} người"
home.backToRoom           "Về phòng"
room.gameLine             "Ván {game} · {status}"
room.members              "{count} người"
room.roomCode             "Mã phòng"
room.inviteLink           "Link mời"
room.copyLink             "Copy link"
room.copied               "Đã copy link"
gameStatus.waiting|running|paused|awaiting_confirm|finished|cancelled
                          "Chờ bắt đầu" | "Đang quay" | "Tạm dừng" | "Chờ host duyệt" | "Đã kết thúc" | "Đã hủy"
leaveReason.kicked        "Bạn đã bị mời ra khỏi phòng \"{name}\"."
leaveReason.expired       "Phòng \"{name}\" đã hết hạn."
leaveReason.host_left     "Host đã đóng phòng \"{name}\"."
leaveReason.left          "Bạn đã rời phòng \"{name}\"."
leaveReason.unknown       "Bạn không còn ở trong phòng."
leaveReason.dismiss       "Đóng"
```
Xóa key `room.title`, `room.currentRoom` cũ (trang giữ chỗ T-002).

`data-testid` chính: `home-greeting`, `home-skeleton`, `home-offline-banner`, `room-name-input`, `room-name-counter`, `room-name-error`, `create-room-button`, `join-hint-card`, `current-room-card`, `current-room-summary`, `back-to-room-button`, `leave-reason-banner`, `leave-reason-dismiss`, `account-avatar`, `account-menu`, `sign-out-item`, `room-name`, `room-game-line`, `room-members`, `room-code`, `room-invite-link`, `room-copy-link`.

### 3.3 Luồng chính
- **Tạo phòng:** `CreateRoomForm` trim → `createRoomAction({name?})` → `defineAction` (Zod + phiên) → `createRoom(uid, input)`:
  1. Ngoài transaction: sinh `inviteCode` (base62 22, `crypto.randomInt`), sinh trước 16 vé `generateTicketSet(cryptoRng)`, `roomRef` auto-id, `gameRef` auto-id.
  2. Transaction — **mọi đọc trước mọi ghi**:
     - đọc `users/{uid}` (không có → `UNAUTHENTICATED`);
     - `current_room_id ≠ null` → đọc phòng + ván hiện tại; `applyLazyExpiry` bước đọc (phòng quá hạn & ván `waiting` → đọc thêm `users where current_room_id == oldRoom`); phòng `active` còn hạn hoặc `closing` → `ALREADY_IN_ROOM` + `currentRoomId`; phòng `closed`/không tồn tại → coi như trống;
     - sinh `join_code` + `findOpenRoomByJoinCodeInTx` (query `rooms where join_code == X`, lọc `status ∈ {active, closing}` trong bộ nhớ, không cần index composite); trùng → sinh lại, tối đa 5 lần rồi `INTERNAL_ERROR`;
     - ghi: kế hoạch lazy expiry (nếu có), `rooms/{id}`, `games/{gid}`, 16 `tickets/*`, `users.current_room_id`.
  3. Sau commit: `presence_access/{roomId}/{uid} = true` (lỗi → `logError`, vẫn trả OK); lazy expiry đã đóng phòng cũ → xóa `presence/{old}`, `presence_access/{old}`.
  4. Trả `RoomCreated` → client `router.push('/room')`.
- **Đăng xuất (không ở phòng):** `AccountHeader` → `deleteCurrentSessionAction({})` → service đọc user: có phòng → `logError('not_implemented_until_T-011')` + `AppError('INTERNAL_ERROR')`; không → `revokeRefreshTokens(uid)` + `clearSessionCookie()` → client `signOut(getClientAuth())` → `router.replace('/login')`. `UNAUTHENTICATED` xử lý như thành công.
- **Realtime SCR-02:** `useCurrentRoom(uid)` nghe `users/{uid}`; có `current_room_id` → nghe `rooms/{id}` + `games/{current_game_id}`; `current_room_id` từ X → `null` → `inferLeaveReason(snapshot cuối của X)` → ghi `sessionStorage['loto:leaveReason']` → banner. `/room` dùng cùng hook; `current_room_id = null` → ghi lý do → `router.replace('/')`.
- **Rules:** `isMember(roomId)` = `get(users/{auth.uid}).data.current_room_id == roomId`.

## 4. Các bước thực hiện
| Step | Worker | Lane | Phụ thuộc | Phạm vi file | Commit dự kiến |
|---|---|---|---|---|---|
| S1 | server-worker (contract) | main | — | `room/shared/{schemas,types.ts,constants.ts}`, `auth/shared/schemas/delete-current-session.ts`, stub `create-room.action.ts` + `delete-current-session.action.ts`, `core/shared/i18n/vi.ts` | `feat(room): add create room schemas, types and action contracts` |
| S2 | server-worker | backend | S1 | `room/shared/domain/**`, `core/server/random.ts`, `core/db/ttl.ts` (+test) | `feat(room): add ticket set generator and random code helpers` |
| S3 | db-worker | backend | S2 | `room/db/**`, `auth/db/user.repository.ts`, `firestore.rules`, `firestore.indexes.json`, `scripts/seed/**`, `tests/emulator/room/rooms-rules.test.ts` | `feat(room): add room repositories, rules and t003 seed` (2 commit nếu > 400 dòng: repo / rules+seed) |
| S4 | server-worker | backend | S3 | `room/server/**`, `auth/server/**` (sửa service + action thật), `core/server/session.ts`, `tests/emulator/room/{create-room,room-expiry}.test.ts`, `tests/emulator/room/session-cookie.ts`, `tests/emulator/auth/delete-current-session.test.ts` | `feat(room): implement createRoom with lazy expiry` · `feat(auth): implement deleteCurrentSession for users outside a room` |
| S5 | ui-worker | client | S1 | `core/client/hooks/**`, `core/client/ui/{skeleton,dropdown-menu,avatar}.tsx`, `room/client/**`, `auth/client/**`, `src/app/page.tsx`, `src/app/room/page.tsx` | `feat(room): add home screen and minimal room lobby` · `feat(auth): add account header with sign out` |

Đợt: **W1** S1 (inline) → **W2** lane backend (S2→S3→S4, 1 subagent) ‖ lane client (S5, 1 subagent) → gate + commit theo lane.
Kiểm chồng file: backend ∩ client = ∅ (`auth/db`, `auth/server` thuộc backend; `auth/client` thuộc client; `vi.ts` thuộc S1). S5 cần `dropdown-menu` → phụ thuộc `radix-ui` đã có trong `package.json` (kiểm lúc làm; thiếu thì dùng `Sheet` có sẵn, không cài package).

## 5. Ánh xạ AC → kiểm chứng
| AC | Cách kiểm | File test / TC |
|---|---|---|
| AC-1 | component + chrome | `home-screen.test.tsx`; TC |
| AC-2 | emulator + chrome | `create-room.test.ts`; TC (thêm: thấy mã phòng 6 ký tự) |
| AC-3 | emulator + chrome | `create-room.test.ts` (thêm `join_code` khớp `^[A-HJ-NP-Z2-9]{6}$`, `games.claims = []`, `resume_status = null`); TC Emulator UI |
| AC-4 | emulator + unit | `create-room.test.ts`, `generate-ticket-set.test.ts` |
| AC-5 | unit | `generate-ticket-set.test.ts` (10.000 bộ, < 10 giây) |
| AC-6 | emulator + chrome | `create-room.test.ts`, `room-name.test.ts`; TC |
| AC-7 | emulator + component + chrome | `create-room.test.ts`, `create-room-form.test.tsx`; TC |
| AC-8 | emulator + component | `create-room.test.ts`, `home-screen.test.tsx` (toast + card 9) |
| AC-9 | emulator | `create-room.test.ts`, `room-expiry.test.ts` |
| AC-10 | chrome | TC |
| AC-11 | chrome | TC 2 tab |
| AC-12 | component + chrome | `home-screen.test.tsx`, `leave-reason.test.ts`; TC |
| AC-13 | component + chrome | `room-lobby.test.tsx`; TC |
| AC-14 | emulator + chrome | `delete-current-session.test.ts`; TC |
| AC-15 | emulator | `delete-current-session.test.ts` |
| AC-16 | emulator + component + chrome | `delete-current-session.test.ts`, `account-header.test.tsx`; TC |
| AC-17 | emulator | `rooms-rules.test.ts` |
| AC-18 | emulator + chrome | `create-room.test.ts`; TC Emulator UI |
| AC-19 | unit | `random-code.test.ts`, `random.test.ts` (10.000 invite + 10.000 join code đúng định dạng; spy `crypto.randomInt`) |
| AC-20 | component | `home-screen.test.tsx` |
| AC-21 | emulator + chrome | `create-room.test.ts`; TC |
| AC-22 *(mới)* | emulator | `create-room.test.ts`: phòng `active` đã giữ `join_code` X, ép RNG trả X lần đầu → phòng mới nhận mã khác; phòng `closed` giữ X không chặn |

## 6. Giả định & câu hỏi mở
Chép từ task:
- `[ASSUMED]` Ở SCR-02, menu avatar chỉ hiện "Đăng xuất" khi `current_room_id = null`; server ném `INTERNAL_ERROR` cho nhánh ở phòng, không đổi dữ liệu. T-011 làm nhánh ở phòng (player = leaveRoom, host = đóng phòng `host_left` — Q-052, Q-057).
- `[ASSUMED]` "Hồ sơ cá nhân" ẩn tới T-011.
- `[ASSUMED]` Lệch spec tên phòng: Zod chỉ kiểm kiểu (+ `max(200)` chống payload lớn), độ dài 1–50 kiểm sau trim → `ROOM_NAME_INVALID`. UI xử lý `VALIDATION_FAILED` và `ROOM_NAME_INVALID` giống nhau. Không gửi `name` → "Phòng của {display_name}" cắt còn 50 ký tự.
- `[ASSUMED]` `/room` tối thiểu hiện link mời dạng chữ + "Copy link" cho host. Nút Mời/Web Share thật ở T-006.
- `[ASSUMED]` RTDB `presence_access` ghi sau commit Firestore; lỗi chỉ log.
- `[ASSUMED]` `applyLazyExpiry` dựng ở task này. Nhánh ván `running`/`paused`/`awaiting_confirm` chỉ đặt phòng `closing` + `last_event = room_closing`; T-006/T-007 làm phần tự kết thúc ván (BR-04, Q-055).
- `[ASSUMED]` `/` luôn chuyển `/room` khi đang ở phòng; card 9 chỉ thấy khi `current_room_id` đổi lúc đang mở trang, hoặc sau `ALREADY_IN_ROOM`.
- `[ASSUMED]` `invite_code` không kiểm trùng (xác suất ~2⁻¹²⁸).

Mới (theo specs Q-055..Q-058 và quyết định dev):
- `[ASSUMED]` `join_code` sinh bằng `crypto.randomInt` từ bảng `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; kiểm trùng **trong transaction** bằng query `rooms where join_code == X` (single-field index tự có) rồi lọc `status ∈ {active, closing}`; trùng → sinh lại tối đa 5 lần, quá → `INTERNAL_ERROR` + log.
- `[ASSUMED]` `RoomCreated.roomCode` = `join_code`. `/room` tối thiểu hiện "Mã phòng" cho mọi thành viên (chỉ host thấy link mời) để T-004 demo nhập mã được.
- `[ASSUMED]` Card 8 ở T-003 chỉ có tiêu đề "Vào phòng" + dòng gợi ý link mời, **không nút, không dialog**. T-004 thêm nút + dialog nhập mã (A4) và đổi gợi ý thành chữ Q-056.
- `[ASSUMED]` Nhãn trạng thái ván: `waiting` "Chờ bắt đầu", `running` "Đang quay", `paused` "Tạm dừng", `awaiting_confirm` "Chờ host duyệt", `finished` "Đã kết thúc", `cancelled` "Đã hủy" (bỏ `claim_window`).
- `[ASSUMED]` Banner 4 có thêm lý do `host_left` ("Host đã đóng phòng "{tên}".") — suy ra từ `rooms.close_reason = host_left` (chưa có nguồn ghi tới T-011; chữ + logic suy luận có sẵn).
- `[ASSUMED]` Doc ván 1 có `claims = []`, `resume_status = null`, `winners = []` (TBL-05 mới); không có `claim_window_ends_at`.
- `[ASSUMED]` `requireUser()` tiếp tục nằm ở `features/auth/server/queries` (như T-002).
- `[ASSUMED]` Thao tác `users` trong transaction của `createRoom` đi qua hàm mới ở `auth/db/user.repository.ts` (repository duy nhất biết `users`); service `room` được import `db` của feature khác theo bảng import.
- `[ASSUMED]` `seedRoom` ghi doc trực tiếp bằng admin SDK (như seed T-002), vé sinh bằng `generateTicketSet(seededRng(seed))` import từ `src/features/room/shared/domain` (tsx đọc alias `@/`).

Không còn ❓.

## 7. Rủi ro
- Firestore transaction yêu cầu đọc trước ghi: lazy expiry + kiểm `join_code` + tạo phòng gom một transaction → service phải tách rõ pha đọc / pha ghi.
- `generateTicketSet` có thể bế tắc khi sinh ma trận 0/1 → giới hạn số lần thử lại, test 10.000 bộ < 10 giây.
- shadcn CLI làm hỏng lockfile → viết component UI tay; không `npm install`.
- `cacheComponents`: page đọc cookie phải nằm trong `<Suspense>`; client listener cần Firebase Auth client đã đăng nhập (AuthSync xử lý mất phiên).
- Test emulator cần cookie phiên thật (helper từ `google-token.ts`).

## 8. Kết quả (orchestrator điền khi xong)
- Commits: …
- Lint/typecheck/test: …
- QC: `backlog/testcases/T-003-*.md` — P0 x/y, P1 x/y
- Còn lại cho dev review: …
