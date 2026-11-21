# Quy ước code — Lô Tô Online webapp

Nguồn sự thật: `specs/tech-stack.md` (ADR-01..14), `specs/api-contract.yml`, `specs/database.md`, `specs/actions.md`, `specs/ui-ux/*`, `idea/business*.md`. Mâu thuẫn giữa specs và backlog → specs thắng, ghi lại trong plan mục "Giả định".

## 1. Next.js 16 — đọc docs trước khi code
`implement/webapp/AGENTS.md`: bản Next.js này có breaking change so với kiến thức cũ. **Trước khi dùng API Next.js nào** (Server Actions, `cookies()`, `redirect`, `generateMetadata`, middleware/proxy, caching, route handler…) đọc guide tương ứng trong `implement/webapp/node_modules/next/dist/docs/` (`01-app/…`). Grep tên API trong docs nếu chưa rõ. Tôn trọng deprecation notice.

## 2. Server Actions (ADR-03)
- Ưu tiên Server Action cho **mọi thao tác ghi**. Route Handler chỉ dùng khi specs yêu cầu (`/join/[code]` SSR/OG, webhook nội bộ).
- Mỗi `operationId` trong `api-contract.yml` ↔ một action `<operationId>Action`.
- Khung:
  ```ts
  'use server';
  import { defineAction } from '@/core/server/action';
  import { CreateRoomInput } from '@/features/room/shared/schemas/create-room';
  import { createRoom } from '@/features/room/server/services/room.service';

  export const createRoomAction = defineAction({
    input: CreateRoomInput,
    auth: 'required',
    handler: ({ input, uid }) => createRoom(uid, input),
  });
  ```
- Trả `ActionResult<T>` = `{ ok: true, data }` | `{ ok: false, error: { code, message, details? } }`. Không throw ra client.
- Lỗi nghiệp vụ: `throw new AppError('<CODE>')` với CODE có trong bảng mã lỗi api-contract. Không tự chế mã mới; thiếu → ghi vào "Giả định" và hỏi.
- Zod 4: object dùng `z.strictObject({...})` (khớp `additionalProperties: false`; không dùng `.strict()` đã deprecated). Schema dùng chung client (form validate) và server.
- Mọi `z.array()` / `z.string()` nhận input từ client phải có `.max()` (khớp `maxItems`/`maxLength` trong api-contract; chưa có thì đặt giới hạn hợp lý). Không tăng `serverActions.bodySizeLimit` (mặc định 1 MB). Lý do: GHSA-mrhx-c7xc-m3w5 — validate collection quá lớn có thể cạn bộ nhớ.
- Mọi ghi nhiều doc / kiểm quy tắc chéo → `firestore().runTransaction`. Lazy expiry (BR-04) áp dụng trước mọi thao tác trên phòng.
- Giờ: luôn `now()` từ `core/server/clock.ts`, không `Date.now()` trong service.
- Sau mutation cần cập nhật RSC: `revalidatePath`/`refresh` theo docs Next 16.

## 3. Đọc dữ liệu
- Màn đầu (RSC): `server/queries/*` qua repository, kiểm phiên bằng `requireUser()`.
- Realtime: client listener `onSnapshot` (Firebase JS SDK) trong `client/hooks/`. Client **không bao giờ ghi** Firestore (trừ RTDB presence của chính mình — ADR-06; Storage `avatars/{uid}` — ADR-12).

## 4. Database (specs/database.md)
- Tên field trong DB: `snake_case` đúng như TBL-xx. Model trong code: `camelCase`. Chuyển qua mapper.
- Mọi doc thuộc phòng có `expireAt` (ADR-10) — dùng helper `core/db/ttl.ts`.
- Mỗi lần mở quyền đọc trong rules → test **allow và deny** trong `tests/emulator/`.
- Index mới → `firestore.indexes.json`.

## 5. UI
- Mobile-first: thiết kế ở 375×812, không tràn ngang ở 360px; khung `max-w-[480px] mx-auto px-4` (NFR-12).
- Tailwind 4 + shadcn/ui từ `@/core/client/ui`. Chạm tối thiểu 44px.
- **Mọi chữ hiển thị** lấy từ `core/shared/i18n/vi.ts` qua `t(key, params)`. Không hard-code chuỗi tiếng Việt trong component.
- Mỗi màn có đủ trạng thái theo `specs/ui-ux/scr-*.md`: loading, empty, error, disabled.
- Hiển thị lỗi action: map `error.code` → message (đã tiếng Việt từ server) → toast hoặc dòng lỗi theo spec màn.
- Ưu tiên Server Component; chỉ `'use client'` ở lá cần state/event/listener.
- Thêm `data-testid` cho phần tử chrome-tester cần kiểm mà không có chữ ổn định (số, lưới vé…).

## 6. Test
- Domain thuần: Vitest unit, cạnh file.
- Action/service: Vitest project `emulator`, gọi action thật trên emulator (cookie giả bằng helper).
- Rules: `@firebase/rules-unit-testing`.
- Component: Testing Library + jsdom cho trạng thái loading/error.
- Lệnh: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm test` (cần Java + firebase-tools).

## 7. Bảo mật
- Không log `idToken`, session cookie, email người khác.
- Chỉ trả field đúng schema api-contract (VD `Me` mới có `email`).
- Validate `returnTo` và mọi input URL chống open redirect.
- Chế độ test-only (VD `?__ua=`) phải tắt ở production.
