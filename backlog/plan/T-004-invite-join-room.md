---
task: T-004
title: Lời mời & vào phòng (SCR-03)
status: approved
approved_at: 2026-11-21
branch: feature/dongt/create-room
plan_commit: null
---

# Plan T-004 · Lời mời & vào phòng (SCR-03)

## 1. Tóm tắt
Sau task: host copy link `/join/{code}` hoặc "Copy mã" (mã phòng 6 ký tự) ở `/room`. Người thứ 2 mở link khi chưa đăng nhập → thấy ảnh/tên host, tên phòng, "Link hết hạn lúc HH:mm" → "Đăng nhập để vào phòng" → đăng nhập xong quay lại đúng link → "Vào phòng" → `/room`, cả hai thấy "2 người". Người đã có tài khoản còn vào được bằng mã phòng ở Trang chủ (nút "Vào phòng" → dialog nhập mã → `joinRoom({roomCode})`). HTML của `/join/{code}` có đủ thẻ Open Graph, không cần cookie.

Dev đã chốt (2026-11-21): làm theo specs mới Q-055..Q-058 — `joinRoom` nhận `inviteCode` **hoặc** `roomCode` (lỗi mới `ROOM_CODE_INVALID`); gồm **SCR-02.A4** (nút "Vào phòng" + dialog nhập mã) chuyển từ T-003. Sheet Mời đầy đủ (SCR-04 #19) vẫn thuộc T-006; task này thêm "Copy mã" vào `/room` tối thiểu.

## 2. Nguồn đã đọc
- Task: `backlog/tasks/T-004-invite-join-room.md` (kèm ghi chú ⚠ Q-055..Q-058)
- Specs:
  - `api-contract.yml` › `getInvite` (`GET /invites/{inviteCode}`, `x-transport: ssr`), `joinRoom` (`POST /rooms/join`, 6 bước kiểm, `x-errors` có `ROOM_CODE_INVALID`), schemas `InvitePreview`, `InviteViewer`, `JoinRoomRequest` (oneOf), `JoinRoomResult`, `RoomCode`, `InviteCode`
  - `database.md` › TBL-01, TBL-02 (`join_code`, `invite_expires_at`, `blocked_uids`, `last_event`), TBL-08 (`presence_access`)
  - `ui-ux/scr-03-join.md` (§1–5), `scr-02-home.md` (#8, #10, A4), `scr-04-room.md` #19/A7 (Sheet Mời — chỉ lấy chữ "Copy mã", "Đã copy mã phòng")
  - `idea/business.md` BR-02, BR-03, BR-04, BR-05, BR-06, BR-25, BR-30; FLOW-03
  - `tech-stack.md` ADR-05, ADR-09
- Next.js docs: `03-api-reference/04-functions/generate-metadata.md` (mục *With Cache Components*, `metadataBase`, `openGraph`, streaming metadata), `05-config/01-next-config-js/htmlLimitedBots.md`, `cookies.md`, `redirect.md`, `connection.md`

## 3. Thiết kế
Feature sở hữu: **`invite`** (kiến trúc: `/join/[code]`, Open Graph, mã phòng) — `getInvite`, `joinRoom`, màn SCR-03. Dữ liệu `rooms` / `users` đi qua `room/db` và `auth/db` (service được import `db` của feature khác theo bảng import). Dialog nhập mã ở Trang chủ thuộc `room/client` (SCR-02) và gọi `joinRoomAction` của `invite` (client được import action của feature khác).

### 3.1 Feature & file theo lớp
| Lớp | File | Tạo/Sửa | Nội dung |
|---|---|---|---|
| shared | `src/features/invite/shared/schemas/join-room.ts` | Tạo | `JoinRoomInput` = union của `z.strictObject({inviteCode})` và `z.strictObject({roomCode})` (đúng 1 trong 2) |
| shared | `src/features/invite/shared/types.ts` | Tạo | `InviteStatus`, `InviteRoom`, `InviteViewer`, `InvitePreview`, `JoinRoomResult` |
| shared | `src/features/invite/shared/domain/invite-status.ts` (+test) | Tạo | `computeInviteStatus({status, memberCount, inviteExpiresAt}, now)` → `closed` / `expired` / `full` / `valid` |
| shared | `src/features/invite/shared/domain/format-invite-expiry.ts` (+test) | Tạo | `formatInviteExpiry(expiresAt, now)` → "HH:mm" hoặc "HH:mm dd/MM" khi khác ngày (GMT+7) |
| shared | `src/features/room/shared/domain/room-code.ts` (+test) | Tạo | `normalizeRoomCode(raw)` (in hoa, bỏ khoảng trắng, bỏ ký tự ngoài bảng), `isRoomCode(value)` |
| shared | `src/features/room/shared/constants.ts` | Sửa | `MAX_MEMBERS = 16` |
| shared | `src/core/shared/i18n/vi.ts` | Sửa | key `join.*`, `home.join*` mới, `room.copyCode`, `event.memberJoined` |
| db | `src/features/room/db/room.mapper.ts` (+test) | Sửa | `RoomRecord` thêm `blockedUids`, `inviteExpiresAt`; map từ doc |
| db | `src/features/room/db/room.repository.ts` | Sửa | `findRoomByInviteCode(code)` (không tx), `findRoomByInviteCodeInTx`, `findActiveRoomByJoinCodeInTx`, `addMemberInTx(tx, roomId, {memberCount, uid, displayName, now})` (+1, `last_event = member_joined`) |
| db | `src/features/auth/db/user.repository.ts` | Sửa | `getPublicProfile(uid)` → `{displayName, photoUrl}` (host), `getViewerRoomId(uid)` nếu cần |
| db | `firestore.rules`, `firestore.indexes.json` | Giữ | Không đổi: `invite_code` / `join_code` dùng index single tự có; client đọc `rooms/{id}` qua `isMember` (T-003) |
| seed | `scripts/seed/lib/seed-room.ts` | Sửa | thêm `memberCount?`, `blockedUids?`, `closeReason?` |
| seed | `scripts/seed/scenarios/t004.ts`, `scripts/seed/index.ts` | Tạo/Sửa | `u_host`, `u_khoa`, `u_lan`, `u_minh`; phòng `r_ok`, `r_late`, `r_closed`, `r_full`, `r_block`, `r_other`; in 5 URL `/join/…` |
| server | `src/features/invite/server/queries/get-invite.query.ts` | Tạo | `getInvite(code, viewerUid?)` — đọc thuần, `React.cache` phần phòng, ném `AppError('INVITE_INVALID')` |
| server | `src/features/invite/server/services/join-room.service.ts` | Tạo | `joinRoom(uid, input)` — transaction 6 bước, kết quả dạng `{error}` để vẫn commit lazy expiry |
| server | `src/features/invite/server/actions/join-room.action.ts` | Tạo | `joinRoomAction`, `auth: 'required'` |
| client | `src/features/invite/client/components/join-screen.tsx` (+test) | Tạo | thân SCR-03: ảnh host, lời mời, tên phòng, hạn, nút chính, `useTransition` gọi action, map lỗi |
| client | `src/features/invite/client/components/join-error.tsx` (+test) | Tạo | khung lỗi 7 (3 biến thể + "Không tải được lời mời" + "Thử lại") |
| client | `src/features/invite/client/components/in-other-room-dialog.tsx` (+test) | Tạo | dialog 8, đọc tên phòng hiện tại qua `useDocListener` |
| client | `src/features/invite/client/index.ts` | Tạo | export `JoinScreen`, `JoinError` |
| client | `src/features/room/client/components/join-room-card.tsx` (+test) | Tạo | card 8 có nút "Vào phòng" + dialog 10 nhập mã 6 ký tự → A4 |
| client | `src/features/room/client/components/home-screen.tsx` (+test) | Sửa | thay card gợi ý bằng `JoinRoomCard`; `ALREADY_IN_ROOM` từ dialog → `handleAlreadyInRoom` |
| client | `src/features/room/client/components/room-lobby.tsx` (+test) | Sửa | nút "Copy mã" (host), toast "Đã copy mã phòng" |
| app | `src/app/join/[code]/page.tsx` | Tạo | RSC: `generateMetadata` + trang; `<Suspense>` quanh phần đọc phiên; `redirect('/room')` khi `inThisRoom` |
| app | `src/app/join/[code]/loading.tsx` | Tạo | skeleton khi đang đọc |
| app | `next.config.ts` | Sửa | `htmlLimitedBots` thêm Zalo / Telegram (xem giả định) |
| app | `public/og/invite.png` | Tạo | ảnh chung 1200×630 (logo + "Lô Tô Online"), sinh một lần bằng script ngoài repo |
| test | `tests/emulator/invite/get-invite.test.ts` | Tạo | AC-1, 7, 8, 9, 13, 18 |
| test | `tests/emulator/invite/join-room.test.ts` | Tạo | AC-3, 4, 6–15, 19 + nhánh `roomCode` |
| test | `src/app/join/[code]/metadata.test.ts` | Tạo | `generateMetadata` (AC-16) |

Tổng: shared 11 · db 4 · seed 3 · server 3 · client 14 · app 5 · test emulator 2.

### 3.2 Contract (để các lane chạy song song)
```ts
// invite/shared/types.ts
export type InviteStatus = "valid" | "expired" | "closed" | "full";
export type InviteRoom = {
  name: string; hostName: string; hostPhotoUrl: string | null;
  memberCount: number; maxMembers: 16; expiresAt: string; // ISO
};
export type InviteViewer = { inThisRoom: boolean; currentRoomId: string | null; blocked: boolean };
export type InvitePreview = { status: InviteStatus; room: InviteRoom; viewer: InviteViewer | null };
export type JoinRoomResult = { roomId: string; alreadyMember: boolean };

// invite/shared/schemas/join-room.ts — đúng 1 trong 2 key
export type JoinRoomInput = { inviteCode: string } | { roomCode: string };

// room/shared/domain/room-code.ts
export function normalizeRoomCode(raw: string): string; // in hoa, bỏ khoảng trắng + ký tự ngoài ABCDEFGHJKLMNPQRSTUVWXYZ23456789, cắt còn 6
export function isRoomCode(value: string): boolean;     // ROOM_CODE_PATTERN

// invite/shared/domain/format-invite-expiry.ts
export function formatInviteExpiry(expiresAt: Date, now: Date): string; // "20:00" hoặc "20:00 22/11"

// Server
getInvite(code: string, viewerUid?: string | null): Promise<InvitePreview>
  // ném AppError("INVITE_INVALID") khi sai định dạng / không tồn tại; không ghi DB
joinRoomAction(input: JoinRoomInput): Promise<ActionResult<JoinRoomResult>>
  // lỗi: VALIDATION_FAILED, UNAUTHENTICATED, INVITE_INVALID, ROOM_CODE_INVALID, INVITE_EXPIRED,
  //      BLOCKED_FROM_ROOM, ALREADY_IN_ROOM (details[0] = {code:'current_room', currentRoomId}), ROOM_FULL
```
Route: `/join/[code]` (SCR-03), `/` (thêm A4), `/room` (thêm "Copy mã"). `returnTo` = `/join/{code}` (đã có `parseReturnTo`, `postLoginPath`).

Key i18n mới (S1 thêm vào `vi.ts`):
```
join.inviteTitle          "{host} mời bạn chơi lô tô"
join.expires              "Link hết hạn lúc {time}"
join.signInToJoin         "Đăng nhập để vào phòng"
join.joinRoom             "Vào phòng"
join.joining              "Đang vào phòng…"
join.joinFailed           "Không vào được phòng, thử lại"
join.errorTitleInvalid    "Link không còn hiệu lực"
join.errorDescInvalid     "Link mời đã hết hạn hoặc phòng đã đóng. Hãy xin host link mới."
join.errorTitleFull       "Phòng đã đầy"
join.errorDescFull        "Phòng này đã đủ 16 người."
join.errorTitleBlocked    "Bạn không thể vào phòng này"
join.errorDescBlocked     "Host đã mời bạn ra khỏi phòng này."
join.errorTitleLoad       "Không tải được lời mời"
join.errorDescLoad        "Kiểm tra kết nối rồi thử lại."
join.retry                "Thử lại"
join.backHome             "Về trang chủ"
join.otherRoomBody        "Bạn đang ở \"{name}\". Mỗi người chỉ ở 1 phòng — hãy rời phòng đó trước."
join.otherRoomClose       "Đóng"
join.otherRoomGo          "Về phòng hiện tại"
home.joinHint             (đổi) "Có mã phòng 6 ký tự từ bạn bè? Hoặc mở link mời bạn nhận được."
home.joinButton           "Vào phòng"
home.joinDialogTitle      "Nhập mã phòng"
home.joinCodeLabel        "Mã phòng"
home.joinCodePlaceholder  "K7M2QX"
home.joinSubmit           "Vào"
home.joining              "Đang vào…"
home.joinCodeInvalid      "Mã phòng không đúng hoặc đã hết hạn"   (= error.ROOM_CODE_INVALID, dùng chung)
room.copyCode             "Copy mã"
room.codeCopied           "Đã copy mã phòng"
event.memberJoined        "{name} đã vào phòng"
```
`data-testid` chính: `join-host-avatar`, `join-title`, `join-room-name`, `join-expires`, `join-primary-button`, `join-error`, `join-error-title`, `join-error-home`, `join-error-retry`, `join-other-room-dialog`, `join-other-room-go`, `join-other-room-close`, `join-room-open-button`, `join-code-dialog`, `join-code-input`, `join-code-error`, `join-code-submit`, `room-copy-code`.

### 3.3 Luồng chính
- **Mở link (SCR-03.A0):** `page.tsx` (RSC) → `generateMetadata(code)` gọi `getInvite(code)` không cookie → tag OG. Thân trang trong `<Suspense>`: `await connection()` → `getSessionUid()` → `getInvite(code, uid)` (phần phòng dùng `React.cache`, đọc 1 lần/request) → `viewer.inThisRoom` → `redirect('/room')`; `status ≠ valid` hoặc `viewer.blocked` → `JoinError`; không phải → `JoinScreen`. Mã sai định dạng → không truy vấn DB, hiện "Link không còn hiệu lực". Lỗi đọc dữ liệu → `JoinError` "Không tải được lời mời" + "Thử lại" (tải lại trang).
- **Vào phòng (SCR-03.A1):** `JoinScreen` → `joinRoomAction({inviteCode})` → `joinRoom(uid, input)`:
  1. Transaction — đọc trước, ghi sau: tìm phòng theo `invite_code` (hoặc `join_code == X` + `status == active`); đọc `users/{uid}`.
  2. Không có phòng → `INVITE_INVALID` / `ROOM_CODE_INVALID`. `users.current_room_id == roomId` → `{alreadyMember: true}`, không ghi.
  3. Phòng `active` mà `now ≥ expires_at` → `planLazyExpiry` (T-003) → ghi đóng phòng → trả `{error: INVITE_EXPIRED}` (với `roomCode`: `ROOM_CODE_INVALID`). Phòng `closing`/`closed` hoặc `now ≥ invite_expires_at` → lỗi tương ứng, không ghi.
  4. `uid ∈ blocked_uids` → `BLOCKED_FROM_ROOM`.
  5. `current_room_id` là phòng khác → `planLazyExpiry` cho phòng đó: còn mở → ghi `closing` (nếu vừa tới hạn) và `ALREADY_IN_ROOM`; đã đóng (vừa đóng lười hoặc `closed`) → tiếp tục.
  6. `member_count ≥ 16` → `ROOM_FULL`.
  7. Hợp lệ: `users.current_room_id`, `rooms.member_count + 1`, `last_event = member_joined`. Không đụng `players` (BR-25).
  8. Sau commit: `plan.afterCommit()`; ghi RTDB `presence_access/{roomId}/{uid} = true` (lỗi chỉ log). Transaction trả `{error}` thay vì ném → action đổi thành `AppError` sau commit.
- **Vào bằng mã phòng (SCR-02.A4):** `JoinRoomCard` mở dialog → `normalizeRoomCode` → khi đủ 6 ký tự bật nút "Vào" → `joinRoomAction({roomCode})` → thành công `router.push('/room')`; `ROOM_CODE_INVALID` → dòng lỗi dưới ô; `ROOM_FULL` / `BLOCKED_FROM_ROOM` → dòng lỗi; `ALREADY_IN_ROOM` → đóng dialog, `HomeScreen.handleAlreadyInRoom` (card 9 + toast); `UNAUTHENTICATED` → `/login`.
- **Realtime:** `/room` đã nghe `rooms/{id}` nên host tự thấy "2 người".

## 4. Các bước thực hiện
| Step | Worker | Lane | Phụ thuộc | Phạm vi file | Commit dự kiến |
|---|---|---|---|---|---|
| S1 | server-worker (contract) | main | — | `invite/shared/{types.ts,schemas,domain/format-invite-expiry*}`, `room/shared/{constants.ts,domain/room-code*}`, stub `join-room.action.ts` + `get-invite.query.ts`, `vi.ts` | `feat(invite): add join room schemas, types and contracts` |
| S2 | db-worker | backend | S1 | `room/db/**`, `auth/db/user.repository.ts`, `scripts/seed/**` | `feat(invite): add room lookup repositories` · `feat(invite): add t004 seed scenario` |
| S3 | server-worker | backend | S2 | `invite/shared/domain/invite-status*`, `invite/server/**`, `tests/emulator/invite/**` | `feat(invite): implement getInvite query` · `feat(invite): implement joinRoom by invite code or room code` |
| S4 | ui-worker | client | S1 | `invite/client/**`, `src/app/join/**`, `public/og/invite.png`, `next.config.ts` | `feat(invite): add invite page with open graph metadata` |
| S5 | ui-worker | client | S1 | `room/client/**` (home join card + dialog, "Copy mã") | `feat(room): add join by room code on home` · `feat(room): add copy room code to room page` |

Đợt: **W1** S1 (inline) → **W2** lane backend (S2→S3) ‖ lane client (S4→S5). Hai lane không chung file (`vi.ts`, `room/shared`, `room-code.ts` thuộc S1; `room/db` thuộc backend; `room/client` thuộc client). Gate chung + commit theo lane sau W2.

## 5. Ánh xạ AC → kiểm chứng
| AC | Cách kiểm | File test / TC |
|---|---|---|
| AC-1 | emulator + component + chrome | `get-invite.test.ts`, `join-screen.test.tsx`; TC |
| AC-2 | chrome | TC (`login-invite-banner` + returnTo đã có từ T-002) |
| AC-3 | emulator + component + chrome | `join-room.test.ts`, `join-screen.test.tsx`; TC |
| AC-4 | emulator + chrome | `join-room.test.ts`; TC Emulator UI |
| AC-5 | chrome (2 profile) | TC (listener `/room` từ T-003) |
| AC-6 | emulator + chrome | `join-room.test.ts`; TC |
| AC-7 | emulator + chrome | `get-invite.test.ts`, `join-room.test.ts` (kiểm commit đóng lười); TC |
| AC-8 | emulator | `get-invite.test.ts`, `join-room.test.ts` |
| AC-9 | emulator + component + chrome | `get-invite.test.ts` (spy không truy vấn DB), `join-room.test.ts`, `join-error.test.tsx`; TC |
| AC-10 | emulator + component + chrome | `join-room.test.ts`, `join-screen.test.tsx`; TC |
| AC-11 | emulator + component + chrome | `join-room.test.ts`, `in-other-room-dialog.test.tsx`; TC |
| AC-12 | emulator | `join-room.test.ts` |
| AC-13 | emulator + chrome | `join-room.test.ts`, `get-invite.test.ts`; TC |
| AC-14 | emulator | `join-room.test.ts` (service gọi song song, chạy 5 lần ổn định) |
| AC-15 | emulator + chrome | `join-room.test.ts`; TC |
| AC-16 | unit + chrome (`curl`/view-source) | `metadata.test.ts`; TC |
| AC-17 | chrome (build + start) | TC |
| AC-18 | emulator | `get-invite.test.ts` (so key `InvitePreview`) |
| AC-19 | emulator + component | `join-room.test.ts` (không cookie), `join-screen.test.tsx` (→ `/login?returnTo=`) |
| AC-20 | chrome | TC |
| AC-21 | component | `join-error.test.tsx`, `join-screen.test.tsx` |
| AC-22 *(mới)* | emulator | `join-room.test.ts`: `roomCode` hợp lệ → vào phòng như `inviteCode`; chuẩn hóa chỉ ở client |
| AC-23 *(mới)* | emulator | `join-room.test.ts`: mã phòng không tồn tại / phòng `closed` / `closing` / quá hạn → `ROOM_CODE_INVALID`; phòng quá hạn vẫn bị đóng lười |
| AC-24 *(mới)* | component + chrome | `join-room-card.test.tsx` (in hoa, bỏ khoảng trắng, nút bật khi đủ 6, mỗi mã lỗi A4); TC |
| AC-25 *(mới)* | component + chrome | `room-lobby.test.tsx` ("Copy mã" chỉ host, toast "Đã copy mã phòng"); TC |
| AC-26 *(mới)* | emulator | `join-room.test.ts`: `roomCode` + `ROOM_FULL` / `BLOCKED_FROM_ROOM` / `ALREADY_IN_ROOM` đúng thứ tự 6 bước |

## 6. Giả định & câu hỏi mở
Chép từ task:
- `[ASSUMED]` `getInvite` không ghi DB (không đóng lười), chỉ tính `status` theo giờ server; đóng lười xảy ra khi `joinRoom` hoặc các action sau.
- `[ASSUMED]` Khi `joinRoom` phải đóng lười phòng rồi trả lỗi, transaction trả kết quả có lỗi thay vì ném để phần đóng phòng vẫn commit.
- `[ASSUMED]` Mã sai định dạng: trang mời hiện "Link không còn hiệu lực" (không truy vấn DB); `joinRoomAction` trả `VALIDATION_FAILED`.
- `[ASSUMED]` Hạn link khác ngày (GMT+7) → "HH:mm dd/MM".
- `[ASSUMED]` Metadata khi mã lỗi: title "Lô Tô Online", không lộ tên phòng.
- Lệch spec, theo api-contract: `viewer {inThisRoom, currentRoomId, blocked}` (không `none/member/...`, không `currentRoomName`); tên phòng hiện tại trong dialog 8 do client đọc `rooms/{currentRoomId}` qua Firestore.
- `scr-03` ghi `INVITE_EXPIRED` hai lần ở cột lỗi của A1 → hiểu là `INVITE_INVALID` / `INVITE_EXPIRED`.
- Toast "{tên} đã vào phòng" thuộc T-006; task này chỉ ghi `last_event`.
- NFR-04 chỉ đo tham khảo trên local.

Mới (theo specs Q-055..Q-058 và quyết định dev):
- `[ASSUMED]` `roomCode`: tìm `join_code == X` rồi lọc `status == active`; **mọi** trường hợp phòng không mở được (không tồn tại, `closed`, `closing`, quá hạn) đều trả `ROOM_CODE_INVALID` (api-contract: không phân biệt để khó dò mã). Phòng `active` mà quá `expires_at` vẫn được đóng lười trước khi trả lỗi. `INVITE_EXPIRED` chỉ xuất hiện với `inviteCode`.
- `[ASSUMED]` `JoinRoomInput` là union strict của 2 object: gửi cả hai key hoặc không key nào → `VALIDATION_FAILED`. Server **không** chuẩn hóa `roomCode` (client chuẩn hóa in hoa + bỏ khoảng trắng — theo api-contract).
- `[ASSUMED]` `getInvite` ném `AppError('INVITE_INVALID')` (không trả `status: not_found`) vì api-contract coi đó là lỗi 404; trang bắt lỗi và hiện khung 7. Phần đọc phòng + host dùng `React.cache` theo `code`; `viewer` tính riêng theo `uid` nên `generateMetadata` (không cookie) và trang chỉ truy vấn phòng 1 lần/request.
- `[ASSUMED]` `getInvite` trả `status ≠ valid` thì `generateMetadata` dùng title "Lô Tô Online" chung (không lộ tên phòng đã đóng/đầy); chỉ `status = valid` mới có `og:title` theo host + `og:description` tên phòng.
- `[ASSUMED]` `og:image` dùng `/og/invite.png` tĩnh 1200×630 (ADR-09) sinh một lần bằng script ngoài repo (Python/PIL) rồi commit file ảnh.
- `[ASSUMED]` `htmlLimitedBots` ghi đè danh sách mặc định → dùng regex mặc định của Next + `Zalo|TelegramBot|Viber|Line` để crawler xem trước nhận thẻ `<meta>` trong `<head>` (không streaming). Zalo/Telegram thật không kiểm được trên local (Q-053); chỉ kiểm bằng `curl -A`.
- `[ASSUMED]` "Copy mã" trong `/room` tối thiểu chỉ hiện cho host (BR-05: chỉ host thấy nút chia sẻ/copy), mã vẫn hiển thị cho mọi thành viên như T-003. Sheet Mời đầy đủ (chia sẻ Web Share, hạn, đếm người) ở T-006.
- `[ASSUMED]` Ảnh host dùng component `Avatar` (radix) với `referrerPolicy = "no-referrer"` (ảnh Google); không đăng ký `images.remotePatterns` vì không dùng `next/image`. Không có ảnh → chữ cái đầu tên host.
- `[ASSUMED]` Người bị `blocked` mở link: không hiện nút "Vào phòng" (khung 7 "Bạn không thể vào phòng này"); chưa đăng nhập thì `blocked` không biết → nút "Đăng nhập để vào phòng" như bình thường, bị chặn ở bước vào.
- `[ASSUMED]` Dialog 8 mở ngay khi tải trang nếu `viewer.currentRoomId` là phòng khác; sau "Đóng" vẫn thấy trang mời với nút "Vào phòng" (bấm sẽ lại mở dialog nhờ `ALREADY_IN_ROOM`).
- `[ASSUMED]` Vào phòng khi ván đang chạy (FLOW-03 A3) không bị chặn ở server (chỉ xem — làm ở T-006); `joinRoom` không kiểm trạng thái ván.
- `[ASSUMED]` Dữ liệu seed `t004`: `join_code` các phòng dùng bảng ký tự hợp lệ (`TET234`, `LATE22`, `CLSD22`, `FULL22`, `BLCK22`, `LAN234`).

Không còn ❓.

## 7. Rủi ro
- `cacheComponents`: `generateMetadata` gọi Firestore (dữ liệu runtime) → nếu cả trang còn lại cũng dynamic (cookie trong `<Suspense>`) thì chạy được; cần kiểm bằng `npm run build` + `curl -A facebookexternalhit` để chắc thẻ `og:*` nằm trong `<head>` (không bị stream sau `</head>`).
- Giữ đúng thứ tự "mọi đọc trước mọi ghi" trong transaction có tới 2 `planLazyExpiry` (phòng đích + phòng hiện tại) — chỉ một trong hai chạy ghi tại mỗi nhánh; test từng nhánh.
- `ROOM_FULL` song song: dựa vào khóa doc của transaction Firestore; test chạy 5 lần liên tiếp mới coi là ổn định.
- Đăng nhập redirect trên điện thoại mất `returnTo`? Đã xử lý ở T-002 (`parseReturnTo`/`postLoginPath`), chỉ kiểm lại bằng TC.
- Người dùng bị `blocked` lộ qua `viewer.blocked` chỉ khi đã có phiên — không lộ danh sách `blocked_uids` (NFR-10).

## 8. Kết quả (orchestrator điền khi xong)
- Commits: …
- Lint/typecheck/test/build: …
- QC: `backlog/testcases/T-004-*.md` — P0 x/y, P1 x/y
- Còn lại cho dev review: …
