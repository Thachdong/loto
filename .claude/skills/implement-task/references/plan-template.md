---
task: T-XXX
title: <tiêu đề task>
status: draft            # draft | approved | in-progress | done
approved_at: null        # YYYY-MM-DD khi dev duyệt
branch: <tên branch>
plan_commit: null        # hash commit plan
---

# Plan T-XXX · <tiêu đề>

## 1. Tóm tắt
<2–4 câu: demo được gì sau task, phạm vi chính>

## 2. Nguồn đã đọc
- Task: `backlog/tasks/T-XXX-*.md`
- Specs: <liệt kê đúng mục: api-contract › op, database › TBL-xx, ui-ux/scr-xx §, FLOW-xx, BR-xx, ADR-xx>
- Next.js docs: <file trong node_modules/next/dist/docs đã đọc>

## 3. Thiết kế
### 3.1 Feature & file theo lớp
| Lớp | File | Tạo/Sửa | Nội dung |
|---|---|---|---|
| shared | `src/features/<f>/shared/schemas/<x>.ts` | Tạo | Zod `XxxInput` (.strict) |
| db | `src/features/<f>/db/<e>.repository.ts` | Tạo | `getX`, `upsertX` |
| db | `firestore.rules` | Sửa | mở đọc `<path>` cho … |
| server | `src/features/<f>/server/services/<x>.service.ts` | Tạo | … |
| server | `src/features/<f>/server/actions/<op>.action.ts` | Tạo | `<op>Action`, auth: … |
| client | `src/features/<f>/client/components/<x>.tsx` | Tạo | … |
| app | `src/app/<route>/page.tsx` | Tạo | RSC, `requireUser()` … |
| seed | `scripts/seed/scenarios/tXXX.ts` | Tạo | … |

### 3.2 Contract (để các lane chạy song song)
<Chữ ký action (input/output type), tên field model, route, key i18n mới. Lane client chỉ dựa vào mục này.>

### 3.3 Luồng chính
<sequence ngắn hoặc bullet: UI → action → service → repo → DB; listener nào đọc gì>

## 4. Các bước thực hiện
| Step | Worker | Lane | Phụ thuộc | Phạm vi file | Commit dự kiến |
|---|---|---|---|---|---|
| S1 | server-worker (contract) | main | — | `shared/**`, stub action, `vi.ts` keys | `feat(<f>): add <x> schemas and action contract` |
| S2 | db-worker | backend | S1 | `db/**`, rules, seed | `feat(<f>): add <entity> repository and rules` |
| S3 | server-worker | backend | S2 | `server/**` | `feat(<f>): implement <op> service and action` |
| S4 | ui-worker | client | S1 | `client/**`, `app/**` | `feat(<f>): add <screen> UI` |

Quy tắc lane: các lane khác nhau **không được sửa chung file**. Lane `main` chạy trước, inline.

## 5. Ánh xạ AC → kiểm chứng
| AC | Cách kiểm | File test / TC |
|---|---|---|
| AC-1 | chrome | (qc-testcase-writer điền TC) |
| AC-2 | emulator | `tests/emulator/<f>/<x>.test.ts` |
| AC-3 | unit | `src/features/<f>/shared/domain/<x>.test.ts` |

## 6. Giả định & câu hỏi mở
- `[ASSUMED]` …
- ❓ … (phải được dev trả lời trước khi duyệt)

## 7. Rủi ro
- …

## 8. Kết quả (orchestrator điền khi xong)
- Commits: …
- Lint/typecheck/test: …
- QC: `backlog/testcases/T-XXX-*.md` — P0 x/y, P1 x/y
- Còn lại cho dev review: …
