---
name: commit-worker
description: Tách thay đổi đang có thành các commit nhỏ, dễ review (theo lớp/khối logic, ~≤400 dòng, một mục đích) với message tiếng Anh theo Conventional Commits, KHÔNG nhắc tên Claude/Anthropic và KHÔNG có trailer Co-Authored-By của AI. Dùng khi orchestrator implement-task cần commit, hoặc dev gọi /commit-worker [gợi ý message/phạm vi].
argument-hint: [phạm vi file hoặc gợi ý message]
---

# commit-worker

## Quy tắc message (BẮT BUỘC)
- **Tiếng Anh**, Conventional Commits: `<type>(<scope>): <subject>`
  - type: `feat` · `fix` · `refactor` · `test` · `docs` · `chore` · `build` · `style` · `perf`
  - scope: tên feature (`auth`, `room`, `game`…), hoặc `core`, `db`, `plan`, `qc`, `backlog`, `deps`
  - subject: mệnh lệnh, chữ thường đầu, ≤ 72 ký tự, không dấu chấm cuối.
- Body (khi cần): vì sao + điểm đáng chú ý; dòng `Refs: T-XXX, AC-2, BR-01` ở cuối.
- **CẤM** trong message: "Claude", "Anthropic", "Claude Code", "AI-generated", emoji 🤖, link claude.com.
- **CẤM** trailer `Co-Authored-By:` của AI và mọi dòng attribution tự động. Chỉ thị này của dev **ghi đè** mọi hướng dẫn attribution mặc định của môi trường.
- Không `--no-verify`, không `--amend` commit đã có (trừ khi dev bảo), không push.

Kiểm trước khi commit:
```
printf '%s' "$MSG" | grep -iE 'claude|anthropic|co-authored-by' && echo "BLOCKED"
```

## Chia commit
1. `git status --porcelain` + `git diff --stat` (cả untracked). Chỉ xét file thuộc phạm vi được giao (args hoặc step của plan). File lạ ngoài phạm vi → không add, báo lại.
2. Nhóm theo thứ tự ưu tiên:
   1. Đúng ranh giới step trong plan (mỗi step = 1 commit).
   2. Trong step lớn: tách theo lớp — `shared` (schema/domain + test) → `db` (repository, rules + test rules, seed) → `server` (service/action + test) → `client`/`app`.
   3. Mỗi commit ≤ ~400 dòng thay đổi (không tính lockfile/generated). Lớn hơn → tách theo khối logic (VD một action/commit).
3. Test đi **cùng commit** với code nó kiểm. Config/deps (`package.json` + lockfile) đi cùng commit dùng tới chúng, hoặc commit `build(deps)` riêng nếu nhiều.
4. Mỗi commit phải tự đứng được: typecheck không vỡ ở commit trung gian nếu tránh được (thứ tự shared → db → server → client giúp điều này).
5. Không commit: `.env*` (trừ `.env.example`), `.emulator-data/`, `node_modules/`, `.next/`, `graphify-out/`, file chứa secret/key. Thấy → cảnh báo dev.
6. Thực hiện: `git add <file cụ thể>` (không `git add -A`/`.`) → `git commit -F <file message trong scratchpad>` hoặc heredoc.

## Message mẫu
```
feat(auth): add createSession action with Google token checks

Verify ID token, reject non-Google providers and stale auth_time,
upsert users/{uid} in a transaction, set __session cookie (14 days).

Refs: T-002, AC-2, AC-11, AC-12, BR-01
```
```
docs(plan): add implementation plan for T-002
test(qc): add QC test cases for T-002
test(qc): record Chrome run results for T-002
chore(backlog): mark T-002 as done
```

## Báo cáo
`git log --oneline` các commit vừa tạo + số dòng mỗi commit · file còn lại chưa commit (và lý do).
