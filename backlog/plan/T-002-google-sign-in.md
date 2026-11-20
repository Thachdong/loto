---
task: T-002
title: Đăng nhập Google (SCR-01)
status: approved
approved_at: 2026-11-20
branch: feature/dongt/sign-in
plan_commit: null
---

# Plan T-002 · Đăng nhập Google (SCR-01)

## 1. Tóm tắt
Người chưa đăng nhập mở `/` bị chuyển `/login` (SCR-01). Đăng nhập Google qua Auth emulator (popup trên máy tính, redirect trên điện thoại) → `createSessionAction` verify ID token (chỉ `google.com`, `auth_time` ≤ 5 phút), upsert `users/{uid}` trong transaction, đặt cookie `__session` 14 ngày → điều hướng `returnTo` hợp lệ / `/room` / `/`. Trang `/` tối thiểu "Xin chào, {tên}", `/room` giữ chỗ. Trình duyệt trong ứng dụng chat (Zalo, Messenger…) thấy panel "Mở bằng trình duyệt" + "Mở bằng Chrome" (Android) + "Copy link". `defineAction` `auth: 'required'` kiểm phiên thật. Rules `users/{uid}` chỉ chính chủ đọc.

Feature mới: **`auth`** (sở hữu TBL-01 `users` ở task này; T-011 profile dùng lại repository).

## 2. Nguồn đã đọc
- Task: `backlog/tasks/T-002-google-sign-in.md`
- Specs: api-contract › `createSession`, `SessionCreate`, `SessionResult`, `Me`, mục Xác thực (ADR-07) và Quy ước (không lộ email người khác); database › TBL-01 `users`; ui-ux › `scr-01-login.md` §1–5; FLOW-01 (qua task); ADR-07.
- Next.js docs: `03-api-reference/04-functions/cookies.md` (async, set trong Server Function), `02-guides/authentication-with-cache-components.md` (**`cacheComponents: true` ⇒ đọc `cookies()`/`headers()`/`searchParams` phải nằm trong `<Suspense>`, ngoài boundary là lỗi build**; `redirect()` trong boundary được), `03-api-reference/01-directives/use-server.md`.
- Code hiện có: `core/server/{action,session,firebase-admin,clock}.ts`, `core/db/firestore.ts`, `core/client/{firebase,app-shell}.ts(x)`, `core/shared/i18n/vi.ts`, seed runner, `tests/emulator/helpers.ts`, ESLint boundaries.

## 3. Thiết kế
### 3.1 File theo lớp
Gốc: `implement/webapp/`. Feature `auth` = `src/features/auth/`.

| Lớp | File | Tạo/Sửa | Nội dung |
|---|---|---|---|
| shared | `features/auth/shared/schemas/create-session.ts` | Tạo | `CreateSessionInput = z.strictObject({ idToken: z.string().min(1).max(4096) })` |
| shared | `features/auth/shared/types.ts` | Tạo | `Me`, `SessionResult` (khớp api-contract) |
| shared | `features/auth/shared/domain/parse-return-to.ts` (+test) | Tạo | chỉ nhận `^/join/[0-9A-Za-z]{22}$`, khác → `null` |
| shared | `features/auth/shared/domain/detect-in-app-browser.ts` (+test) | Tạo | `{ inApp, android, mobile }` từ UA |
| shared | `features/auth/shared/domain/post-login-path.ts` (+test) | Tạo | `returnTo` → `/room` nếu `currentRoomId` → `/` |
| shared | `core/shared/i18n/vi.ts` | Sửa | key `login.*`, `home.*`, `room.*`, `common.*` |
| db | `features/auth/db/user.doc.ts` | Tạo | kiểu doc TBL-01 (snake_case) |
| db | `features/auth/db/user.mapper.ts` (+test) | Tạo | `toMe(uid, doc)` |
| db | `features/auth/db/user.repository.ts` | Tạo | `getUser(uid)`, `upsertUserFromGoogle(tx?, …)` trong transaction |
| db | `firestore.rules` | Sửa | `match /users/{uid}`: đọc chính chủ, cấm ghi |
| db | `tests/emulator/auth/users-rules.test.ts` | Tạo | AC-18 |
| db | `scripts/seed/scenarios/t002.ts`, `scripts/seed/index.ts` | Tạo/Sửa | `u_binh`, `u_cuc` (+ doc users), đăng ký `t002` |
| server | `core/server/session.ts` | Sửa | `SESSION_COOKIE = '__session'`, `getSessionUid()` (cookie → `verifySessionCookie(…, true)`, lỗi → null), `setSessionCookie(value)` |
| server | `features/auth/server/services/session.service.ts` | Tạo | `createSession(idToken)`: verify → kiểm provider/auth_time → upsert → cookie → `SessionResult` |
| server | `features/auth/server/actions/create-session.action.ts` | Tạo | `createSessionAction`, `auth: 'none'` |
| server | `features/auth/server/queries/current-user.query.ts` | Tạo | `getCurrentUser(): Me \| null`, `requireUser(): Me` (không phiên/không doc → `redirect('/login')`) |
| server | `tests/emulator/auth/create-session.test.ts` | Tạo | AC-2, 4, 5, 11, 12, 13 (mock `next/headers`) |
| server | `tests/emulator/auth/session.test.ts` | Tạo | AC-19: thiếu cookie / rác / bị thu hồi → `UNAUTHENTICATED`; có phiên → handler nhận `uid` |
| server | `tests/emulator/auth/google-token.ts` | Tạo | helper lấy ID token từ Auth emulator (`signInWithIdp` google.com, `signUp` anonymous/password) |
| client | `features/auth/client/hooks/use-google-sign-in.ts` | Tạo | popup/redirect, `getRedirectResult`, gọi action, trạng thái `idle/loading/error` |
| client | `features/auth/client/components/login-screen.tsx` (+test) | Tạo | khối 1–5 SCR-01, trạng thái loading/error |
| client | `features/auth/client/components/in-app-browser-panel.tsx` (+test) | Tạo | khối 6–8, toast, fallback ô link chọn sẵn |
| client | `features/auth/client/components/auth-sync.tsx` | Tạo | server có phiên mà client `currentUser` null → `/login?reauth=1` |
| client | `features/auth/client/index.ts` | Tạo | export `LoginScreen`, `AuthSync` |
| app | `src/app/login/page.tsx` | Tạo | `<Suspense>` → `LoginGate` (server): đọc `searchParams`, UA (`headers()`, `__ua` khi không production), phiên → A1 redirect (trừ `reauth=1`) → `<LoginScreen …/>` |
| app | `src/app/page.tsx` (+test cập nhật) | Sửa | `<Suspense>` → `requireUser()` → "Xin chào, {displayName}" + `<AuthSync/>` |
| app | `src/app/room/page.tsx` | Tạo | `<Suspense>` → `requireUser()` → "Phòng" + `currentRoomId` + `<AuthSync/>` |

### 3.2 Contract (lane client chỉ dựa vào mục này)
```ts
// features/auth/shared/types.ts
export type Me = {
  uid: string; email: string; displayName: string; photoUrl: string | null;
  googleName: string; googlePhotoUrl: string | null; profileCustomized: boolean; currentRoomId: string | null;
};
export type SessionResult = { me: Me; isNewUser: boolean };

// features/auth/server/actions/create-session.action.ts  ('use server')
export const createSessionAction: (raw: { idToken: string }) => Promise<ActionResult<SessionResult>>;

// features/auth/shared/domain
export function parseReturnTo(raw: string | null | undefined): string | null;
export function detectInAppBrowser(ua: string): { inApp: boolean; android: boolean; mobile: boolean };
export function postLoginPath(opts: { returnTo: string | null; currentRoomId: string | null }): string;

// features/auth/client
<LoginScreen returnTo={string | null} inApp={boolean} android={boolean} mobile={boolean} currentUrl={string} />
<AuthSync />   // client, không prop
```
Route: `/login?returnTo=&reauth=1&__ua=` · `/` · `/room`.

Key i18n mới (`vi.ts`):
`login.signInWithGoogle` "Đăng nhập với Google" · `login.signingIn` "Đang đăng nhập…" · `login.error` "Đăng nhập không thành công, thử lại." · `login.inviteBanner` "Bạn được mời vào một phòng lô tô. Đăng nhập để vào phòng." · `login.dataNote` "Chúng tôi chỉ dùng tên, ảnh đại diện và email Google của bạn." · `login.inApp.title` "Ứng dụng này không cho đăng nhập Google" · `login.inApp.step1` "Bấm nút ⋯ ở góc màn hình" · `login.inApp.step2` "Chọn \"Mở bằng trình duyệt\"" · `login.inApp.openChrome` "Mở bằng Chrome" · `login.inApp.copyLink` "Copy link" · `login.inApp.copied` "Đã copy link" · `login.inApp.copyManual` "Chọn và copy link bên dưới" · `home.greeting` "Xin chào, {name}" · `room.title` "Phòng" · `room.currentRoom` "Mã phòng: {id}" · `common.loading` "Đang tải…".

`data-testid`: `login-google-button`, `login-error`, `login-invite-banner`, `login-data-note`, `inapp-panel`, `inapp-open-chrome`, `inapp-copy-link`, `inapp-link-input`, `home-greeting`, `room-current-id`.

### 3.3 Luồng chính
- **Đăng nhập (máy tính):** `LoginScreen` → `signInWithPopup(GoogleAuthProvider)` → `user.getIdToken()` → `createSessionAction({ idToken })` → `session.service.createSession`: `verifyIdToken(token, true)` → `firebase.sign_in_provider === 'google.com'` → `now() - auth_time ≤ 5 phút` → `user.repository.upsertUserFromGoogle` (transaction: tạo đủ field / cập nhật `google_*`, `last_active_at`, `updated_at`, đồng bộ `display_name`/`photo_url` khi `profile_customized = false`) → `createSessionCookie(token, 14 ngày)` → `setSessionCookie` → `{ me, isNewUser }` → client `router.replace(postLoginPath(...))`.
- **Điện thoại:** `signInWithRedirect`; khi quay lại, hook gọi `getRedirectResult` (nút ở trạng thái loading) rồi tiếp như trên.
- **Lỗi** (popup đóng, hủy, Google lỗi, action `ok:false`) → `login.error`, nút bấm lại được, `returnTo` giữ trong URL.
- **A1:** `LoginGate` có phiên + doc user và không `reauth=1` → `redirect(postLoginPath)`.
- **Trang cần phiên:** `requireUser()` (query) → không phiên → `redirect('/login')`. `AuthSync` (client) chờ `onAuthStateChanged` lần đầu; `null` → `router.replace('/login?reauth=1')`.
- **`defineAction` auth required:** `getSessionUid()` đọc cookie `__session` → `verifySessionCookie(cookie, true)`; lỗi/thiếu → `UNAUTHENTICATED`.

## 4. Các bước thực hiện
| Step | Worker | Lane | Phụ thuộc | Phạm vi file | Commit dự kiến |
|---|---|---|---|---|---|
| S1 | server-worker (contract) | main | — | `features/auth/shared/{schemas,types.ts}`, stub `create-session.action.ts`, key `vi.ts` | `feat(auth): add session schemas, types and action contract` |
| S2 | db-worker | backend | S1 | `features/auth/db/**`, `firestore.rules`, `tests/emulator/auth/users-rules.test.ts`, `scripts/seed/**` | `feat(auth): add users repository, rules and t002 seed` |
| S3 | server-worker | backend | S2 | `core/server/session.ts`, `features/auth/server/**`, `tests/emulator/auth/{create-session,session,google-token}.ts` | `feat(auth): implement createSession and session cookie checks` |
| S4 | ui-worker | client | S1 | `features/auth/shared/domain/**`, `features/auth/client/**` | `feat(auth): add login screen, in-app browser panel and auth sync` (có thể tách domain thành commit riêng) |
| S5 | ui-worker | main | S3, S4 | `src/app/login/page.tsx`, `src/app/page.tsx` (+test), `src/app/room/page.tsx` | `feat(auth): add login, home and room routes with session guard` |

Đợt: **1** = S1 (inline) · **2** = lane backend (S2→S3) ∥ lane client (S4) — 2 subagent song song, tập file không giao nhau · **3** = S5 (inline).
Gate sau mỗi đợt: `npm run typecheck && npm run lint && npm run test:unit`; đợt 2 thêm `npm test`.

## 5. Ánh xạ AC → kiểm chứng
| AC | Cách kiểm | File test / TC |
|---|---|---|
| AC-1 | chrome | TC |
| AC-2 | emulator + chrome | `tests/emulator/auth/create-session.test.ts`; TC (UI, Emulator UI, cookie) |
| AC-3 | unit + chrome | `login-screen.test.tsx`; TC |
| AC-4 | emulator | `create-session.test.ts` |
| AC-5 | emulator + chrome | `create-session.test.ts`; TC seed `binh` |
| AC-6 | chrome | TC |
| AC-7 | unit + chrome | `post-login-path.test.ts`; TC seed `cuc` |
| AC-8 | unit + chrome | `parse-return-to.test.ts`; TC |
| AC-9 | unit + chrome | `parse-return-to.test.ts`; TC |
| AC-10 | unit + chrome | `login-screen.test.tsx`; TC đóng popup |
| AC-11 | emulator + unit | `create-session.test.ts`; `login-screen.test.tsx` (lỗi action → dòng 4) |
| AC-12 | emulator | `create-session.test.ts` |
| AC-13 | emulator | `create-session.test.ts` |
| AC-14 | unit + chrome | `detect-in-app-browser.test.ts`, `in-app-browser-panel.test.tsx`; TC `__ua` |
| AC-15 | unit + chrome | `in-app-browser-panel.test.tsx`; TC |
| AC-16 | unit | `in-app-browser-panel.test.tsx` |
| AC-17 | unit | `detect-in-app-browser.test.ts` |
| AC-18 | emulator | `tests/emulator/auth/users-rules.test.ts` |
| AC-19 | emulator | `tests/emulator/auth/session.test.ts` |
| AC-20 | chrome | TC xóa IndexedDB |

## 6. Giả định & câu hỏi mở
- `[ASSUMED]` (task) `?__ua=` ghi đè UA khi nhận diện, chỉ khi `NODE_ENV !== 'production'`.
- `[ASSUMED]` (task) Cookie `secure` chỉ bật ở production.
- `[ASSUMED]` (task) Từ chối ID token có `auth_time` cũ hơn 5 phút → `GOOGLE_TOKEN_INVALID`.
- `[ASSUMED]` (task) Server có phiên, client mất Firebase Auth → `/login?reauth=1`; `reauth=1` bỏ qua A1.
- `[ASSUMED]` (task) `/` tối thiểu và `/room` giữ chỗ; T-003 thay.
- `[ASSUMED]` Feature `auth` sở hữu repository `users` ở task này; T-011 (profile) gọi lại repository này thay vì tạo trùng.
- `[ASSUMED]` `requireUser()` nằm ở `features/auth/server/queries/` (không phải `core/server/session.ts` như task ghi) vì cần đọc doc `users` qua repository — core không được import feature. `core/server/session.ts` chỉ giữ `getSessionUid`/`setSessionCookie`.
- `[ASSUMED]` Có phiên hợp lệ nhưng chưa có doc `users` (bị xóa) → coi như chưa đăng nhập (`requireUser` redirect `/login`).
- `[ASSUMED]` Vì `cacheComponents: true`, mọi phần đọc phiên/`searchParams`/UA nằm trong `<Suspense>`; fallback là `common.loading`. Không dùng `use cache: private` ở task này (đơn giản, luôn đọc mới).
- `[ASSUMED]` `mobile` (chọn redirect thay vì popup) nhận theo UA có `Android|iPhone|iPad|Mobile`. Kịch bản Chrome chạy UA máy tính ⇒ popup.
- `[ASSUMED]` Test action trên emulator mock `next/headers` (`cookies()` không có ngoài request Next); cookie thật kiểm trên Chrome.
- `[ASSUMED]` `idToken` giới hạn `.max(4096)` (api-contract chưa có `maxLength`; ID token Firebase ~1–1.5 KB) theo quy ước `.max()` cho input client.
- `[ASSUMED]` ID token test lấy từ REST Auth emulator (`accounts:signInWithIdp` với id_token JSON không ký, `providerId=google.com`) — emulator chấp nhận, không cần Google thật.
- Không có ❓.

## 7. Rủi ro
- `cacheComponents` + `redirect()` trong Suspense: redirect stream về client (meta/RSC) — kiểm `next build` và trên Chrome.
- Popup Auth emulator trên Chrome tự động: bước "đóng popup" có thể khó thao tác bằng extension → nếu không được, AC-10 dựa vào unit test, TC ghi rõ.
- Thu hồi phiên (`revokeRefreshTokens`) so giây: test có thể cần chờ ~1 giây giữa tạo cookie và thu hồi.
- Subagent song song (đợt 2) sửa `vi.ts`? Không — mọi key nằm ở S1. Lane client không sửa `features/auth/shared/{schemas,types.ts}`.

## 8. Kết quả (orchestrator điền khi xong)
- Commits: …
- Lint/typecheck/test: …
- QC: `backlog/testcases/T-002-*.md` — P0 x/y, P1 x/y
- Còn lại cho dev review: …
