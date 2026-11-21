---
name: db-worker
description: Worker lớp database cho webapp Lô Tô Online — viết repository/mapper/kiểu doc Firestore & RTDB bằng firebase-admin, Security Rules (Firestore, RTDB, Storage) kèm test allow/deny, index, TTL expireAt, seed scenario emulator. Dùng khi orchestrator implement-task giao step db, hoặc dev gọi /db-worker T-XXX [Sx].
argument-hint: T-XXX [Sx]
---

# db-worker

Đầu vào: `T-XXX` và step (VD `S2`) trong `backlog/plan/T-XXX-*.md` (đã `approved`). Không có plan → làm theo mục "Data" của file task và báo rằng chưa có plan.

Đọc trước: `architecture.md`, `conventions.md` trong `.claude/skills/implement-task/references/`; `specs/database.md` mục TBL-xx của step; `specs/tech-stack.md` ADR-03/04/06/10/12.

## Phạm vi được sửa
`src/features/*/db/**`, `src/core/db/**`, `firestore.rules`, `database.rules.json`, `storage.rules`, `firestore.indexes.json`, `scripts/seed/**`, `tests/emulator/**` (phần rules/repository). Ngoài phạm vi → không sửa, ghi vào báo cáo.

## Cách làm
1. **Kiểu doc** `<entity>.doc.ts`: đúng tên field `snake_case`, kiểu, nullable như TBL-xx. Timestamp dùng `Timestamp` của admin SDK.
2. **Mapper** `<entity>.mapper.ts`: `fromDoc(doc) → Model` (camelCase), `toDoc(model) → Doc`; hàm projection theo schema api-contract (VD `toMe`) — chỉ lộ field schema cho phép.
3. **Repository** `<entity>.repository.ts`:
   - Đầu file `import 'server-only'`.
   - Đường dẫn qua `core/db/paths.ts` (thêm path mới ở đây), không viết chuỗi path rải rác.
   - Hàm nhận `tx?: Transaction` để service gọi trong transaction: `getX(id, tx?)`, `createX(data, tx)`, `updateX(id, patch, tx)`.
   - Không chứa nghiệp vụ (không kiểm BR) — chỉ đọc/ghi/truy vấn.
   - Doc thuộc phòng: gán `expireAt` bằng `core/db/ttl.ts` (ADR-10).
4. **Security Rules**:
   - Mặc định cấm; chỉ mở đúng điều TBL-xx ghi. Firestore: client chỉ đọc, `allow write: if false` (ADR-03).
   - RTDB: chỉ `presence/{roomId}/{uid}` của chính mình khi có `presence_access` (ADR-06).
   - Storage: `avatars/{uid}/**` chủ sở hữu, `image/*`, ≤ 5 MB (ADR-12).
   - **Mỗi quyền mở ra phải có test allow + deny** trong `tests/emulator/<feature>/rules-<entity>.test.ts` (`@firebase/rules-unit-testing`): chính chủ / thành viên / người khác / chưa auth / ghi.
5. **Index** cần cho truy vấn của service → `firestore.indexes.json`.
6. **Seed** `scripts/seed/scenarios/tXXX.ts`: đúng dữ liệu "Dữ liệu seed" của task (uid, email, tên). User qua `seedUser` (provider `google.com`). Đăng ký scenario trong `scripts/seed/index.ts`. Seed phải idempotent sau `reset`.
7. **Test repository** (emulator) khi có truy vấn không tầm thường (filter, order, transaction).

## Gate trước khi xong
```
cd implement/webapp && npm run typecheck && npm run lint
npm test -- tests/emulator/<feature>    # cần emulator (firebase emulators:exec do script lo)
```
Không có Java/firebase-tools → báo rõ, không giả là đã pass.

## Báo cáo
File tạo/sửa · quyền rules mới (bảng allow/deny) · kết quả gate · lệch so với `database.md` (nếu có, kèm lý do) · vấn đề mở. Không commit (orchestrator lo).
