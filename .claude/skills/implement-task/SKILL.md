---
name: implement-task
description: Orchestrator implement một task backlog Lô Tô Online (T-001..T-013) end-to-end trên Next.js webapp — lên plan, chờ dev duyệt, lưu plan vào backlog/plan, điều phối các worker (db/server/ui), commit từng khối nhỏ, viết test case QC, mở Chrome chạy test, đóng task. Dùng khi dev gọi /implement-task T-XXX hoặc nói "implement/làm task T-XXX".
argument-hint: T-XXX [--from-step Sx] [--skip-chrome]
---

# implement-task (orchestrator)

Đầu vào: `$ARGUMENTS` — mã task (VD `T-002`), tùy chọn `--from-step Sx` (làm tiếp plan đã duyệt), `--skip-chrome`.

Gốc repo: thư mục chứa `backlog/`, `specs/`, `implement/webapp/`. Mọi lệnh npm chạy trong `implement/webapp/`.

**Đọc trước (bắt buộc, một lần):**
- `.claude/skills/implement-task/references/architecture.md`
- `.claude/skills/implement-task/references/conventions.md`

## Worker
| Worker | Skill file | Việc |
|---|---|---|
| task-planner | `.claude/skills/task-planner/SKILL.md` | lập plan |
| db-worker | `.claude/skills/db-worker/SKILL.md` | lớp database: repository, mapper, rules, index, seed |
| server-worker | `.claude/skills/server-worker/SKILL.md` | schema, domain, service, action (+ bước contract) |
| ui-worker | `.claude/skills/ui-worker/SKILL.md` | route, component, hook, i18n |
| qc-testcase-writer | `.claude/skills/qc-testcase-writer/SKILL.md` | test case QC cho chrome-tester |
| commit-worker | `.claude/skills/commit-worker/SKILL.md` | tách & tạo commit |
| chrome-tester | `.claude/skills/chrome-tester/SKILL.md` | chạy test case trên Chrome |

### Quy tắc chạy worker: song song → subagent, tuần tự → inline
- **Tuần tự** (bước phụ thuộc bước trước, hoặc chỉ có 1 việc): chạy **inline** — gọi Skill tool tên worker (VD `db-worker`) với args `T-XXX S2`, hoặc đọc SKILL.md của worker và làm theo trong chính phiên này.
- **Song song** (≥ 2 lane độc lập trong cùng một đợt): gọi **Agent tool nhiều lần trong CÙNG một message**, `subagent_type: "general-purpose"`, mỗi lane một agent. Prompt mẫu:
  ```
  Bạn là <worker> cho task T-XXX, lane <lane>. Đọc và làm theo .claude/skills/<worker>/SKILL.md
  (và các reference nó nhắc). Plan đã duyệt: backlog/plan/<file>.md. Làm các step: <S2, S3> theo thứ tự.
  CHỈ sửa file trong phạm vi: <glob từ plan>. KHÔNG git commit, KHÔNG git add.
  Không hỏi người dùng; gặp chỗ mơ hồ/mâu thuẫn specs → dừng step đó và báo lại.
  Kết thúc: liệt kê file đã tạo/sửa, kết quả typecheck/lint/test liên quan, vấn đề còn mở.
  ```
- Subagent **không commit** (tránh tranh git index). Orchestrator gọi commit-worker sau khi cả đợt xong.
- Hai lane song song không bao giờ sửa chung file. Nếu plan có chồng lấn → chạy tuần tự.

## Quy trình

### Bước 0 — Kiểm tra đầu vào
1. Tìm `backlog/tasks/$TASK-*.md`. Không có → dừng, báo.
2. Đọc `backlog/backlog.md`: các task phụ thuộc phải `DONE`. Chưa → báo và hỏi dev có làm tiếp không.
3. Task có ghi chú "⚠ specs đổi" / "cần chạy lại backlog-task-detail" → dừng, báo dev (task có thể lỗi thời).
4. `git status`: có thay đổi chưa commit không thuộc task → hỏi dev (stash / commit / bỏ qua).
5. **Branch — theo yêu cầu dev.** Hỏi bằng AskUserQuestion (một câu):
   - Giữ branch hiện tại `<tên>`
   - Tạo branch mới `feature/<git user>/<T-xxx>-<slug>` từ branch hiện tại (Recommended)
   - Tên khác (Other)
   Dev đã nói trước trong prompt → dùng luôn, không hỏi.
6. Có plan `backlog/plan/$TASK-*.md` với `status: approved` → hỏi: dùng lại plan / lập lại. `--from-step` → nhảy tới Bước 4 từ step đó.

### Bước 1 — Lập plan (inline)
Chạy task-planner inline (`task-planner $TASK`). Kết quả: file nháp `backlog/plan/$TASK-<slug>.md`, `status: draft`.

### Bước 2 — Duyệt plan
In cho dev bản tóm tắt ngắn (không dán cả file):
- Mục tiêu demo
- Danh sách file theo lớp (đếm + vài file chính)
- Bảng step / lane / commit dự kiến
- AC → cách kiểm
- **Giả định và câu hỏi mở** (nguyên văn)
- Đường dẫn file plan để dev mở xem đầy đủ

Rồi AskUserQuestion: **Duyệt** · **Sửa** (dev ghi chú ở Other/notes) · **Hủy**.
- Sửa → cập nhật plan theo ghi chú, tóm tắt lại phần đổi, hỏi lại. Lặp tới khi Duyệt.
- Câu hỏi mở (❓) phải có câu trả lời trước khi Duyệt; ghi câu trả lời vào plan.
- Hủy → dừng, giữ file draft.

### Bước 3 — Lưu plan & commit riêng
1. Cập nhật frontmatter: `status: approved`, `approved_at`, `branch`.
2. Gọi commit-worker với chỉ file plan → commit riêng `docs(plan): add implementation plan for T-XXX`.
3. Ghi hash vào `plan_commit` (sửa frontmatter, file này sẽ đi cùng commit kết thúc task).

### Bước 4 — Implement theo đợt
Từ bảng step của plan, tính các đợt (wave): đợt k = các step có phụ thuộc đã xong. Gom step theo lane.
- Đợt chỉ có 1 lane → inline, từng step tuần tự. **Sau mỗi step**: chạy gate (dưới) → commit-worker (commit khối của step đó).
- Đợt có ≥ 2 lane → subagent song song (một agent/lane). Xong cả đợt: đọc báo cáo từng agent, chạy gate, rồi commit-worker (tách commit theo lane/lớp).
- Cập nhật frontmatter plan `status: in-progress`.

**Gate sau mỗi step/đợt** (trong `implement/webapp/`):
```
npm run typecheck && npm run lint && npm run test:unit
```
Step có test emulator → thêm `npm test` (hoặc chỉ file liên quan). Fail → sửa (inline) tối đa 3 vòng. Vẫn fail → dừng, báo dev lỗi ngắn gọn (dòng quyết định), hỏi hướng xử lý.

Ranh giới lớp: sau mỗi đợt grep nhanh vi phạm (`firebase-admin`/`/db/`/`/services/` bị import từ `client/`; thiếu `server-only`). Có → sửa trước khi commit.

### Bước 5 — Kiểm tra toàn bộ
```
npm run typecheck && npm run lint && npm test && npm run build
```
Fail → sửa, commit `fix(<scope>): …`. Không bỏ qua test, không `--no-verify`, không xóa test để qua.

### Bước 6 — Test case QC (inline)
Chạy qc-testcase-writer `$TASK`. In tóm tắt: số TC theo ưu tiên/loại, AC chưa phủ (phải = 0 hoặc có lý do). Commit-worker → `test(qc): add QC test cases for T-XXX`.

### Bước 7 — Test trên Chrome (inline, trừ `--skip-chrome`)
Chạy chrome-tester `$TASK` — tự khởi động emulator + dev + seed, mở Chrome, chạy smoke các task trước + P0 + P1 của task này, điền kết quả vào file test case.
- Có FAIL do code: sửa (inline, đúng lớp, theo architecture) → gate → commit `fix(<scope>): …` → chạy lại đúng TC fail. Tối đa 2 vòng/TC.
- FAIL do test case sai (mong đợi lệch specs) → sửa test case, ghi chú lý do, chạy lại.
- FAIL do môi trường (Chrome không kết nối, thiếu Java…) → dừng, báo dev cách khắc phục.
- Commit kết quả: `test(qc): record Chrome run results for T-XXX`.

### Bước 8 — Đóng task
1. File task: tick DoD đã đạt; thêm/điền mục "Kết quả chạy" trỏ tới file test case.
2. `backlog/backlog.md`: cột Trạng thái của task → `DONE` (hoặc `REVIEW` nếu còn P0 fail / việc mở).
3. Plan: `status: done`, điền mục 8 Kết quả.
4. Commit-worker → `chore(backlog): mark T-XXX as done`.
5. Không push, không mở PR trừ khi dev yêu cầu.
6. Báo cáo cuối cho dev:
   - Danh sách commit (`git log --oneline <plan_commit>^..HEAD`)
   - Lint/typecheck/test/build
   - QC: P0 x/y, P1 x/y, đường dẫn file test case, TC fail còn lại
   - Giả định đã áp dụng, việc cần dev review (bảo mật, rules, chỗ lệch specs)

## Khi nào dừng hỏi dev
- Bước 0.5 (branch), Bước 2 (duyệt plan).
- Specs mâu thuẫn / thiếu, mã lỗi không có trong api-contract.
- Gate fail sau 3 vòng; TC fail sau 2 vòng.
- Cần cài package ngoài stack trong `specs/tech-stack.md`.
- Mọi thao tác khó hoàn tác: xóa file ngoài phạm vi plan, `git reset --hard`, force push, sửa specs.

## Không được
- Code trước khi plan được duyệt.
- Sửa `specs/` hay `idea/` (chỉ đề xuất).
- Commit message có tên Claude/Anthropic/"Claude Code", hoặc trailer `Co-Authored-By` của AI (xem commit-worker).
- Gom cả task vào một commit.
